# legal_services/mca/actions.py
"""
MCA business logic — one function per user action.
Views call these; DB writes + audit logs happen here.
"""

from django.utils import timezone
from django.contrib.auth import get_user_model

from ..models import MCAFiling, MCAFilingDocument
from ..utils import log_event
from .helpers import (
    update_filing_status_from_workflow,
    recompute_mca_case_status,
    calculate_filing_due_date,
)

User = get_user_model()


# ═══════════════════════════════════════════════════════════════════
# MCA CASE
# ═══════════════════════════════════════════════════════════════════
def log_mca_case_created(instance, user):
    log_event(
        client_id=instance.client_id,
        litigation_type='mca',
        job_id=instance.id,
        event_type='case_created',
        title=f'MCA case created ({instance.reference_no})',
        user=user,
    )


def assign_mca_makers_checkers(mca_case, maker_ids, checker_ids, user):
    def names_for(ids):
        return [u.get_full_name() or u.email for u in User.objects.filter(id__in=ids)]

    old_maker_names = names_for(mca_case.makers.values_list('id', flat=True))
    old_checker_names = names_for(mca_case.checkers.values_list('id', flat=True))

    mca_case.makers.set(User.objects.filter(id__in=maker_ids))
    mca_case.checkers.set(User.objects.filter(id__in=checker_ids))

    log_event(
        client_id=mca_case.client_id,
        litigation_type='mca',
        job_id=mca_case.id,
        event_type='assignment',
        title='MCA Makers/Checkers updated',
        user=user,
        old_values={'makers': old_maker_names, 'checkers': old_checker_names},
        new_values={'makers': names_for(maker_ids), 'checkers': names_for(checker_ids)},
    )
    return mca_case


# ═══════════════════════════════════════════════════════════════════
# MCA FILING
# ═══════════════════════════════════════════════════════════════════
def create_mca_filing(mca_case, event_date, notes, user):
    """Maker creates a new filing under a case."""
    sub_service = mca_case.sub_service
    slug = sub_service.slug if sub_service and hasattr(sub_service, 'slug') else (
        sub_service.name.lower().replace(' ', '-') if sub_service else ''
    )

    due_date = calculate_filing_due_date(event_date, slug) if event_date else None

    filing = MCAFiling.objects.create(
        mca_case=mca_case,
        event_date=event_date,
        filing_due_date=due_date,
        notes=notes or '',
        created_by=user,
        status='wip',
        stage='internal_review',
    )

    log_event(
        client_id=mca_case.client_id,
        litigation_type='mca',
        job_id=mca_case.id,
        event_type='mca_filing_created',
        title=f'MCA filing created for {slug.upper()}',
        user=user,
        new_values={
            'event_date': str(event_date) if event_date else None,
            'due_date': str(due_date) if due_date else None,
            'form_slug': slug,
        },
    )
    return filing


def update_mca_filing(filing, data, user):
    """Update editable fields on a filing (event_date, extended_due_date, notes, srn_number, challan_number)."""
    changed = {}
    for field in ['event_date', 'extended_due_date', 'notes', 'srn_number', 'challan_number']:
        if field in data:
            old_val = getattr(filing, field)
            new_val = data[field] or None
            if str(old_val) != str(new_val):
                changed[field] = {'old': str(old_val), 'new': str(new_val)}
                setattr(filing, field, new_val)

    if changed:
        filing.save()
        log_event(
            client_id=filing.mca_case.client_id,
            litigation_type='mca',
            job_id=filing.mca_case.id,
            event_type='info_update',
            title=f'MCA filing info updated',
            user=user,
            old_values={k: v['old'] for k, v in changed.items()},
            new_values={k: v['new'] for k, v in changed.items()},
        )
    return filing


# ═══════════════════════════════════════════════════════════════════
# MCA FILING DOCUMENT
# ═══════════════════════════════════════════════════════════════════
def log_mca_doc_created(instance, user):
    """Log only meaningful uploads (draft form, SRN receipt) — drafts stay silent."""
    doc_type = instance.doc_type
    filing = instance.filing

    if doc_type == 'draft_form':
        log_event(
            client_id=filing.mca_case.client_id,
            litigation_type='mca',
            job_id=filing.mca_case.id,
            event_type='mca_draft_uploaded',
            title=f'Draft form uploaded — {instance.file_name}',
            user=user,
            new_values={
                'file_name': instance.file_name,
                'doc_type': 'draft_form',
                'form_slug': (filing.mca_case.sub_service.name if filing.mca_case.sub_service else ''),
            },
        )

    elif doc_type == 'srn_receipt':
        log_event(
            client_id=filing.mca_case.client_id,
            litigation_type='mca',
            job_id=filing.mca_case.id,
            event_type='mca_srn_uploaded',
            title=f'SRN receipt uploaded — {instance.file_name}',
            user=user,
            new_values={
                'file_name': instance.file_name,
                'doc_type': 'srn_receipt',
                'srn_number': filing.srn_number,
            },
        )


def delete_mca_doc_cascade(instance, user):
    """Cascade-delete pending_support docs if the parent draft is being deleted."""
    filing = instance.filing

    if instance.doc_type == 'pending_draft':
        MCAFilingDocument.objects.filter(
            filing=filing,
            parent_draft=instance.id,
            doc_type='pending_support'
        ).delete()

    if instance.file:
        try:
            instance.file.delete(save=False)
        except Exception:
            pass
    instance.delete()


# ═══════════════════════════════════════════════════════════════════
# STAGE 1 — INTERNAL DRAFT REVIEW
# ═══════════════════════════════════════════════════════════════════
def submit_mca_drafts_for_review(filing, user):
    """Maker: move draft docs → pending and set filing.review_status."""
    drafts = filing.documents.filter(
        doc_type__in=['pending_draft', 'draft_form'],
        review_status='draft',
    )
    count = drafts.count()
    if count == 0:
        return filing, 0

    drafts.update(review_status='pending')

    filing.review_status = 'pending'
    filing.review_note = None
    filing.save(update_fields=['review_status', 'review_note', 'updated_at'])

    update_filing_status_from_workflow(filing)

    pending_names = list(
        filing.documents.filter(
            doc_type__in=['pending_draft', 'draft_form'],
            review_status='pending',
        ).values_list('file_name', flat=True)
    )

    log_event(
        client_id=filing.mca_case.client_id,
        litigation_type='mca',
        job_id=filing.mca_case.id,
        event_type='mca_docs_submitted',
        title='draft submitted for review',
        user=user,
        new_values={'draft_files': pending_names},
    )
    return filing, count


def approve_mca_draft(doc, user):
    """Checker approves a draft form (Stage 1)."""
    original_doc_type = doc.doc_type
    doc.review_status = 'approved'
    doc.reviewed_by = user
    doc.reviewed_at = timezone.now()

    if doc.doc_type == 'pending_draft':
        doc.doc_type = 'draft_form'
        MCAFilingDocument.objects.filter(
            filing=doc.filing,
            parent_draft=doc.id,
            doc_type='pending_support'
        ).update(
            doc_type='supporting_doc',
            review_status='approved',
            reviewed_by=user,
            reviewed_at=doc.reviewed_at,
        )
    doc.save()

    filing = doc.filing
    update_filing_status_from_workflow(filing)
    filing.review_status = 'accepted'
    filing.reviewed_by = user
    filing.reviewed_at = timezone.now()
    filing.review_note = None
    filing.save(update_fields=[
        'review_status', 'reviewed_by', 'reviewed_at', 'review_note', 'updated_at'
    ])

    recompute_mca_case_status(filing.mca_case)

    sup_names = list(MCAFilingDocument.objects.filter(
        filing=filing, parent_draft=doc.id, doc_type='supporting_doc'
    ).values_list('file_name', flat=True))

    log_event(
        client_id=filing.mca_case.client_id,
        litigation_type='mca',
        job_id=filing.mca_case.id,
        event_type='mca_docs_approved',
        title=f'draft approved — {doc.file_name}',
        user=user,
        new_values={
            'file_name': doc.file_name,
            'draft_files': [doc.file_name],
            'supporting_docs': sup_names,
        },
    )
    return doc


def reject_mca_draft(doc, reason, user):
    """Checker rejects a draft form (Stage 1)."""
    original_doc_type = doc.doc_type
    doc.review_status = 'rejected'
    doc.reviewed_by = user
    doc.reviewed_at = timezone.now()
    doc.review_note = reason
    doc.save()

    if original_doc_type == 'pending_draft':
        MCAFilingDocument.objects.filter(
            filing=doc.filing,
            parent_draft=doc.id,
            doc_type='pending_support'
        ).update(
            review_status='rejected',
            review_note=reason,
            reviewed_by=user,
            reviewed_at=doc.reviewed_at,
        )

    filing = doc.filing
    update_filing_status_from_workflow(filing)

    filing.review_status = 'rejected'
    filing.review_note = reason
    filing.reviewed_by = user
    filing.reviewed_at = timezone.now()
    filing.save(update_fields=[
        'review_status', 'review_note', 'reviewed_by', 'reviewed_at', 'updated_at'
    ])

    sup_names = list(MCAFilingDocument.objects.filter(
        filing=filing, parent_draft=doc.id, doc_type='pending_support'
    ).values_list('file_name', flat=True))

    log_event(
        client_id=filing.mca_case.client_id,
        litigation_type='mca',
        job_id=filing.mca_case.id,
        event_type='mca_docs_rejected',
        title=f'draft rejected — {doc.file_name}',
        user=user,
        new_values={
            'file_name': doc.file_name,
            'draft_files': [doc.file_name],
            'supporting_docs': sup_names,
            'rejection_reason': reason,
        },
    )
    return doc


def escalate_mca_draft(doc, user):
    """Checker escalates draft to CEO."""
    doc.review_status = 'escalated'
    doc.save(update_fields=['review_status'])

    filing = doc.filing
    update_filing_status_from_workflow(filing)

    filing.review_status = 'escalated'
    filing.save(update_fields=['review_status', 'updated_at'])

    log_event(
        client_id=filing.mca_case.client_id,
        litigation_type='mca',
        job_id=filing.mca_case.id,
        event_type='mca_docs_escalated',
        title=f'draft moved to CEO — {doc.file_name}',
        user=user,
        new_values={'file_name': doc.file_name},
    )
    return doc


# ═══════════════════════════════════════════════════════════════════
# STAGE 2 — SRN REVIEW (after filing on MCA portal)
# ═══════════════════════════════════════════════════════════════════
def submit_mca_srn_for_review(filing, user):
    """Maker: move SRN docs from draft → pending."""
    srn_docs = filing.documents.filter(
        doc_type__in=['srn_receipt', 'challan', 'acknowledgment'],
        review_status='draft',
    )
    count = srn_docs.count()
    if count == 0:
        # Also allow already-pending (if uploaded as pending earlier)
        pending_count = filing.documents.filter(
            doc_type__in=['srn_receipt', 'challan', 'acknowledgment'],
            review_status='pending',
        ).count()
        if pending_count == 0:
            return filing, 0
        update_filing_status_from_workflow(filing)
        return filing, pending_count

    srn_docs.update(review_status='pending')

    filing.srn_review_status = 'pending'
    filing.srn_review_note = None
    filing.save(update_fields=['srn_review_status', 'srn_review_note', 'updated_at'])

    update_filing_status_from_workflow(filing)

    log_event(
        client_id=filing.mca_case.client_id,
        litigation_type='mca',
        job_id=filing.mca_case.id,
        event_type='mca_srn_uploaded',
        title='SRN submitted for review',
        user=user,
    )
    return filing, count



def approve_mca_srn(doc, user):
    """Checker verifies SRN receipt."""
    doc.review_status = 'approved'
    doc.reviewed_by = user
    doc.reviewed_at = timezone.now()
    doc.save()

    filing = doc.filing
    filing.srn_review_status = 'approved'
    filing.srn_reviewed_by = user
    filing.srn_reviewed_at = timezone.now()
    filing.save(update_fields=['srn_review_status', 'srn_reviewed_by', 'srn_reviewed_at', 'updated_at'])

    update_filing_status_from_workflow(filing)
    recompute_mca_case_status(filing.mca_case)

    log_event(
        client_id=filing.mca_case.client_id,
        litigation_type='mca',
        job_id=filing.mca_case.id,
        event_type='mca_srn_approved',
        title=f' SRN verified — {doc.file_name}',
        user=user,
        new_values={
            'file_name': doc.file_name,
            'srn_number': filing.srn_number,
        },
    )
    return doc


def reject_mca_srn(doc, reason, user):
    """Checker rejects SRN receipt."""
    doc.review_status = 'rejected'
    doc.review_note = reason
    doc.reviewed_by = user
    doc.reviewed_at = timezone.now()
    doc.save()

    filing = doc.filing
    filing.srn_review_status = 'rejected'
    filing.srn_review_note = reason
    filing.srn_reviewed_by = user
    filing.srn_reviewed_at = timezone.now()
    filing.save(update_fields=[
        'srn_review_status', 'srn_review_note',
        'srn_reviewed_by', 'srn_reviewed_at', 'updated_at'
    ])

    update_filing_status_from_workflow(filing)

    log_event(
        client_id=filing.mca_case.client_id,
        litigation_type='mca',
        job_id=filing.mca_case.id,
        event_type='mca_srn_rejected',
        title=f' SRN rejected — {doc.file_name}',
        user=user,
        new_values={
            'file_name': doc.file_name,
            'srn_number': filing.srn_number,
            'rejection_reason': reason,
        },
    )
    return doc


def escalate_mca_srn(doc, user):
    doc.review_status = 'escalated'
    doc.save(update_fields=['review_status'])

    filing = doc.filing
    filing.srn_review_status = 'escalated'
    filing.save(update_fields=['srn_review_status', 'updated_at'])

    update_filing_status_from_workflow(filing)

    log_event(
        client_id=filing.mca_case.client_id,
        litigation_type='mca',
        job_id=filing.mca_case.id,
        event_type='mca_srn_escalated',
        title=f' SRN moved to CEO — {doc.file_name}',
        user=user,
    )
    return doc


# ═══════════════════════════════════════════════════════════════════
# STAGE 3 — MCA OUTCOME
# ═══════════════════════════════════════════════════════════════════
def record_mca_outcome(filing, outcome, note, user):
    """Maker records the outcome from MCA portal."""
    if outcome not in ('approved', 'rejected', 'resubmission_required'):
        raise ValueError('Invalid outcome')

    filing.mca_outcome = outcome
    filing.mca_outcome_note = note or ''
    filing.mca_outcome_recorded_by = user
    filing.mca_outcome_recorded_at = timezone.now()
    filing.save(update_fields=[
        'mca_outcome', 'mca_outcome_note',
        'mca_outcome_recorded_by', 'mca_outcome_recorded_at', 'updated_at',
    ])

    update_filing_status_from_workflow(filing)
    recompute_mca_case_status(filing.mca_case)

    event_map = {
        'approved': ('mca_outcome_approved', ' Approved the Filing'),
        'rejected': ('mca_outcome_rejected', ' Rejected the Filing'),
        'resubmission_required': ('mca_outcome_resubmit', 'Requested Resubmission'),
    }
    evt_type, title = event_map[outcome]

    log_event(
        client_id=filing.mca_case.client_id,
        litigation_type='mca',
        job_id=filing.mca_case.id,
        event_type=evt_type,
        title=title,
        user=user,
        new_values={
            'srn_number': filing.srn_number,
            'outcome': outcome,
            'note': note,
        },
    )
    return filing


def close_mca_filing(filing, user):
    """Marks a filing as closed after MCA approval or rejection."""
    filing.stage = 'closed'
    filing.save(update_fields=['stage', 'updated_at'])
    recompute_mca_case_status(filing.mca_case)

    log_event(
        client_id=filing.mca_case.client_id,
        litigation_type='mca',
        job_id=filing.mca_case.id,
        event_type='mca_filing_closed',
        title=f'MCA filing closed',
        user=user,
    )
    return filing



# ═══════════════════════════════════════════════════════════════════
# STAGE 1 — BULK DRAFT REVIEW (called from ViewSet action)
# ═══════════════════════════════════════════════════════════════════
def bulk_review_drafts(filing, action, note, user):
    """Approve/reject/escalate ALL pending draft docs in one call."""
    pending_drafts = filing.documents.filter(
        doc_type__in=['pending_draft', 'draft_form'],
        review_status__in=['pending', 'escalated'],
    )
    if not pending_drafts.exists():
        return filing, 0

    count = 0
    for doc in pending_drafts:
        if action == 'approve':
            approve_mca_draft(doc, user)
        elif action == 'reject':
            reject_mca_draft(doc, note, user)
        elif action == 'escalate':
            escalate_mca_draft(doc, user)
        count += 1

    filing.refresh_from_db()
    return filing, count


# ═══════════════════════════════════════════════════════════════════
# STAGE 2 — SRN SUBMIT + BULK REVIEW
# ═══════════════════════════════════════════════════════════════════
def submit_srn_for_review(filing, user):
    """
    Maker: move SRN-related draft docs to pending for checker.
    """
    srn_types = ['srn_receipt', 'challan', 'acknowledgment']

    drafts = filing.documents.filter(
        review_status='draft',
        doc_type__in=srn_types,
    )
    count = drafts.count()
    if count == 0:
        return filing, 0

    drafts.update(review_status='pending')

    # Optional: mirror filing-level SRN review flag
    filing.srn_review_status = 'pending'
    filing.save(update_fields=['srn_review_status', 'updated_at'])

    from .helpers import update_filing_status_from_workflow
    update_filing_status_from_workflow(filing)

    from ..utils import log_event
    log_event(
        client_id=filing.mca_case.client_id,
        litigation_type='mca',
        job_id=filing.mca_case.id,
        event_type='mca_srn_uploaded',  # or mca_docs_submitted if you prefer
        title='SRN submitted for review',
        user=user,
        new_values={
            'files': list(
                filing.documents.filter(
                    doc_type__in=srn_types,
                    review_status='pending',
                ).values_list('file_name', flat=True)
            ),
        },
    )
    return filing, count


def bulk_review_srn(filing, action_type, note, user):
    """
    Checker/CEO: approve | reject | escalate all pending/escalated SRN docs.
    """
    from django.utils import timezone
    from .helpers import update_filing_status_from_workflow, recompute_mca_case_status
    from ..utils import log_event

    srn_types = ['srn_receipt', 'challan', 'acknowledgment']
    qs = filing.documents.filter(
        doc_type__in=srn_types,
        review_status__in=['pending', 'escalated'],
    )
    docs = list(qs)
    if not docs:
        return filing, 0

    now = timezone.now()

    if action_type == 'approve':
        for doc in docs:
            doc.review_status = 'approved'
            doc.reviewed_by = user
            doc.reviewed_at = now
            doc.review_note = note or ''
            doc.save()
        filing.srn_review_status = 'approved'
        filing.srn_reviewed_by = user
        filing.srn_reviewed_at = now
        filing.save(update_fields=[
            'srn_review_status', 'srn_reviewed_by', 'srn_reviewed_at', 'updated_at',
        ])
        evt = 'mca_srn_approved'
        title = ' SRN verified'

    elif action_type == 'reject':
        for doc in docs:
            doc.review_status = 'rejected'
            doc.review_note = note
            doc.reviewed_by = user
            doc.reviewed_at = now
            doc.save()
        filing.srn_review_status = 'rejected'
        filing.srn_review_note = note
        filing.srn_reviewed_by = user
        filing.srn_reviewed_at = now
        filing.save(update_fields=[
            'srn_review_status', 'srn_review_note',
            'srn_reviewed_by', 'srn_reviewed_at', 'updated_at',
        ])
        evt = 'mca_srn_rejected'
        title = ' SRN rejected'

    elif action_type == 'escalate':
        qs.update(review_status='escalated')
        filing.srn_review_status = 'escalated'
        filing.save(update_fields=['srn_review_status', 'updated_at'])
        evt = 'mca_srn_escalated'
        title = ' SRN moved to CEO'
    else:
        return filing, 0

    update_filing_status_from_workflow(filing)
    # closed only after SRN approve — helpers already do this
    recompute_mca_case_status(filing.mca_case)

    log_event(
        client_id=filing.mca_case.client_id,
        litigation_type='mca',
        job_id=filing.mca_case.id,
        event_type=evt,
        title=title,
        user=user,
        new_values={'note': note or '', 'action': action_type},
    )
    return filing, len(docs)