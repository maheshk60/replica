# legal_services/litigation/helpers.py
"""
Litigation-specific helpers.
Pure functions — no HTTP, no Response objects. Called from views + actions.
"""

from django.contrib.auth import get_user_model
from ..models import (
    CourtCase, CourtCaseStatusLog, ReviewRequest, CaseNotice,
)
from ..permissions import is_admin_role, is_case_maker
from ..utils import log_event

User = get_user_model()


# ─────────────────────────────────────────────────────────────
# CONTEXT EXTRACTION
# ─────────────────────────────────────────────────────────────
def get_doc_context(request):
    """Extract audit context (litigation_type / court_case / job_id) from
    request headers, falling back to thread-local context."""
    litigation_type = request.headers.get('X-Litigation-Type')
    court_case_id = request.headers.get('X-Court-Case-Id')
    job_id = request.headers.get('X-Job-Id')

    if not litigation_type:
        try:
            from ..context import get_context
            ctx = get_context()
            litigation_type = ctx.get('litigation_type')
            court_case_id = court_case_id or ctx.get('court_case_id')
            job_id = job_id or ctx.get('job_id')
        except Exception:
            pass

    court_case = None
    if court_case_id:
        try:
            court_case = CourtCase.objects.filter(id=int(court_case_id)).first()
        except Exception:
            court_case = None

    job_id_int = None
    if job_id:
        try:
            job_id_int = int(job_id)
        except Exception:
            job_id_int = None

    return litigation_type, court_case, job_id_int


# ─────────────────────────────────────────────────────────────
# PERMISSION HELPERS
# ─────────────────────────────────────────────────────────────
def is_maker_or_admin(case, user):
    return is_case_maker(case, user) or is_admin_role(user)


def names_for(user_ids):
    return [u.get_full_name() or u.email for u in User.objects.filter(id__in=user_ids)]


# ─────────────────────────────────────────────────────────────
# STATUS COMPUTATION
# ─────────────────────────────────────────────────────────────
def update_notice_status_from_workflow(notice):
    """Auto-computes notice status based on workflow state."""
    has_pending_reply = notice.replies.filter(
        status__in=['pending', 'escalated']
    ).exists()

    has_pending_doc_reply = notice.documents.filter(
        doc_type__in=['pending', 'reply'],
        review_status__in=['pending', 'escalated']
    ).exists()

    has_pending_ack = notice.documents.filter(
        doc_type='acknowledgment',
        review_status__in=['pending', 'escalated']
    ).exists()

    has_pending_edit = ReviewRequest.objects.filter(
        court_case=notice.court_case,
        action_type='notice_edit',
        status__in=['pending', 'escalated'],
        payload__notice_id=notice.id,
    ).exists()

    if has_pending_reply or has_pending_doc_reply or has_pending_ack or has_pending_edit:
        new_status = 'under_review'
    else:
        has_approved_ack = notice.documents.filter(
            doc_type='acknowledgment',
            review_status='approved'
        ).exists()

        if has_approved_ack:
            new_status = 'open'
        else:
            new_status = 'wip'

    if notice.status != new_status:
        notice.status = new_status
        notice.save(update_fields=['status', 'updated_at'])


def recompute_court_case_status(court_case):
    """Recomputes court case status from notices.
    NOTE: 'closed' is only set via closure bundle workflow."""
    if court_case.status == 'closed':
        return

    notices = court_case.notices.all()
    if not notices.exists():
        return

    statuses = set(n.status for n in notices)

    if 'wip' in statuses or 'under_review' in statuses:
        new_status = 'wip'
    elif statuses == {'open'}:
        new_status = 'open'
    else:
        new_status = 'wip'

    if court_case.status != new_status:
        court_case.status = new_status
        court_case.save(update_fields=['status', 'updated_at'])


# ─────────────────────────────────────────────────────────────
# REVIEW WORKFLOW HELPERS
# ─────────────────────────────────────────────────────────────
def create_review_request(case, action_type, payload, user):
    """Create a pending ReviewRequest for maker actions."""
    return ReviewRequest.objects.create(
        court_case=case,
        action_type=action_type,
        payload=payload,
        status='pending',
        submitted_by=user,
    )


def apply_review_action(review):
    """Apply the maker's stored action when approved."""
    case = review.court_case
    user = review.submitted_by
    data = review.payload or {}

    if review.action_type == 'summary':
        case.job_description = data.get('description', '').strip()
        case.save(update_fields=['job_description', 'updated_at'])
        CourtCaseStatusLog.objects.create(
            case=case, event_type='description',
            old_status=case.status, new_status=case.status,
            note=case.job_description or 'Summary cleared',
            changed_by=user,
        )
        log_event(
            client_id=case.client_id, litigation_type=case.litigation_type,
            court_case=case, event_type='activity_update',
            title='Case summary updated (approved)',
            description=case.job_description[:200], user=user,
        )
        return

    if review.action_type == 'step':
        note = data.get('note', '').strip()
        CourtCaseStatusLog.objects.create(
            case=case, event_type='step',
            old_status=case.status, new_status=case.status,
            note=note, changed_by=user,
        )
        log_event(
            client_id=case.client_id, litigation_type=case.litigation_type,
            court_case=case, event_type='activity_update',
            title='Daily update added (approved)',
            description=note[:200], user=user,
        )
        return

    if review.action_type == 'notice_edit':
        notice_id = data.get('notice_id')
        if not notice_id:
            return
        try:
            notice = CaseNotice.objects.get(id=notice_id)
        except CaseNotice.DoesNotExist:
            return

        old_values = data.get('old_values', {})
        new_values = data.get('new_values', {})
        changed_fields = data.get('changed_fields', [])

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
        return