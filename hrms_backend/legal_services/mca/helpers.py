# legal_services/mca/helpers.py
"""
MCA-specific helpers. Pure functions.
"""

from datetime import date, timedelta
from django.contrib.auth import get_user_model

from ..permissions import is_admin_role
from .constants import get_form_metadata
from .constants import is_auto_close_on_srn

User = get_user_model()


# ─────────────────────────────────────────────────────────────
# PERMISSION HELPERS
# ─────────────────────────────────────────────────────────────
def is_mca_case_maker(mca_case, user):
    if not user or not user.is_authenticated:
        return False
    return mca_case.makers.filter(id=user.id).exists()


def is_mca_case_checker(mca_case, user):
    if not user or not user.is_authenticated:
        return False
    return mca_case.checkers.filter(id=user.id).exists()


def is_maker_or_admin(mca_case, user):
    return is_mca_case_maker(mca_case, user) or is_admin_role(user)


# ─────────────────────────────────────────────────────────────
# DUE DATE CALCULATION
# ─────────────────────────────────────────────────────────────
def calculate_filing_due_date(event_date, sub_service_slug):
    """Auto-calculates due date based on form's default_due_days."""
    if not event_date:
        return None
    meta = get_form_metadata(sub_service_slug)
    days = meta.get('default_due_days', 30)
    if isinstance(event_date, str):
        try:
            event_date = date.fromisoformat(event_date)
        except (ValueError, TypeError):
            return None
    return event_date + timedelta(days=days)


# ─────────────────────────────────────────────────────────────
# STATUS COMPUTATION
# ─────────────────────────────────────────────────────────────
def update_filing_status_from_workflow(filing, user=None):
    docs = filing.documents.filter(is_deleted=False)

    has_pending_any = docs.filter(
        review_status__in=['pending', 'escalated']
    ).exists()

    has_approved_srn = docs.filter(
        doc_type__in=['supporting_doc', 'pending_support'],
        review_status__in=['approved', 'accepted'],
    ).exists()

    has_approved_draft = docs.filter(
        doc_type__in=['pending_draft', 'draft_form'],
        review_status__in=['approved', 'accepted'],
    ).exists()

    has_pending_draft = docs.filter(
        doc_type__in=['pending_draft', 'draft_form'],
        review_status__in=['pending', 'escalated'],
    ).exists()

    has_pending_srn = docs.filter(
        doc_type__in=['supporting_doc', 'pending_support'],
        review_status__in=['pending', 'escalated'],
    ).exists()

    if has_approved_srn and not has_pending_any:
        filing.status = 'closed'
        filing.stage = 'closed'
    elif has_pending_srn:
        filing.status = 'under_review'
        filing.stage = 'portal_filing'
    elif has_approved_draft:
        filing.status = 'wip'
        filing.stage = 'portal_filing'
    elif has_pending_draft:
        filing.status = 'under_review'
        filing.stage = 'internal_review'
    else:
        filing.status = 'wip'
        filing.stage = 'internal_review'

    filing.save(update_fields=['status', 'stage', 'updated_at'])
    recompute_mca_case_status(filing.mca_case, user=user)


def recompute_mca_case_status(mca_case, user=None):
    filings = mca_case.filings.prefetch_related('documents').all()

    if not filings.exists():
        new_status = 'wip'
    else:
        any_under_review = False
        any_srn_approved = False
        any_cert_approved = False

        for filing in filings:
            docs = filing.documents.filter(is_deleted=False)

            if docs.filter(review_status__in=['pending', 'escalated']).exists():
                any_under_review = True

            if docs.filter(
                doc_type__in=['supporting_doc', 'pending_support'],
                review_status__in=['approved', 'accepted'],
            ).exists():
                any_srn_approved = True

            if docs.filter(
                doc_type='mca_approval_cert',
                review_status__in=['approved', 'accepted'],
            ).exists():
                any_cert_approved = True

        if any_under_review:
            new_status = 'under_review'
        elif any_cert_approved:
            new_status = 'closed'
        elif any_srn_approved:
            if is_auto_close_on_srn(mca_case.sub_service):
                new_status = 'closed'
            else:
                new_status = 'open'
        else:
            new_status = 'wip'

    if mca_case.status != new_status:
        old_status = mca_case.status
        mca_case.status = new_status
        mca_case.save(update_fields=['status', 'updated_at'])

        if new_status == 'closed' and old_status != 'closed':
            closing_user = user or mca_case.makers.first() or mca_case.created_by
            try:
                from ..utils import log_event
                log_event(
                    client_id=mca_case.client_id,
                    litigation_type='mca',
                    job_id=mca_case.id,
                    event_type='mca_filing_closed',
                    title='Case closed',
                    user=closing_user,
                    old_values={'status': old_status},
                    new_values={'status': 'closed'},
                )
            except Exception:
                pass