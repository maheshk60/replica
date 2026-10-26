# legal_services/litigation/actions.py
"""
Litigation business logic — one function per user action.
Views call these; DB writes + audit logs happen here.
NO Response objects — actions raise nothing and return the updated instance.
"""

from django.utils import timezone
from django.contrib.auth import get_user_model

from ..models import (
    CourtCase, CourtCaseStatusLog, ReviewRequest, CaseNotice,
    NoticeDocument,
)
from ..utils import log_event
from .helpers import (
    update_notice_status_from_workflow,
    recompute_court_case_status,
    apply_review_action,
    names_for,
)

User = get_user_model()

from django.db.models import Q
# ═══════════════════════════════════════════════════════════════════
# COURT CASE
# ═══════════════════════════════════════════════════════════════════
def log_court_case_created(instance, user):
    log_event(
        client_id=instance.client_id,
        litigation_type=instance.litigation_type,
        court_case=instance,
        job_id=instance.job_id,
        event_type='case_created',
        title=f'Case created: {instance.case_title}',
        description=f'Initial status: {instance.status}',
        user=user,
        new_values={'case_title': instance.case_title, 'status': instance.status},
    )


def apply_case_summary_directly(case, description, user):
    case.job_description = description
    case.save(update_fields=['job_description', 'updated_at'])
    CourtCaseStatusLog.objects.create(
        case=case, event_type='description',
        old_status=case.status, new_status=case.status,
        note=description or 'Summary cleared',
        changed_by=user,
    )
    log_event(
        client_id=case.client_id, litigation_type=case.litigation_type,
        court_case=case, event_type='activity_update',
        title='Case summary updated', description=description[:200],
        user=user,
    )
    return case


def add_case_daily_step(case, note, user):
    CourtCaseStatusLog.objects.create(
        case=case, event_type='step',
        old_status=case.status, new_status=case.status,
        note=note, changed_by=user,
    )
    log_event(
        client_id=case.client_id, litigation_type=case.litigation_type,
        court_case=case, event_type='activity_update',
        title='Daily update added', description=note[:200], user=user,
    )
    return case


def change_case_status(case, new_status, note, rejection_reason, close_reason, next_hearing_date, user):
    old_status = case.status
    case.status = new_status
    if rejection_reason:
        case.rejection_reason = rejection_reason
    if close_reason:
        case.close_reason = close_reason
    if next_hearing_date:
        case.next_hearing_date = next_hearing_date
    case.save()

    CourtCaseStatusLog.objects.create(
        case=case, old_status=old_status, new_status=new_status,
        note=note, changed_by=user
    )
    return case


def set_case_checker_flag(case, flagged, note, user):
    case.checker_flagged = bool(flagged)
    case.checker_flag_note = note or ''
    case.save()
    CourtCaseStatusLog.objects.create(
        case=case, old_status=case.status, new_status=case.status,
        note=f"Checker flagged: {case.checker_flag_note}", changed_by=user
    )
    return case


def set_case_checker_approve_close(case, user):
    case.checker_approved_close = True
    case.save()
    CourtCaseStatusLog.objects.create(
        case=case, old_status=case.status, new_status=case.status,
        note='Checker approved closing this case', changed_by=user
    )
    return case


def assign_makers_checkers(case, maker_ids, checker_ids, litigation_type, user):
    """Used by TDS/IT viewsets. CourtCase viewset does not log this."""
    old_maker_names = names_for(case.makers.values_list('id', flat=True))
    old_checker_names = names_for(case.checkers.values_list('id', flat=True))

    case.makers.set(User.objects.filter(id__in=maker_ids))
    case.checkers.set(User.objects.filter(id__in=checker_ids))

    new_maker_names = names_for(maker_ids)
    new_checker_names = names_for(checker_ids)

    log_event(
        client_id=case.client_id, litigation_type=litigation_type,
        event_type='assignment', title='Makers/Checkers updated', user=user,
        old_values={'makers': old_maker_names, 'checkers': old_checker_names},
        new_values={'makers': new_maker_names, 'checkers': new_checker_names},
    )
    return case


def assign_court_case_mc(case, maker_ids, checker_ids):
    """CourtCase-only assignment (no log — matches original behavior)."""
    case.makers.set(User.objects.filter(id__in=maker_ids))
    case.checkers.set(User.objects.filter(id__in=checker_ids))
    return case


# ═══════════════════════════════════════════════════════════════════
# NOTICE
# ═══════════════════════════════════════════════════════════════════
def log_notice_created(instance, user):
    log_event(
        client_id=instance.court_case.client_id,
        litigation_type=instance.court_case.litigation_type,
        court_case=instance.court_case,
        job_id=instance.court_case.job_id,
        event_type='notice_created',
        title=f'Notice created — DIN: {instance.din_number or "N/A"}',
        user=user,
        new_values={
            'din_number':  instance.din_number,
            'officer':     instance.officer,
            'notice_date': str(instance.notice_date) if instance.notice_date else None,
            'due_date':    str(instance.due_date) if instance.due_date else None,
        }
    )


def set_notice_status(notice, new_status, user):
    old_status = notice.status
    notice.status = new_status
    notice.save(update_fields=['status', 'updated_at'])

    log_event(
        client_id=notice.court_case.client_id,
        litigation_type=notice.court_case.litigation_type,
        court_case=notice.court_case,
        job_id=notice.court_case.job_id,
        event_type='notice_status_changed',
        title=f'Notice status changed — DIN: {notice.din_number}',
        user=user,
        old_values={'status': old_status},
        new_values={'status': new_status},
    )
    return notice


def submit_notice_for_review(notice, user):
    notice.review_status = 'pending'
    notice.save(update_fields=['review_status', 'updated_at'])

    log_event(
        client_id=notice.court_case.client_id,
        litigation_type=notice.court_case.litigation_type,
        court_case=notice.court_case,
        job_id=notice.court_case.job_id,
        event_type='notice_doc_uploaded',
        title=f'Notice submitted for review — DIN: {notice.din_number}',
        user=user,
    )
    return notice


def accept_notice_review(notice, user):
    for doc in notice.documents.filter(doc_type='pending'):
        if doc.review_status != 'rejected':
            doc.doc_type = 'reply'
            doc.review_status = 'approved'
            doc.reviewed_by = user
            doc.reviewed_at = timezone.now()
            doc.save()

    notice.review_status = 'accepted'
    notice.reviewed_by = user
    notice.reviewed_at = timezone.now()
    notice.status = 'open'
    notice.save(update_fields=[
        'review_status', 'reviewed_by', 'reviewed_at', 'status', 'updated_at'
    ])

    recompute_court_case_status(notice.court_case)

    log_event(
        client_id=notice.court_case.client_id,
        litigation_type=notice.court_case.litigation_type,
        court_case=notice.court_case,
        job_id=notice.court_case.job_id,
        event_type='notice_doc_approved',
        title=f'Notice accepted — DIN: {notice.din_number}',
        user=user,
    )
    return notice


def reject_notice_review(notice, reason, user):
    notice.review_status = 'rejected'
    notice.review_note = reason
    notice.reviewed_by = user
    notice.reviewed_at = timezone.now()
    notice.status = 'wip'
    notice.save(update_fields=[
        'review_status', 'review_note', 'reviewed_by', 'reviewed_at', 'status', 'updated_at'
    ])

    log_event(
        client_id=notice.court_case.client_id,
        litigation_type=notice.court_case.litigation_type,
        court_case=notice.court_case,
        job_id=notice.court_case.job_id,
        event_type='notice_doc_rejected',
        title=f'Notice rejected — DIN: {notice.din_number}',
        user=user,
        new_values={'reason': reason},
    )
    return notice


def escalate_notice_review(notice, user):
    notice.review_status = 'escalated'
    notice.save(update_fields=['review_status', 'updated_at'])

    log_event(
        client_id=notice.court_case.client_id,
        litigation_type=notice.court_case.litigation_type,
        court_case=notice.court_case,
        job_id=notice.court_case.job_id,
        event_type='notice_doc_escalated',
        title=f'Notice escalated to CEO — DIN: {notice.din_number}',
        user=user,
    )
    return notice


def apply_notice_edit_directly(notice, changed_fields, new_values, old_values, user):
    for field in changed_fields:
        new_val = new_values.get(field)
        setattr(notice, field, new_val if new_val not in (None, '') else None)
    notice.save()

    log_event(
        client_id=notice.court_case.client_id,
        litigation_type=notice.court_case.litigation_type,
        court_case=notice.court_case,
        job_id=notice.court_case.job_id,
        event_type='info_update',
        title=f'Notice info updated — DIN {notice.din_number}',
        user=user,
        old_values={k: old_values.get(k) for k in changed_fields},
        new_values={k: new_values.get(k) for k in changed_fields},
    )
    return notice


def create_notice_edit_review(notice, payload, user):
    review = ReviewRequest.objects.create(
        court_case=notice.court_case,
        action_type='notice_edit',
        payload=payload,
        status='pending',
        submitted_by=user,
    )
    update_notice_status_from_workflow(notice)
    return review



def submit_notice_drafts(notice, user):
    """Returns (notice, count). count=0 means nothing to submit."""
    from ..models import ReviewRequest, NoticeDocument
    from .helpers import update_notice_status_from_workflow
    
    drafts = notice.documents.filter(review_status='draft')
    doc_count = drafts.count()

    # Find draft/rejected extensions for this specific notice
    draft_exts = ReviewRequest.objects.filter(
        court_case=notice.court_case,
        action_type='extension',
        status__in=['draft', 'rejected']
    )
    active_draft_exts = [ext for ext in draft_exts if str(ext.payload.get('notice_id')) == str(notice.id)]
    ext_count = len(active_draft_exts)

    if doc_count == 0 and ext_count == 0:
        return notice, 0

    # 1. Submit Standard Notice Documents (Replies, Supports, Acks)
    if doc_count > 0:
        drafts.update(review_status='pending')
        
        pending_replies = list(notice.documents.filter(doc_type='reply', review_status='pending').values_list('file_name', flat=True))
        pending_supports = list(notice.documents.filter(doc_type__in=['pending_support', 'supporting_doc'], review_status='pending').values_list('file_name', flat=True))
        pending_acks = list(notice.documents.filter(doc_type='acknowledgment', review_status='pending').values_list('file_name', flat=True))

        if pending_replies or pending_supports or pending_acks:
            if pending_replies:
                main_label = pending_replies[0] if len(pending_replies) == 1 else f'{len(pending_replies)} replies'
                title = f'Reply and supporting documents submitted for review — {main_label}'
                doc_type_val = 'reply'
                main_name = pending_replies[0]
            elif pending_acks:
                title = f'Acknowledgment submitted for review — {pending_acks[0]}'
                doc_type_val = 'acknowledgment'
                main_name = pending_acks[0]
            else:
                title = f'{len(pending_supports)} supporting doc(s) submitted for review'
                doc_type_val = 'supporting_doc'
                main_name = pending_supports[0]

            log_event(
                client_id=notice.court_case.client_id, litigation_type=notice.court_case.litigation_type,
                court_case=notice.court_case, job_id=notice.court_case.job_id,
                event_type='notice_doc_uploaded', title=title, user=user,
                new_values={ 'file_name': main_name, 'reply_files': pending_replies, 'supporting_docs': pending_supports, 'ack_files': pending_acks, 'doc_type': doc_type_val, 'notice_din': notice.din_number },
            )

    # 2. Submit Extension Requests
    if ext_count > 0:
        for req in active_draft_exts:
            payload = req.payload
            
            # Mark associated extension docs as pending
            doc_ids = [d['id'] for d in payload.get('reply_docs',[]) + payload.get('ack_docs',[]) + payload.get('adjourn_docs',[])]
            NoticeDocument.objects.filter(id__in=doc_ids).update(review_status='pending')
            
            req.status = 'pending'
            req.save(update_fields=['status'])

            log_event(
                client_id=notice.court_case.client_id, litigation_type=notice.court_case.litigation_type,
                court_case=notice.court_case, job_id=notice.court_case.job_id,
                event_type='notice_extension_submitted', title=f'Extension Requested — DIN: {notice.din_number}', user=user,
                new_values=payload,
            )

    update_notice_status_from_workflow(notice)
    return notice, doc_count + ext_count



# ═══════════════════════════════════════════════════════════════════
# NOTICE DOCUMENT
# ═══════════════════════════════════════════════════════════════════
def log_notice_document_created(instance, user):
    """Log create — only court_notice + acknowledgment (drafts are silent)."""
    doc_type = instance.doc_type

    if doc_type == 'court_notice':
        log_event(
            client_id=instance.notice.court_case.client_id,
            litigation_type=instance.notice.court_case.litigation_type,
            court_case=instance.notice.court_case,
            job_id=instance.notice.court_case.job_id,
            event_type='court_notice_uploaded',
            title=f'Court notice uploaded — {instance.file_name}',
            user=user,
            new_values={
                'file_name': instance.file_name,
                'doc_type': 'court_notice',
                'notice_din': instance.notice.din_number,
            },
        )

    if doc_type == 'acknowledgment':
        log_event(
            client_id=instance.notice.court_case.client_id,
            litigation_type=instance.notice.court_case.litigation_type,
            court_case=instance.notice.court_case,
            job_id=instance.notice.court_case.job_id,
            event_type='ack_uploaded',
            title=f'Acknowledgment uploaded — {instance.file_name}',
            user=user,
            new_values={
                'file_name': instance.file_name,
                'doc_type': 'acknowledgment',
                'notice_din': instance.notice.din_number,
            },
        )
        update_notice_status_from_workflow(instance.notice)



def delete_notice_document_cascade(instance, user):
    """
    Deletes the document and cascades deletion to all related files in the version bundle.
    If ANY main reply in the bundle is deleted, the entire bundle (all main replies + all supporting docs) is wiped out.
    """
    notice = instance.notice
    court_case = notice.court_case
    is_court_notice = instance.doc_type == 'court_notice'

    # ── 1. IF IT IS A MAIN REPLY (Delete the entire version bundle) ──
    if instance.doc_type in ['pending', 'reply']:
        # Determine the parent ID for this bundle
        parent_id = instance.reply_version if instance.reply_version else instance.id
        
        # Find ALL documents in this version bundle (Parent + Children + Supports)
        bundle_docs = NoticeDocument.objects.filter(
            notice=notice,
            doc_type__in=['pending', 'pending_support', 'reply', 'supporting_doc']
        ).filter(
            Q(id=parent_id) | Q(reply_version=parent_id)
        )

        # Delete physical files from disk
        for doc in bundle_docs:
            if doc.file:
                try:
                    doc.file.delete(save=False)
                except Exception:
                    pass
        
        # Delete database records
        bundle_docs.delete()
        
        # Return immediately so Django doesn't try to double-delete
        return

    # ── 2. IF IT IS A COURT NOTICE (Log the event) ──
    if is_court_notice:
        log_event(
            client_id=court_case.client_id,
            litigation_type=court_case.litigation_type,
            court_case=court_case,
            job_id=court_case.job_id,
            event_type='court_notice_deleted',
            title=f'Court notice deleted — {instance.file_name}',
            user=user,
            old_values={'file_name': instance.file_name, 'doc_type': 'court_notice'},
            new_values={'file_name': instance.file_name, 'doc_type': 'court_notice', 'notice_din': notice.din_number},
        )

    # ── 3. SINGLE FILE DELETION (Support doc or Court Notice) ──
    if instance.id:
        if instance.file:
            try:
                instance.file.delete(save=False)
            except Exception:
                pass
        instance.delete()






def approve_notice_document(doc, user):
    original_doc_type = doc.doc_type
    doc.review_status = 'approved'
    doc.reviewed_by = user
    doc.reviewed_at = timezone.now()

    if doc.doc_type == 'pending':
        doc.doc_type = 'reply'
        
        # 1. Approve attached Supporting Docs
        NoticeDocument.objects.filter(
            notice=doc.notice, reply_version=doc.id, doc_type='pending_support'
        ).update(doc_type='supporting_doc', review_status='approved', reviewed_by=user, reviewed_at=doc.reviewed_at)
        
        # 2. Approve attached EXTRA Main Replies
        NoticeDocument.objects.filter(
            notice=doc.notice, reply_version=doc.id, doc_type='pending'
        ).update(doc_type='reply', review_status='approved', reviewed_by=user, reviewed_at=doc.reviewed_at)
        
    # ✅ Handle Standalone Supporting Docs
    elif doc.doc_type == 'pending_support':
        doc.doc_type = 'supporting_doc'

    doc.save()

    notice = doc.notice
    update_notice_status_from_workflow(notice)

    if original_doc_type == 'pending':
        evt_type = 'reply_approved'
        title_prefix = 'Reply approved'
        sup_names = list(NoticeDocument.objects.filter(
            notice=notice, reply_version=doc.id, doc_type='supporting_doc'
        ).values_list('file_name', flat=True))
        
        extra_mains = list(NoticeDocument.objects.filter(
            notice=notice, reply_version=doc.id, doc_type='reply'
        ).values_list('file_name', flat=True))
        all_reply_files = [doc.file_name] + extra_mains
        
    elif original_doc_type == 'pending_support':
        evt_type = 'notice_doc_approved'
        title_prefix = 'Supporting Document approved'
        sup_names = [doc.file_name]
        all_reply_files = []
        
    elif original_doc_type == 'acknowledgment':
        evt_type = 'ack_approved'
        title_prefix = 'Acknowledgment approved'
        sup_names = []
        all_reply_files = [doc.file_name]
    else:
        evt_type = 'notice_doc_approved'
        title_prefix = 'Document approved'
        sup_names = []
        all_reply_files = [doc.file_name]

    log_event(
        client_id=notice.court_case.client_id, litigation_type=notice.court_case.litigation_type,
        court_case=notice.court_case, job_id=notice.court_case.job_id,
        event_type=evt_type, title=f'{title_prefix}', user=user,
        new_values={
            'file_name': doc.file_name, 'reply_files': all_reply_files,
            'doc_type': original_doc_type, 'notice_din': notice.din_number, 'supporting_docs': sup_names,
        },
    )
    return doc


def reject_notice_document(doc, reason, user):
    original_doc_type = doc.doc_type
    doc.review_status = 'rejected'
    doc.reviewed_by = user
    doc.reviewed_at = timezone.now()
    doc.review_note = reason
    doc.save()

    if original_doc_type == 'pending':
        # Reject BOTH supports and extra main replies
        NoticeDocument.objects.filter(
            notice=doc.notice, reply_version=doc.id, doc_type__in=['pending_support', 'pending']
        ).update(review_status='rejected', review_note=reason, reviewed_by=user, reviewed_at=doc.reviewed_at)

    notice = doc.notice
    update_notice_status_from_workflow(notice)

    if original_doc_type == 'pending':
        evt_type = 'reply_rejected'
        title_prefix = 'Reply rejected'
        sup_names = list(NoticeDocument.objects.filter(
            notice=notice, reply_version=doc.id, doc_type__in=['pending_support', 'supporting_doc']
        ).values_list('file_name', flat=True))
        
        extra_mains = list(NoticeDocument.objects.filter(
            notice=notice, reply_version=doc.id, doc_type__in=['pending', 'reply']
        ).values_list('file_name', flat=True))
        all_reply_files = [doc.file_name] + extra_mains
        
    elif original_doc_type == 'pending_support':
        evt_type = 'notice_doc_rejected'
        title_prefix = 'Supporting Document rejected'
        sup_names = [doc.file_name]
        all_reply_files = []
        
    elif original_doc_type == 'acknowledgment':
        evt_type = 'ack_rejected'
        title_prefix = 'Acknowledgment rejected'
        sup_names = []
        all_reply_files = [doc.file_name]
    else:
        evt_type = 'notice_doc_rejected'
        title_prefix = 'Document rejected'
        sup_names = []
        all_reply_files = [doc.file_name]

    log_event(
        client_id=notice.court_case.client_id, litigation_type=notice.court_case.litigation_type,
        court_case=notice.court_case, job_id=notice.court_case.job_id,
        event_type=evt_type, title=f'{title_prefix}', user=user,
        new_values={
            'file_name': doc.file_name, 'reply_files': all_reply_files,
            'doc_type': original_doc_type, 'notice_din': notice.din_number,
            'rejection_reason': reason, 'supporting_docs': sup_names,
        },
    )
    return doc


def escalate_notice_document(doc, user):
    doc.review_status = 'escalated'
    doc.save(update_fields=['review_status'])

    if doc.doc_type == 'pending':
        NoticeDocument.objects.filter(
            notice=doc.notice, reply_version=doc.id, doc_type__in=['pending', 'pending_support']
        ).update(review_status='escalated')

    if doc.doc_type == 'pending':
        evt_type = 'reply_escalated'
        title_prefix = 'Reply moved to CEO'
        sup_names = list(NoticeDocument.objects.filter(notice=doc.notice, reply_version=doc.id, doc_type='pending_support').values_list('file_name', flat=True))
        extra_mains = list(NoticeDocument.objects.filter(notice=doc.notice, reply_version=doc.id, doc_type='pending').values_list('file_name', flat=True))
        all_reply_files = [doc.file_name] + extra_mains
        
    elif doc.doc_type == 'pending_support':
        evt_type = 'notice_doc_escalated'
        title_prefix = 'Supporting Document moved to CEO'
        sup_names = [doc.file_name]
        all_reply_files = []
        
    elif doc.doc_type == 'acknowledgment':
        evt_type = 'ack_escalated'
        title_prefix = 'Acknowledgment moved to CEO'
        sup_names, all_reply_files = [], [doc.file_name]
    else:
        evt_type = 'notice_doc_escalated'
        title_prefix = 'Document moved to CEO'
        sup_names, all_reply_files = [], [doc.file_name]

    log_event(
        client_id=doc.notice.court_case.client_id, litigation_type=doc.notice.court_case.litigation_type,
        court_case=doc.notice.court_case, job_id=doc.notice.court_case.job_id,
        event_type=evt_type, title=f'{title_prefix}', user=user,
        new_values={
            'file_name': doc.file_name, 'reply_files': all_reply_files,
            'doc_type': doc.doc_type, 'notice_din': doc.notice.din_number, 'supporting_docs': sup_names,
        },
    )
    return doc

# ═══════════════════════════════════════════════════════════════════
# NOTICE REPLY (HTML editor)
# ═══════════════════════════════════════════════════════════════════
def handle_reply_post_update(instance, saved, old_status, old_title, user):
    if old_status == 'rejected' and saved.content_html != instance.content_html:
        saved.status = 'draft'
        saved.review_note = None
        saved.save(update_fields=['status', 'review_note', 'updated_at'])

    if old_title != saved.title:
        log_event(
            client_id=saved.notice.court_case.client_id,
            litigation_type=saved.notice.court_case.litigation_type,
            court_case=saved.notice.court_case,
            job_id=saved.notice.court_case.job_id,
            event_type='notice_doc_uploaded',
            title=f'Reply title updated — {saved.title or "Untitled"}',
            user=user,
            old_values={'title': old_title},
            new_values={'title': saved.title},
        )


def send_reply_for_review(reply, user):
    reply.status = 'pending'
    reply.review_note = None
    reply.reviewed_by = None
    reply.reviewed_at = None
    reply.save(update_fields=[
        'status', 'review_note', 'reviewed_by', 'reviewed_at', 'updated_at'
    ])

    update_notice_status_from_workflow(reply.notice)

    sup_names = list(
        NoticeDocument.objects.filter(
            notice=reply.notice,
            reply_version=reply.id,
            doc_type__in=['pending_support', 'supporting_doc'],
        ).values_list('file_name', flat=True)
    )

    log_event(
        client_id=reply.notice.court_case.client_id,
        litigation_type=reply.notice.court_case.litigation_type,
        court_case=reply.notice.court_case,
        job_id=reply.notice.court_case.job_id,
        event_type='notice_doc_uploaded',
        title=f'Reply and supporting documents submitted for review — {reply.title or "Untitled"}',
        user=user,
        new_values={
            'file_name': reply.title or 'Untitled',
            'reply_files': [reply.title or 'Untitled'],
            'supporting_docs': sup_names,
            'doc_type': 'reply',
            'notice_din': reply.notice.din_number,
        },
    )
    return reply


def delete_reply_cascade(instance, user):
    linked_supports = NoticeDocument.objects.filter(
        notice=instance.notice,
        doc_type__in=['pending_support', 'supporting_doc'],
        reply_version=instance.id
    )
    for sup in linked_supports:
        if sup.file:
            try:
                sup.file.delete(save=False)
            except Exception:
                pass
        sup.delete()

    log_event(
        client_id=instance.notice.court_case.client_id,
        litigation_type=instance.notice.court_case.litigation_type,
        court_case=instance.notice.court_case,
        job_id=instance.notice.court_case.job_id,
        event_type='notice_doc_deleted',
        title=f'Reply deleted — {instance.title or "Untitled"}',
        user=user,
        old_values={
            'reply_title': instance.title,
            'status': instance.status,
        },
    )
    instance.delete()


def approve_reply(reply, user):
    reply.status = 'approved'
    reply.reviewed_by = user
    reply.reviewed_at = timezone.now()
    reply.review_note = None
    reply.save(update_fields=[
        'status', 'reviewed_by', 'reviewed_at', 'review_note', 'updated_at'
    ])

    NoticeDocument.objects.filter(
        notice=reply.notice,
        doc_type='pending_support',
        reply_version=reply.id
    ).update(
        doc_type='supporting_doc',
        review_status='approved',
        reviewed_by=user,
        reviewed_at=reply.reviewed_at
    )

    sup_names = list(NoticeDocument.objects.filter(
        notice=reply.notice, reply_version=reply.id, doc_type='supporting_doc'
    ).values_list('file_name', flat=True))

    log_event(
        client_id=reply.notice.court_case.client_id,
        litigation_type=reply.notice.court_case.litigation_type,
        court_case=reply.notice.court_case,
        job_id=reply.notice.court_case.job_id,
        event_type='reply_approved',
        title=f'Reply approved — {reply.title or "Untitled"}',
        user=user,
        new_values={
            'file_name': reply.title or 'Untitled',
            'reply_files': [reply.title or 'Untitled'],
            'doc_type': 'reply',
            'notice_din': reply.notice.din_number,
            'supporting_docs': sup_names,
        },
    )
    update_notice_status_from_workflow(reply.notice)
    return reply


def reject_reply(reply, reason, user):
    reply.status = 'rejected'
    reply.review_note = reason
    reply.reviewed_by = user
    reply.reviewed_at = timezone.now()
    reply.save(update_fields=[
        'status', 'review_note', 'reviewed_by', 'reviewed_at', 'updated_at'
    ])

    NoticeDocument.objects.filter(
        notice=reply.notice,
        doc_type='pending_support',
        reply_version=reply.id
    ).update(
        review_status='rejected',
        review_note=reason,
        reviewed_by=user,
        reviewed_at=reply.reviewed_at
    )

    sup_names = list(
        NoticeDocument.objects.filter(
            notice=reply.notice,
            reply_version=reply.id,
            doc_type__in=['pending_support', 'supporting_doc'],
        ).values_list('file_name', flat=True)
    )

    log_event(
        client_id=reply.notice.court_case.client_id,
        litigation_type=reply.notice.court_case.litigation_type,
        court_case=reply.notice.court_case,
        job_id=reply.notice.court_case.job_id,
        event_type='reply_rejected',
        title=f'Reply rejected — {reply.title or "Untitled"}',
        user=user,
        new_values={
            'file_name': reply.title or 'Untitled',
            'reply_files': [reply.title or 'Untitled'],
            'supporting_docs': sup_names,
            'doc_type': 'reply',
            'notice_din': reply.notice.din_number,
            'rejection_reason': reason,
        },
    )
    update_notice_status_from_workflow(reply.notice)
    return reply


def escalate_reply(reply, user):
    reply.status = 'escalated'
    reply.reviewed_by = user
    reply.reviewed_at = timezone.now()
    reply.save(update_fields=[
        'status', 'reviewed_by', 'reviewed_at', 'updated_at'
    ])

    sup_names = list(
        NoticeDocument.objects.filter(
            notice=reply.notice,
            reply_version=reply.id,
            doc_type__in=['pending_support', 'supporting_doc'],
        ).values_list('file_name', flat=True)
    )

    log_event(
        client_id=reply.notice.court_case.client_id,
        litigation_type=reply.notice.court_case.litigation_type,
        court_case=reply.notice.court_case,
        job_id=reply.notice.court_case.job_id,
        event_type='reply_escalated',
        title=f'Reply moved to CEO — {reply.title or "Untitled"}',
        user=user,
        new_values={
            'file_name': reply.title or 'Untitled',
            'reply_files': [reply.title or 'Untitled'],
            'supporting_docs': sup_names,
            'doc_type': 'reply',
            'notice_din': reply.notice.din_number,
        },
    )
    update_notice_status_from_workflow(reply.notice)
    return reply


def reopen_reply(reply, user):
    reply.status = 'draft'
    reply.review_note = None
    reply.reviewed_by = None
    reply.reviewed_at = None
    reply.save(update_fields=[
        'status', 'review_note', 'reviewed_by', 'reviewed_at', 'updated_at'
    ])
    update_notice_status_from_workflow(reply.notice)
    return reply




# ═══════════════════════════════════════════════════════════════════
# REVIEW REQUEST
# ═══════════════════════════════════════════════════════════════════
def approve_review_request(review, user):
    apply_review_action(review)

    review.status = 'approved'
    review.reviewed_by = user
    review.reviewed_at = timezone.now()
    review.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

    if review.action_type == 'notice_edit':
        notice_id = (review.payload or {}).get('notice_id')
        if notice_id:
            try:
                from .helpers import update_notice_status_from_workflow
                notice = CaseNotice.objects.get(id=notice_id)
                update_notice_status_from_workflow(notice)
            except CaseNotice.DoesNotExist:
                pass

    if review.action_type == 'extension':
        from ..models import CaseNotice, NoticeDocument
        from .helpers import update_notice_status_from_workflow
        payload = review.payload
        notice = CaseNotice.objects.get(id=payload['notice_id'])
        
        reply_ids = [d['id'] for d in payload.get('reply_docs', [])]
        ack_ids = [d['id'] for d in payload.get('ack_docs', [])]
        adjourn_ids = [d['id'] for d in payload.get('adjourn_docs', [])]
        
        # Approve new docs
        NoticeDocument.objects.filter(id__in=reply_ids).update(doc_type='ext_reply', review_status='approved')
        NoticeDocument.objects.filter(id__in=ack_ids).update(doc_type='ext_ack', review_status='approved')
        NoticeDocument.objects.filter(id__in=adjourn_ids).update(doc_type='ext_adjourn', review_status='approved')

        history = notice.extension_history or []
        ext_id = payload.get('ext_id')

        new_ext_entry = {
            'id': ext_id,
            'old_date': payload.get('old_date'),
            'extended_due_date': payload.get('new_date'),
            'notes': payload.get('notes'),
            'reply_docs': payload.get('reply_docs', []),
            'ack_docs': payload.get('ack_docs', []),
            'adjourn_docs': payload.get('adjourn_docs', []),
            'created_at': timezone.now().isoformat(),
            'created_by_name': (review.submitted_by.get_full_name() or review.submitted_by.email) if review.submitted_by else 'Unknown Maker',
        }

        if payload.get('is_edit'):
            # Replace existing in history and delete removed files
            for i, ext in enumerate(history):
                if ext.get('id') == ext_id:
                    old_doc_ids = [d['id'] for d in ext.get('reply_docs', []) + ext.get('ack_docs', []) + ext.get('adjourn_docs', [])]
                    removed_ids = set(old_doc_ids) - set(reply_ids + ack_ids + adjourn_ids)
                    if removed_ids:
                        NoticeDocument.objects.filter(id__in=removed_ids).delete()
                    history[i] = new_ext_entry
                    break
        else:
            history.insert(0, new_ext_entry)
        
        notice.extension_history = history
        notice.extended_due_date = payload['new_date']
        notice.save(update_fields=['extension_history', 'extended_due_date', 'updated_at'])
        
        # Evaluate workflow status
        update_notice_status_from_workflow(notice)

        log_event(
            client_id=notice.court_case.client_id, litigation_type=notice.court_case.litigation_type,
            court_case=notice.court_case, job_id=notice.court_case.job_id,
            event_type='notice_extension_approved', title=f'Extension Approved — DIN: {notice.din_number}', user=user,
            new_values=payload,
        )

    return review


def reject_review_request(review, reason, user):
    case = review.court_case
    review.status = 'rejected'
    review.reviewed_by = user
    review.reviewed_at = timezone.now()
    review.review_note = reason
    review.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_note'])

    if review.action_type == 'notice_edit':
        notice_din = review.payload.get('notice_din', '—')
        notice_id = review.payload.get('notice_id')
        log_event(
            client_id=case.client_id,
            litigation_type=case.litigation_type,
            court_case=case,
            job_id=case.job_id,
            event_type='notice_doc_rejected',
            title=f'Notice info edit rejected — DIN {notice_din}',
            user=user,
            new_values={
                'rejection_reason': reason,
                'notice_din': notice_din,
                'doc_type': 'notice_edit',
            },
        )

        if notice_id:
            try:
                from .helpers import update_notice_status_from_workflow
                notice = CaseNotice.objects.get(id=notice_id)
                update_notice_status_from_workflow(notice)
            except CaseNotice.DoesNotExist:
                pass

    if review.action_type == 'extension':
        from ..models import CaseNotice, NoticeDocument
        from .helpers import update_notice_status_from_workflow
        payload = review.payload
        notice = CaseNotice.objects.get(id=payload['notice_id'])
        
        reply_ids = [d['id'] for d in payload.get('reply_docs', [])]
        ack_ids = [d['id'] for d in payload.get('ack_docs', [])]
        adjourn_ids = [d['id'] for d in payload.get('adjourn_docs', [])]
        
        # Reject ALL docs safely
        NoticeDocument.objects.filter(id__in=reply_ids + ack_ids + adjourn_ids).update(review_status='rejected', review_note=reason)

        # Update workflow status based on other documents remaining
        update_notice_status_from_workflow(notice)
        
        payload['rejection_reason'] = reason
        log_event(
            client_id=notice.court_case.client_id, litigation_type=notice.court_case.litigation_type,
            court_case=notice.court_case, job_id=notice.court_case.job_id,
            event_type='notice_extension_rejected', title=f'Extension Rejected — DIN: {notice.din_number}', user=user,
            new_values=payload,
        )

    return review


def escalate_review_request(review, user):
    review.status = 'escalated'
    review.escalated_to_founder = True
    review.save(update_fields=['status', 'escalated_to_founder'])
    return review


# ═══════════════════════════════════════════════════════════════════
# CLOSURE
# ═══════════════════════════════════════════════════════════════════
def reset_rejected_closure_bundle(court_case, user):
    for old_doc in court_case.closure_documents.all():
        log_event(
            client_id=court_case.client_id,
            litigation_type=court_case.litigation_type,
            court_case=court_case,
            job_id=court_case.job_id,
            event_type='doc_delete',
            title=f'Old rejected closure doc auto-removed: {old_doc.file_name}',
            user=user,
            old_values={'file_name': old_doc.file_name, 'doc_type': old_doc.doc_type},
        )
        old_doc.delete()

    court_case.closure_review_status = 'not_started'
    court_case.closure_review_note = None
    court_case.closure_reviewed_by = None
    court_case.closure_reviewed_at = None
    court_case.closure_submitted_by = None
    court_case.closure_submitted_at = None
    court_case.save(update_fields=[
        'closure_review_status', 'closure_review_note',
        'closure_reviewed_by', 'closure_reviewed_at',
        'closure_submitted_by', 'closure_submitted_at', 'updated_at',
    ])


def after_closure_doc_uploaded(instance, court_case, doc_type, user):
    if court_case.closure_review_status == 'not_started':
        court_case.closure_review_status = 'draft'
        court_case.save(update_fields=['closure_review_status', 'updated_at'])

    doc_labels = {
        'order': 'Order',
        'demand_notice': 'Demand Notice',
        'computation_sheet': 'Computation Sheet',
    }
    log_event(
        client_id=court_case.client_id,
        litigation_type=court_case.litigation_type,
        court_case=court_case,
        job_id=court_case.job_id,
        event_type='doc_upload',
        title=f'{doc_labels.get(doc_type, doc_type)} uploaded for case closure',
        user=user,
        new_values={'file_name': instance.file_name, 'doc_type': doc_type},
    )


def delete_closure_doc(instance, user):
    court_case = instance.court_case
    doc_labels = {
        'order': 'Order',
        'demand_notice': 'Demand Notice',
        'computation_sheet': 'Computation Sheet',
    }
    log_event(
        client_id=court_case.client_id,
        litigation_type=court_case.litigation_type,
        court_case=court_case,
        job_id=court_case.job_id,
        event_type='doc_delete',
        title=f'{doc_labels.get(instance.doc_type, instance.doc_type)} deleted',
        user=user,
        old_values={'file_name': instance.file_name, 'doc_type': instance.doc_type},
    )

    instance.delete()

    if not court_case.closure_documents.exists() and court_case.closure_review_status == 'draft':
        court_case.closure_review_status = 'not_started'
        court_case.save(update_fields=['closure_review_status', 'updated_at'])


def submit_closure_bundle(court_case, user):
    court_case.closure_review_status = 'pending'
    court_case.closure_submitted_by = user
    court_case.closure_submitted_at = timezone.now()
    court_case.closure_review_note = None
    court_case.closure_reviewed_by = None
    court_case.closure_reviewed_at = None
    court_case.save(update_fields=[
        'closure_review_status', 'closure_submitted_by', 'closure_submitted_at',
        'closure_review_note', 'closure_reviewed_by', 'closure_reviewed_at',
        'updated_at',
    ])

    closure_files = {d.doc_type: d.file_name for d in court_case.closure_documents.all()}
    log_event(
        client_id=court_case.client_id,
        litigation_type=court_case.litigation_type,
        court_case=court_case,
        job_id=court_case.job_id,
        event_type='closure_submitted',
        title='Case closure documents submitted for review (3 documents)',
        user=user,
        new_values={'closure_documents': closure_files},
    )
    return court_case


def approve_closure_bundle(court_case, user):
    court_case.closure_review_status = 'approved'
    court_case.closure_reviewed_by = user
    court_case.closure_reviewed_at = timezone.now()
    court_case.closure_review_note = None
    court_case.status = 'closed'
    court_case.save(update_fields=[
        'closure_review_status', 'closure_reviewed_by', 'closure_reviewed_at',
        'closure_review_note', 'status', 'updated_at',
    ])

    court_case.notices.exclude(status='open').update(status='open')

    CourtCaseStatusLog.objects.create(
        case=court_case,
        event_type='step',
        old_status='wip',
        new_status='closed',
        note='Case closed — closure documents approved',
        changed_by=user,
    )

    log_event(
        client_id=court_case.client_id,
        litigation_type=court_case.litigation_type,
        court_case=court_case,
        job_id=court_case.job_id,
        event_type='closure_approved',
        title='Case closed — closure documents approved',
        user=user,
        new_values={'status': 'closed'},
    )
    return court_case


def reject_closure_bundle(court_case, reason, user):
    court_case.closure_review_status = 'rejected'
    court_case.closure_review_note = reason
    court_case.closure_reviewed_by = user
    court_case.closure_reviewed_at = timezone.now()
    court_case.save(update_fields=[
        'closure_review_status', 'closure_review_note',
        'closure_reviewed_by', 'closure_reviewed_at', 'updated_at',
    ])

    log_event(
        client_id=court_case.client_id,
        litigation_type=court_case.litigation_type,
        court_case=court_case,
        job_id=court_case.job_id,
        event_type='closure_rejected',
        title='Case closure documents rejected',
        user=user,
        new_values={'rejection_reason': reason},
    )
    return court_case


def escalate_closure_bundle(court_case, user):
    court_case.closure_review_status = 'escalated'
    court_case.save(update_fields=['closure_review_status', 'updated_at'])

    log_event(
        client_id=court_case.client_id,
        litigation_type=court_case.litigation_type,
        court_case=court_case,
        job_id=court_case.job_id,
        event_type='closure_escalated',
        title='Case closure documents moved to CEO',
        user=user,
    )
    return court_case




def submit_notice_extension(notice, new_date, notes, reply_files, ack_files, adjourn_files, retained_replies, retained_acks, retained_adjourns, ext_id, user):
    from ..models import NoticeDocument, ReviewRequest
    import time

    # Keep track of old files the user decided to keep
    reply_docs_data = [{'id': int(i)} for i in retained_replies if i]
    ack_docs_data = [{'id': int(i)} for i in retained_acks if i]
    adjourn_docs_data = [{'id': int(i)} for i in retained_adjourns if i]

    # Process new uploaded files AS DRAFTS
    for f in reply_files:
        doc = NoticeDocument.objects.create(notice=notice, file=f, doc_type='ext_reply', review_status='draft', uploaded_by=user)
        reply_docs_data.append({'id': doc.id, 'file_name': doc.file_name, 'file_url': doc.file.url})

    for f in ack_files:
        doc = NoticeDocument.objects.create(notice=notice, file=f, doc_type='ext_ack', review_status='draft', uploaded_by=user)
        ack_docs_data.append({'id': doc.id, 'file_name': doc.file_name, 'file_url': doc.file.url})

    for f in adjourn_files:
        doc = NoticeDocument.objects.create(notice=notice, file=f, doc_type='ext_adjourn', review_status='draft', uploaded_by=user)
        adjourn_docs_data.append({'id': doc.id, 'file_name': doc.file_name, 'file_url': doc.file.url})

    payload = {
        'ext_id': ext_id or f"ext_{int(time.time())}",
        'notice_id': notice.id,
        'notice_din': notice.din_number,
        'old_date': str(notice.extended_due_date or notice.due_date),
        'new_date': str(new_date),
        'notes': notes,
        'reply_docs': reply_docs_data,
        'ack_docs': ack_docs_data,
        'adjourn_docs': adjourn_docs_data,
        'is_edit': bool(ext_id)
    }

    # Check if we are editing an existing draft or rejected request
    req = ReviewRequest.objects.filter(court_case=notice.court_case, action_type='extension', payload__ext_id=payload['ext_id']).first()

    if req:
        # Delete removed files from database
        old_ids = [d['id'] for d in req.payload.get('reply_docs',[]) + req.payload.get('ack_docs',[]) + req.payload.get('adjourn_docs',[])]
        new_ids = [d['id'] for d in reply_docs_data + ack_docs_data + adjourn_docs_data]
        removed_ids = set(old_ids) - set(new_ids)
        if removed_ids:
            NoticeDocument.objects.filter(id__in=removed_ids).delete()

        req.payload = payload
        req.status = 'draft' # Moves back to draft
        req.save(update_fields=['payload', 'status'])
    else:
        ReviewRequest.objects.create(
            court_case=notice.court_case,
            action_type='extension',
            payload=payload,
            status='draft',
            submitted_by=user
        )

    # Do not log the actual submission event yet; that happens on submitDocs.
    return notice


