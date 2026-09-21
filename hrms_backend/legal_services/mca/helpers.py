# # legal_services/mca/helpers.py
# """
# MCA-specific helpers. Pure functions.
# """

# from datetime import date, timedelta
# from django.contrib.auth import get_user_model

# from ..models import MCACase, MCAFiling, MCAFilingDocument
# from ..permissions import is_admin_role, is_case_maker as _is_lit_case_maker, is_case_checker as _is_lit_case_checker
# from .constants import get_form_metadata

# User = get_user_model()


# # ─────────────────────────────────────────────────────────────
# # PERMISSION HELPERS (MCA-specific — case-level assignments)
# # ─────────────────────────────────────────────────────────────
# def is_mca_case_maker(mca_case, user):
#     if not user or not user.is_authenticated:
#         return False
#     if mca_case.makers.filter(id=user.id).exists():
#         return True
#     # Fallback: same client + admin
#     return False


# def is_mca_case_checker(mca_case, user):
#     if not user or not user.is_authenticated:
#         return False
#     if mca_case.checkers.filter(id=user.id).exists():
#         return True
#     return False


# def is_maker_or_admin(mca_case, user):
#     return is_mca_case_maker(mca_case, user) or is_admin_role(user)


# # ─────────────────────────────────────────────────────────────
# # DUE DATE CALCULATION
# # ─────────────────────────────────────────────────────────────
# def calculate_filing_due_date(event_date, sub_service_slug):
#     """Auto-calculates due date based on form's default_due_days."""
#     if not event_date:
#         return None
#     meta = get_form_metadata(sub_service_slug)
#     days = meta.get('default_due_days', 30)
#     if isinstance(event_date, str):
#         try:
#             event_date = date.fromisoformat(event_date)
#         except (ValueError, TypeError):
#             return None
#     return event_date + timedelta(days=days)


# # ─────────────────────────────────────────────────────────────
# # STATUS COMPUTATION
# # ─────────────────────────────────────────────────────────────
# def update_filing_status_from_workflow(filing):
#     """
#     Auto-computes filing.status + filing.stage from doc states + review states.
#     """
#     docs = filing.documents

#     # ── Stage 1: Internal Draft Review ──
#     has_pending_draft = docs.filter(
#         doc_type__in=['pending_draft', 'draft_form'],
#         review_status__in=['pending', 'escalated']
#     ).exists()
#     if has_pending_draft:
#         filing.status = 'under_review'
#         filing.stage = 'internal_review'
#         filing.save(update_fields=['status', 'stage', 'updated_at'])
#         return

#     # ── Stage 2: SRN filing on portal ──
#     has_pending_srn = docs.filter(
#         doc_type='srn_receipt',
#         review_status__in=['pending', 'escalated']
#     ).exists()
#     if has_pending_srn:
#         filing.status = 'under_review'
#         filing.stage = 'portal_filing'
#         filing.save(update_fields=['status', 'stage', 'updated_at'])
#         return

#     has_approved_srn = docs.filter(
#         doc_type='srn_receipt', review_status='approved'
#     ).exists()
#     has_approved_draft = docs.filter(
#         doc_type='draft_form', review_status='approved'
#     ).exists()

#     # ── Stage 3: MCA outcome recorded ──
#     if filing.mca_outcome == 'approved':
#         filing.status = 'mca_approved'
#         filing.stage = 'closed'
#     elif filing.mca_outcome == 'rejected':
#         filing.status = 'mca_rejected'
#         filing.stage = 'closed'
#     elif filing.mca_outcome == 'resubmission_required':
#         filing.status = 'resubmission_required'
#         filing.stage = 'portal_filing'
#     elif has_approved_srn:
#         filing.status = 'filed_on_portal'
#         filing.stage = 'mca_verification'
#     elif has_approved_draft:
#         filing.status = 'approved_for_filing'
#         filing.stage = 'portal_filing'
#     else:
#         filing.status = 'wip'
#         filing.stage = 'internal_review'

#     filing.save(update_fields=['status', 'stage', 'updated_at'])


# def recompute_mca_case_status(mca_case):
#     """Recomputes MCACase.status from its filings."""
#     if mca_case.status == 'closed':
#         return
#     filings = mca_case.filings.all()
#     if not filings.exists():
#         return

#     all_closed = all(f.status in ('mca_approved', 'mca_rejected') for f in filings)
#     if all_closed:
#         mca_case.status = 'closed'
#         mca_case.save(update_fields=['status', 'updated_at'])
#         return

#     any_pending = any(f.status in ('wip', 'under_review', 'resubmission_required') for f in filings)
#     if any_pending:
#         new_status = 'in_progress'
#     else:
#         new_status = 'open'

#     if mca_case.status != new_status:
#         mca_case.status = new_status
#         mca_case.save(update_fields=['status', 'updated_at'])

















# legal_services/mca/helpers.py
"""
MCA-specific helpers. Pure functions.
"""

from datetime import date, timedelta
from django.contrib.auth import get_user_model

from ..permissions import is_admin_role
from .constants import get_form_metadata

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
def update_filing_status_from_workflow(filing):
    """
    Updates filing.stage (internal tracking) and always recomputes
    parent MCACase.status for the header badge:

      wip → under_review → wip → under_review → closed
    """
    docs = filing.documents

    has_pending_any = docs.filter(
        review_status__in=['pending', 'escalated']
    ).exists()

    has_approved_srn = docs.filter(
        doc_type__in=['srn_receipt', 'challan', 'acknowledgment'],
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
        doc_type__in=['srn_receipt', 'challan', 'acknowledgment'],
        review_status__in=['pending', 'escalated'],
    ).exists()

    # Internal filing.stage only (not shown as main case badge)
    if has_approved_srn and not has_pending_any:
        filing.status = 'closed'
        filing.stage = 'closed'
    elif has_pending_srn:
        filing.status = 'under_review'
        filing.stage = 'portal_filing'
    elif has_approved_draft:
        filing.status = 'wip'  # maker must upload SRN
        filing.stage = 'portal_filing'
    elif has_pending_draft:
        filing.status = 'under_review'
        filing.stage = 'internal_review'
    else:
        filing.status = 'wip'
        filing.stage = 'internal_review'

    filing.save(update_fields=['status', 'stage', 'updated_at'])

    # Main badge lives on MCACase
    recompute_mca_case_status(filing.mca_case)

def recompute_mca_case_status(mca_case):
    """
    Main case status:
    - under_review  → any doc pending or escalated
    - closed        → SRN approved AND form is AOC-4 / MGT-7 OR Final Cert Approved
    - open          → SRN approved but form is Event-Based
    - wip           → everything else
    """
    filings = mca_case.filings.prefetch_related('documents').all()

    if not filings.exists():
        new_status = 'wip'
    else:
        any_under_review = False
        any_srn_approved = False
        any_cert_approved = False

        for filing in filings:
            docs = filing.documents.all()

            if docs.filter(review_status__in=['pending', 'escalated']).exists():
                any_under_review = True

            if docs.filter(
                doc_type__in=['srn_receipt', 'challan', 'acknowledgment'],
                review_status__in=['approved', 'accepted'],
            ).exists():
                any_srn_approved = True

            # ✅ NEW: Check if the Final MCA Approval Cert is approved
            if docs.filter(
                doc_type='mca_approval_cert',
                review_status__in=['approved', 'accepted'],
            ).exists():
                any_cert_approved = True

        if any_under_review:
            new_status = 'under_review'
        elif any_cert_approved:
            # ✅ If the final certificate is approved, the case is 100% closed
            new_status = 'closed'
        elif any_srn_approved:
            # Check if this sub-service should auto-close
            sub_name = (mca_case.sub_service.name if mca_case.sub_service else '').upper()
            if 'AOC-4' in sub_name or 'MGT-7' in sub_name:
                new_status = 'closed'
            else:
                new_status = 'open' # Wait for Maker to upload Final Cert
        else:
            new_status = 'wip'

    if mca_case.status != new_status:
        mca_case.status = new_status
        mca_case.save(update_fields=['status', 'updated_at'])