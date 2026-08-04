# legal_services/views.py

from rest_framework import viewsets, parsers, generics, status as drf_status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import (
    TDSLitigation, IncomeTaxLitigation, MCACase, FEMACase, PartnershipCase,
    LegalCaseAuditLog, DocumentCategory, ClientCustomDocument,
    CourtCase, CourtCaseStatusLog, ReviewRequest,
)
from .serializers import (
    TDSLitigationSerializer, IncomeTaxLitigationSerializer,
    MCACaseSerializer, FEMACaseSerializer, PartnershipCaseSerializer,
    LegalCaseAuditLogSerializer,
    DocumentCategorySerializer, ClientCustomDocumentSerializer,
    CourtCaseSerializer,
    ReviewRequestSerializer,
)
from .permissions import (
    IsAdminOrAssignedOnly, IsMakerOrAdminEdit,
    ADMIN_ROLES, HIGH_ADMIN,
    is_admin_role, is_high_admin, is_founder,
    is_case_maker, is_case_checker,
)
from .mixins import RoleScopedQuerysetMixin
from .utils import log_shared_event, log_event

User = get_user_model()


# ═══════════════════════════════════════════════════════════════════
# HELPER — Extract audit context (litigation type + court case)
#          from request headers sent by frontend
# ═══════════════════════════════════════════════════════════════════
def _get_doc_context(request):
    litigation_type = request.headers.get('X-Litigation-Type')
    court_case_id = request.headers.get('X-Court-Case-Id')
    job_id = request.headers.get('X-Job-Id')   # ✅ NEW

    if not litigation_type:
        try:
            from .context import get_context
            ctx = get_context()
            litigation_type = ctx.get('litigation_type')
            court_case_id = court_case_id or ctx.get('court_case_id')
            job_id = job_id or ctx.get('job_id')   # ✅ ADD THIS LINE
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

    return litigation_type, court_case, job_id_int   # ✅ 3-tuple now


# ═══════════════════════════════════════════════════════════════════
# TDS LITIGATION VIEWSET
# ═══════════════════════════════════════════════════════════════════
class TDSLitigationViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = TDSLitigation.objects.select_related(
        'client', 'created_by'
    ).prefetch_related('assigned_to', 'makers', 'checkers').all()
    serializer_class = TDSLitigationSerializer
    permission_classes = [IsAdminOrAssignedOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    filterset_fields = ['client', 'status']

    @action(detail=True, methods=['post'], url_path='assign-mc')
    def assign_mc(self, request, pk=None):
        case = self.get_object()

        # Only Admin/Founder/Manager can assign
        if not is_admin_role(request.user):
            return Response({'error': 'Only Admin/Founder/Manager can assign Maker/Checker.'}, status=403)

        maker_ids = request.data.get('maker_ids', [])
        checker_ids = request.data.get('checker_ids', [])

        if len(maker_ids) > 2 or len(checker_ids) > 2:
            return Response({'error': 'Maximum 2 makers and 2 checkers allowed.'}, status=400)
        if set(maker_ids) & set(checker_ids):
            return Response({'error': 'A user cannot be both maker and checker.'}, status=400)

        def names_for(ids):
            return [u.get_full_name() or u.email for u in User.objects.filter(id__in=ids)]

        old_maker_names = names_for(case.makers.values_list('id', flat=True))
        old_checker_names = names_for(case.checkers.values_list('id', flat=True))

        case.makers.set(User.objects.filter(id__in=maker_ids))
        case.checkers.set(User.objects.filter(id__in=checker_ids))

        new_maker_names = names_for(maker_ids)
        new_checker_names = names_for(checker_ids)

        log_event(
            client_id=case.client_id, litigation_type='tds',
            event_type='assignment', title='Makers/Checkers updated', user=request.user,
            old_values={'makers': old_maker_names, 'checkers': old_checker_names},
            new_values={'makers': new_maker_names, 'checkers': new_checker_names},
        )

        return Response(self.get_serializer(case).data)


# ═══════════════════════════════════════════════════════════════════
# INCOME TAX LITIGATION VIEWSET
# ═══════════════════════════════════════════════════════════════════
class IncomeTaxLitigationViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = IncomeTaxLitigation.objects.select_related(
        'client', 'created_by'
    ).prefetch_related('assigned_to').all()
    serializer_class = IncomeTaxLitigationSerializer
    permission_classes = [IsAdminOrAssignedOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    filterset_fields = ['client', 'status']

    @action(detail=True, methods=['post'], url_path='assign-mc')
    def assign_mc(self, request, pk=None):
        case = self.get_object()

        if not is_admin_role(request.user):
            return Response({'error': 'Only Admin/Founder/Manager can assign Maker/Checker.'}, status=403)

        maker_ids = request.data.get('maker_ids', [])
        checker_ids = request.data.get('checker_ids', [])

        if len(maker_ids) > 2 or len(checker_ids) > 2:
            return Response({'error': 'Maximum 2 makers and 2 checkers allowed.'}, status=400)
        if set(maker_ids) & set(checker_ids):
            return Response({'error': 'A user cannot be both maker and checker.'}, status=400)

        def names_for(ids):
            return [u.get_full_name() or u.email for u in User.objects.filter(id__in=ids)]

        old_maker_names = names_for(case.makers.values_list('id', flat=True))
        old_checker_names = names_for(case.checkers.values_list('id', flat=True))

        case.makers.set(User.objects.filter(id__in=maker_ids))
        case.checkers.set(User.objects.filter(id__in=checker_ids))

        new_maker_names = names_for(maker_ids)
        new_checker_names = names_for(checker_ids)

        log_event(
            client_id=case.client_id, litigation_type='income-tax',
            event_type='assignment', title='Makers/Checkers updated', user=request.user,
            old_values={'makers': old_maker_names, 'checkers': old_checker_names},
            new_values={'makers': new_maker_names, 'checkers': new_checker_names},
        )

        return Response(self.get_serializer(case).data)


# ═══════════════════════════════════════════════════════════════════
# MCA / FEMA / PARTNERSHIP (future use — skeletons)
# ═══════════════════════════════════════════════════════════════════
class MCACaseViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = MCACase.objects.select_related('client', 'assigned_to', 'created_by').all()
    serializer_class = MCACaseSerializer
    permission_classes = [IsAdminOrAssignedOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]


class FEMACaseViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = FEMACase.objects.select_related('client', 'assigned_to', 'created_by').all()
    serializer_class = FEMACaseSerializer
    permission_classes = [IsAdminOrAssignedOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]


class PartnershipCaseViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = PartnershipCase.objects.select_related('client', 'assigned_to', 'created_by').all()
    serializer_class = PartnershipCaseSerializer
    permission_classes = [IsAdminOrAssignedOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]


# ═══════════════════════════════════════════════════════════════════
# DOCUMENT CATEGORY VIEWSET
# Anyone (Admin/Founder/Manager/Maker/Checker) can view.
# Maker: create labels + upload docs.
# Admin/Founder/Manager: delete labels + delete docs.
# Audit is SCOPED to the specific case where the user was working.
# ═══════════════════════════════════════════════════════════════════
class DocumentCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = DocumentCategory.objects.all().prefetch_related('documents').order_by('-created_at')
        client_id = self.request.query_params.get('client')
        court_case_id = self.request.query_params.get('court_case')
        job_id = self.request.query_params.get('job_id')   # ✅ NEW
        if client_id:
            qs = qs.filter(client_id=client_id)
        if court_case_id:
            qs = qs.filter(court_case_id=court_case_id)
        if job_id:                                          # ✅ NEW
            qs = qs.filter(job_id=job_id)
        return qs

    def perform_create(self, serializer):
        litigation_type, court_case, job_id = _get_doc_context(self.request)
        instance = serializer.save(court_case=court_case, job_id=job_id)   # ✅ job_id added
        if litigation_type:
            log_event(
                client_id=instance.client_id, litigation_type=litigation_type,
                court_case=court_case, job_id=job_id,   # ✅ NEW
                event_type='doc_upload', title=f'Label created: "{instance.label}"',
                description='New document label added', user=self.request.user,
                new_values={'label': instance.label},
            )

    def perform_destroy(self, instance):
        if not is_high_admin(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only Admin/Founder can delete labels.')
        litigation_type, court_case, job_id = _get_doc_context(self.request)
        doc_count = instance.documents.count()
        if litigation_type:
            log_event(
                client_id=instance.client_id, litigation_type=litigation_type,
                court_case=court_case, job_id=job_id,   # ✅ NEW
                event_type='doc_delete', title=f'Label deleted: "{instance.label}"',
                description=f'Label and {doc_count} file(s) removed', user=self.request.user,
                old_values={'label': instance.label, 'files_lost': str(doc_count)},
            )
        instance.delete()

# ═══════════════════════════════════════════════════════════════════
# CLIENT CUSTOM DOCUMENT VIEWSET
# Maker: upload documents.
# Admin/Founder/Manager: delete documents.
# Everyone assigned: view/download.
# ═══════════════════════════════════════════════════════════════════
class ClientCustomDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = ClientCustomDocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = ClientCustomDocument.objects.all()
        category_id = self.request.query_params.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        litigation_type, court_case, job_id = _get_doc_context(self.request)

        if litigation_type:
            log_event(
                client_id       = instance.category.client_id,
                litigation_type = litigation_type,
                court_case      = court_case,
                job_id          = job_id,
                event_type      = 'doc_upload',
                title           = f'Document uploaded: "{instance.document_name}"',
                description     = f'Uploaded to label: "{instance.category.label}"',
                user            = self.request.user,
                new_values      = {
                    'file_name': instance.document_name,
                    'label'    : instance.category.label,
                },
            )

    def perform_destroy(self, instance):
        # Only Admin/Founder/Manager can delete documents
        if not is_high_admin(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only Admin/Founder can delete documents.')

        litigation_type, court_case, job_id = _get_doc_context(self.request)

        if litigation_type:
            log_event(
                client_id       = instance.category.client_id,
                litigation_type = litigation_type,
                court_case      = court_case,
                job_id          = job_id,
                event_type      = 'doc_delete',
                title           = f'Document deleted: "{instance.document_name}"',
                description     = f'Removed from label: "{instance.category.label}"',
                user            = self.request.user,
                old_values      = {
                    'file_name': instance.document_name,
                    'label'    : instance.category.label,
                },
            )
        instance.delete()


# ═══════════════════════════════════════════════════════════════════
# HELPER — used by court case actions
# ═══════════════════════════════════════════════════════════════════
def _is_maker_or_admin(case, user):
    return is_case_maker(case, user) or is_admin_role(user)


# ═══════════════════════════════════════════════════════════════════
# COURT CASE VIEWSET
# ═══════════════════════════════════════════════════════════════════
class CourtCaseViewSet(viewsets.ModelViewSet):
    serializer_class = CourtCaseSerializer
    permission_classes = [IsMakerOrAdminEdit]

    def get_queryset(self):
        qs = CourtCase.objects.all().select_related('created_by').prefetch_related('makers', 'checkers', 'status_logs')
        user = self.request.user

        client_id = self.request.query_params.get('client')
        litigation_type = self.request.query_params.get('litigation_type')
        job_id = self.request.query_params.get('job_id')   # ✅ ADD THIS LINE

        if client_id:
            qs = qs.filter(client_id=client_id)
        if litigation_type:
            qs = qs.filter(litigation_type=litigation_type)
        if job_id:
            qs = qs.filter(job_id=job_id)

        if is_admin_role(user):
            return qs

        tds_client_ids = TDSLitigation.objects.filter(
            Q(makers=user) | Q(checkers=user)
        ).values_list('client_id', flat=True)
        it_client_ids = IncomeTaxLitigation.objects.filter(
            Q(makers=user) | Q(checkers=user)
        ).values_list('client_id', flat=True)

        return qs.filter(
            Q(litigation_type='tds', client_id__in=tds_client_ids) |
            Q(litigation_type='income-tax', client_id__in=it_client_ids)
        ).distinct()

    # ─────────────────────────────────────────────────────────────
    # CREATE CASE — Admin/Founder/Manager OR Assigned Maker
    # ─────────────────────────────────────────────────────────────
    def perform_create(self, serializer):
        user = self.request.user
        client_id = self.request.data.get('client')
        litigation_type = self.request.data.get('litigation_type', 'tds')
        job_id = self.request.data.get('job_id')  # ✅ NEW — id of the TDSLitigation/IncomeTaxLitigation job this case belongs to

        # Check if user is admin OR assigned maker on this client's litigation
        if not is_admin_role(user):
            if litigation_type == 'tds':
                is_maker = TDSLitigation.objects.filter(client_id=client_id, makers=user).exists()
            else:
                is_maker = IncomeTaxLitigation.objects.filter(client_id=client_id, makers=user).exists()

            if not is_maker:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Only Admin/Founder/Manager or assigned Maker can create a case.')

        instance = serializer.save(created_by=user, job_id=job_id)  # ✅ job_id saved on the CourtCase

        # Audit log
        log_event(
            client_id=instance.client_id,
            litigation_type=instance.litigation_type,
            court_case=instance,
            job_id=instance.job_id,  # ✅ NEW — scopes this audit entry to the exact job
            event_type='case_created',
            title=f'Case created: {instance.case_title}',
            description=f'Initial status: {instance.status}',
            user=user,
            new_values={'case_title': instance.case_title, 'status': instance.status},
        )

    # ─────────────────────────────────────────────────────────────
    # ASSIGN MAKER/CHECKER — Admin/Founder/Manager ONLY
    # ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='assign-mc')
    def assign_mc(self, request, pk=None):
        case = self.get_object()
        if not is_admin_role(request.user):
            return Response({'error': 'Only Admin/Founder/Manager can assign Maker/Checker.'}, status=403)

        maker_ids = request.data.get('maker_ids', [])
        checker_ids = request.data.get('checker_ids', [])

        if len(maker_ids) > 2 or len(checker_ids) > 2:
            return Response({'error': 'Maximum 2 makers and 2 checkers allowed.'}, status=400)
        if set(maker_ids) & set(checker_ids):
            return Response({'error': 'A user cannot be both maker and checker.'}, status=400)

        case.makers.set(User.objects.filter(id__in=maker_ids))
        case.checkers.set(User.objects.filter(id__in=checker_ids))
        return Response(self.get_serializer(case).data)

    # ─────────────────────────────────────────────────────────────
    # SET DESCRIPTION — Maker submits for review; Admin bypass
    # ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='set-description')
    def set_description(self, request, pk=None):
        case = self.get_object()
        user = request.user

        if not (is_admin_role(user) or is_case_maker(case, user)):
            return Response({'error': 'Only assigned Maker or Admin/Founder/Manager can edit the summary.'}, status=403)

        description = (request.data.get('description') or '').strip()

        if is_admin_role(user):
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
            return Response(self.get_serializer(case).data)

        review = _submit_review(case, 'summary', {'description': description}, user)
        return Response({
            'review_submitted': True,
            'review_id': review.id,
            'message': 'Summary submitted for checker review.',
            **self.get_serializer(case).data,
        })

    # ─────────────────────────────────────────────────────────────
    # ADD STEP (Daily Update) — Maker submits for review; Admin bypass
    # ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='add-step')
    def add_step(self, request, pk=None):
        case = self.get_object()
        user = request.user

        if not (is_admin_role(user) or is_case_maker(case, user)):
            return Response({'error': 'Only assigned Maker or Admin/Founder/Manager can add updates.'}, status=403)

        note = (request.data.get('note') or '').strip()
        if not note:
            return Response({'error': 'Note cannot be empty.'}, status=400)

        
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
        return Response(self.get_serializer(case).data)

        review = _submit_review(case, 'step', {'note': note}, user)
        return Response({
            'review_submitted': True,
            'review_id': review.id,
            'message': 'Daily update submitted for checker review.',
            **self.get_serializer(case).data,
        })

    # ─────────────────────────────────────────────────────────────
    # CHANGE STATUS — Assigned Maker or Admin
    # ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        case = self.get_object()
        user = request.user

        if not _is_maker_or_admin(case, user):
            return Response({'error': 'Only the assigned Maker or Admin/Founder/Manager can change status.'}, status=403)

        new_status = request.data.get('new_status')
        note = request.data.get('note', '')
        valid_statuses = dict(CourtCase.STATUS_CHOICES).keys()
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status.'}, status=400)

        if new_status == 'rejected' and not request.data.get('rejection_reason'):
            return Response({'error': 'Rejection reason is required.'}, status=400)
        if new_status == 'closed':
            if not request.data.get('close_reason'):
                return Response({'error': 'Close reason is required.'}, status=400)
            if not case.checker_approved_close:
                return Response({'error': 'Checker approval is required before closing.'}, status=400)

        old_status = case.status
        case.status = new_status
        if request.data.get('rejection_reason'):
            case.rejection_reason = request.data['rejection_reason']
        if request.data.get('close_reason'):
            case.close_reason = request.data['close_reason']
        if request.data.get('next_hearing_date'):
            case.next_hearing_date = request.data['next_hearing_date']
        case.save()

        CourtCaseStatusLog.objects.create(
            case=case, old_status=old_status, new_status=new_status,
            note=note, changed_by=user
        )
        return Response(self.get_serializer(case).data)

    # ─────────────────────────────────────────────────────────────
    # CHECKER FLAG — Only assigned Checker
    # ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='checker-flag')
    def checker_flag(self, request, pk=None):
        case = self.get_object()
        user = request.user
        if not is_case_checker(case, user):
            return Response({'error': 'Only an assigned Checker can flag this case.'}, status=403)

        case.checker_flagged = bool(request.data.get('flagged', True))
        case.checker_flag_note = request.data.get('note', '')
        case.save()

        CourtCaseStatusLog.objects.create(
            case=case, old_status=case.status, new_status=case.status,
            note=f"Checker flagged: {case.checker_flag_note}", changed_by=user
        )
        return Response(self.get_serializer(case).data)

    # ─────────────────────────────────────────────────────────────
    # CHECKER APPROVE CLOSE — Only assigned Checker
    # ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='checker-approve-close')
    def checker_approve_close(self, request, pk=None):
        case = self.get_object()
        user = request.user
        if not is_case_checker(case, user):
            return Response({'error': 'Only an assigned Checker can approve closing.'}, status=403)

        case.checker_approved_close = True
        case.save()
        CourtCaseStatusLog.objects.create(
            case=case, old_status=case.status, new_status=case.status,
            note='Checker approved closing this case', changed_by=user
        )
        return Response(self.get_serializer(case).data)

    # ─────────────────────────────────────────────────────────────
    # LEGACY — SUBMIT TO COURT / COURT RESPONSE / HEARING OUTCOME
    # (kept for backward compatibility)
    # ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='submit-to-court')
    def submit_to_court(self, request, pk=None):
        case = self.get_object()
        user = request.user
        if not _is_maker_or_admin(case, user):
            return Response({'error': 'Only the assigned Maker or Admin/Founder/Manager can submit this case.'}, status=403)
        if case.status != 'wip':
            return Response({'error': 'Case must be WIP to submit to court.'}, status=400)
        if case.submitted_to_court and case.court_response == 'pending':
            return Response({'error': 'Case is already awaiting a court response.'}, status=400)

        case.submitted_to_court = True
        case.court_response = 'pending'
        case.save(update_fields=['submitted_to_court', 'court_response', 'updated_at'])
        CourtCaseStatusLog.objects.create(
            case=case, old_status='wip', new_status='wip',
            note='Submitted to court — pending acceptance', changed_by=user
        )
        return Response(self.get_serializer(case).data)

    @action(detail=True, methods=['post'], url_path='court-response')
    def court_response_action(self, request, pk=None):
        case = self.get_object()
        user = request.user
        if not _is_maker_or_admin(case, user):
            return Response({'error': 'Only the assigned Maker or Admin/Founder/Manager can log the court response.'}, status=403)
        if not (case.submitted_to_court and case.court_response == 'pending'):
            return Response({'error': 'Case is not currently awaiting a court response.'}, status=400)

        response_value = request.data.get('response')

        if response_value == 'rejected':
            reason = request.data.get('rejection_reason')
            if not reason:
                return Response({'error': 'Rejection reason is required.'}, status=400)
            case.court_response = 'rejected'
            case.rejection_reason = reason
            case.submitted_to_court = False
            case.save(update_fields=['court_response', 'rejection_reason', 'submitted_to_court', 'updated_at'])
            CourtCaseStatusLog.objects.create(
                case=case, old_status='wip', new_status='wip',
                note=f'Court rejected submission: {reason}', changed_by=user
            )
            return Response(self.get_serializer(case).data)

        if response_value == 'accepted':
            next_date = request.data.get('next_hearing_date')
            if not next_date:
                return Response({'error': 'Next hearing date is required when the court accepts.'}, status=400)
            old_status = case.status
            case.court_response = 'accepted'
            case.next_hearing_date = next_date
            case.status = 'open'
            case.save(update_fields=['court_response', 'next_hearing_date', 'status', 'updated_at'])
            CourtCaseStatusLog.objects.create(
                case=case, old_status=old_status, new_status='open',
                note='Court accepted — hearing scheduled', changed_by=user
            )
            return Response(self.get_serializer(case).data)

        return Response({'error': "response must be 'accepted' or 'rejected'."}, status=400)

    @action(detail=True, methods=['post'], url_path='log-hearing-outcome')
    def log_hearing_outcome(self, request, pk=None):
        case = self.get_object()
        user = request.user
        if not _is_maker_or_admin(case, user):
            return Response({'error': 'Only the assigned Maker or Admin/Founder/Manager can log a hearing outcome.'}, status=403)
        if case.status != 'wip':
            return Response({'error': 'Hearing outcomes can only be logged while the case is WIP.'}, status=400)
        if not (case.submitted_to_court and case.court_response == 'accepted'):
            return Response({'error': 'This case has no pending hearing outcome to log.'}, status=400)

        outcome = request.data.get('outcome')

        if outcome == 'next_date':
            next_date = request.data.get('next_hearing_date')
            if not next_date:
                return Response({'error': 'Next hearing date is required.'}, status=400)
            case.next_hearing_date = next_date
            case.status = 'open'
            case.save(update_fields=['next_hearing_date', 'status', 'updated_at'])
            CourtCaseStatusLog.objects.create(
                case=case, old_status='wip', new_status='open',
                note=request.data.get('note', 'Hearing adjourned — new date set'), changed_by=user
            )
            return Response(self.get_serializer(case).data)

        if outcome == 'disposed':
            close_reason = request.data.get('close_reason')
            if not close_reason:
                return Response({'error': 'Close reason is required.'}, status=400)
            if not case.checker_approved_close:
                return Response({'error': 'Checker approval is required before closing.'}, status=400)
            case.status = 'closed'
            case.close_reason = close_reason
            case.save(update_fields=['status', 'close_reason', 'updated_at'])
            CourtCaseStatusLog.objects.create(
                case=case, old_status='wip', new_status='closed',
                note=close_reason, changed_by=user
            )
            return Response(self.get_serializer(case).data)

        return Response({'error': "outcome must be 'next_date' or 'disposed'."}, status=400)

    # ─────────────────────────────────────────────────────────────
    # SUBMIT APPEAL — Maker submits for review; Admin bypass
    # ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='submit-appeal')
    def submit_appeal(self, request, pk=None):
        case = self.get_object()
        user = request.user

        if not (is_admin_role(user) or is_case_maker(case, user)):
            return Response({'error': 'Not authorized.'}, status=403)

        data = request.data
        note = (data.get('note') or '').strip()
        if not note:
            return Response({'error': 'Description is required.'}, status=400)

        payload = {
            'case_title':        data.get('case_title', ''),
            'court_name':        data.get('court_name', ''),
            'case_number':       data.get('case_number', ''),
            'case_type':         data.get('case_type', ''),
            'appeal_stage':      data.get('appeal_stage', ''),
            'next_hearing_date': data.get('next_hearing_date', ''),
            'note':              note,
        }

        if is_admin_role(user):
            fake_review = ReviewRequest(court_case=case, action_type='appeal',
                                        payload=payload, submitted_by=user)
            _apply_review_action(fake_review)
            return Response(self.get_serializer(case).data)

        review = _submit_review(case, 'appeal', payload, user)
        return Response({
            'review_submitted': True,
            'review_id': review.id,
            'message': 'Appeal submitted for checker review.',
            **self.get_serializer(case).data,
        })

    # ─────────────────────────────────────────────────────────────
    # LOG ADJOURNMENT — Maker submits for review; Admin bypass
    # ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='log-adjournment')
    def log_adjournment(self, request, pk=None):
        case = self.get_object()
        user = request.user

        if not (is_admin_role(user) or is_case_maker(case, user)):
            return Response({'error': 'Not authorized.'}, status=403)

        data = request.data
        reason = (data.get('reason') or '').strip() or None
        new_date = (data.get('next_hearing_date') or '').strip() or None
        comment = (data.get('comment') or '').strip()

        if not reason:
            return Response({'error': 'Reason is required.'}, status=400)
        if not new_date:
            return Response({'error': 'New date is required.'}, status=400)
        if not comment:
            return Response({'error': 'Description is required.'}, status=400)

        payload = {
            'postpone_type':     data.get('postpone_type', 'adjournment'),
            'reason':            reason,
            'next_hearing_date': new_date,
            'comment':           comment,
            'case_number':       (data.get('case_number') or '').strip(),
            'court_name':        (data.get('court_name') or '').strip(),
        }

        if is_admin_role(user):
            fake_review = ReviewRequest(court_case=case, action_type='adjournment',
                                        payload=payload, submitted_by=user)
            _apply_review_action(fake_review)
            return Response(self.get_serializer(case).data)

        review = _submit_review(case, 'adjournment', payload, user)
        return Response({
            'review_submitted': True,
            'review_id': review.id,
            'message': 'Adjournment submitted for checker review.',
            **self.get_serializer(case).data,
        })

    # ─────────────────────────────────────────────────────────────
    # LOG OUTCOME — ONLY Admin/Founder
    # ─────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='log-outcome')
    def log_outcome(self, request, pk=None):
        case = self.get_object()
        user = request.user

        if not is_high_admin(user):
            return Response({'error': 'Only Admin/Founder can log hearing outcome.'}, status=403)

        data = request.data
        outcome = data.get('outcome')
        if outcome not in ('won', 'lost'):
            return Response({'error': "outcome must be 'won' or 'lost'."}, status=400)

        old_status = case.status

        if outcome == 'won':
            judgement = (data.get('judgement_info') or '').strip()
            if not judgement:
                return Response({'error': 'Judgement details are required.'}, status=400)
            case.status = 'closed'
            case.close_reason = judgement
            case.save()
            CourtCaseStatusLog.objects.create(
                case=case, event_type='outcome_won',
                old_status=old_status, new_status='closed',
                note=judgement, judgement_info=judgement,
                changed_by=user,
            )
        else:
            next_action = data.get('next_action')
            comment = (data.get('comment') or '').strip()
            if next_action not in ('appeal', 'leave'):
                return Response({'error': "next_action must be 'appeal' or 'leave'."}, status=400)
            if not comment:
                return Response({'error': 'Comment is required.'}, status=400)

            if next_action == 'leave':
                case.status = 'closed'
                case.close_reason = comment or 'Case lost — not pursuing further'
            else:
                case.status = 'wip'
            case.save()

            CourtCaseStatusLog.objects.create(
                case=case, event_type='outcome_lost',
                old_status=old_status, new_status=case.status,
                note=comment, next_action=next_action,
                changed_by=user,
            )
        return Response(self.get_serializer(case).data)


# ═══════════════════════════════════════════════════════════════════
# LEGAL AUDIT TRAIL VIEW
# Job-specific: only shows events for the selected case + shared info edits.
# ═══════════════════════════════════════════════════════════════════

class LegalAuditTrailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        client_id = request.query_params.get('client')
        litigation_type = request.query_params.get('litigation_type')
        court_case_id = request.query_params.get('court_case')
        job_id = request.query_params.get('job_id')

        qs = LegalCaseAuditLog.objects.select_related('by', 'court_case').order_by('-created_at')

        if client_id:
            qs = qs.filter(client_id=client_id)
        if litigation_type:
            qs = qs.filter(litigation_type=litigation_type)

        # ✅ CHANGED — strict job scoping, no more cross-job leakage
        if job_id:
            qs = qs.filter(job_id=job_id)
        elif court_case_id:
            qs = qs.filter(court_case_id=court_case_id)

        serializer = LegalCaseAuditLogSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)






# ═══════════════════════════════════════════════════════════════════
# REVIEW WORKFLOW HELPERS
# ═══════════════════════════════════════════════════════════════════
def _submit_review(case, action_type, payload, user):
    """Create a pending ReviewRequest for maker actions."""
    return ReviewRequest.objects.create(
        court_case=case,
        action_type=action_type,
        payload=payload,
        status='pending',
        submitted_by=user,
    )


def _apply_review_action(review):
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

    if review.action_type == 'appeal':
        if data.get('case_title'):    case.case_title = data['case_title']
        if data.get('court_name'):    case.court_name = data['court_name']
        if data.get('case_number'):   case.case_number = data['case_number']
        if data.get('case_type'):     case.case_type = data['case_type']
        if data.get('appeal_stage'):  case.appeal_stage = data['appeal_stage']
        if data.get('next_hearing_date'):
            case.next_hearing_date = data['next_hearing_date']

        old_status = case.status
        case.status = 'open'
        case.submitted_to_court = True
        case.save()

        CourtCaseStatusLog.objects.create(
            case=case, event_type='appeal',
            old_status=old_status, new_status='open',
            note=data.get('note', ''),
            case_number=case.case_number,
            court_name=case.court_name,
            case_type=case.case_type,
            appeal_stage=case.appeal_stage,
            next_hearing_date=case.next_hearing_date,
            changed_by=user,
        )
        log_event(
            client_id=case.client_id, litigation_type=case.litigation_type,
            court_case=case, event_type='activity_update',
            title=f'Appeal filed (approved) — {case.court_name or "Court"}',
            description=data.get('note', '')[:200], user=user,
        )
        return

    if review.action_type == 'adjournment':
        old_hearing = case.next_hearing_date
        old_status = case.status

        reason = data.get('reason')
        new_date = data.get('next_hearing_date')
        comment = data.get('comment', '')
        postpone_type = data.get('postpone_type', 'adjournment')

        case.adjourned_date = old_hearing
        case.next_hearing_date = new_date
        case.adjournment_reason = reason
        if data.get('case_number'):
            case.case_number = data['case_number']
        if data.get('court_name'):
            case.court_name = data['court_name']
        case.status = 'open'
        case.save()

        type_label = {
            'adjournment': 'Adjourned',
            'extension':   'Deadline Extended',
            'transfer':    'Transferred to Different Court',
        }.get(postpone_type, 'Postponed')

        CourtCaseStatusLog.objects.create(
            case=case, event_type='adjournment',
            old_status=old_status, new_status='open',
            note=f"[{type_label}] {comment}",
            adjournment_reason=reason,
            adjourned_date=old_hearing,
            next_hearing_date=new_date,
            case_number=case.case_number,
            court_name=case.court_name,
            changed_by=user,
        )
        log_event(
            client_id=case.client_id, litigation_type=case.litigation_type,
            court_case=case, event_type='activity_update',
            title=f'Hearing {type_label.lower()} (approved)',
            description=comment[:200], user=user,
        )
        return


# ═══════════════════════════════════════════════════════════════════
# REVIEW REQUEST VIEWSET
# ═══════════════════════════════════════════════════════════════════
class ReviewRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /reviews/                  → list (filtered by role + query params)
    GET  /reviews/{id}/             → single review
    POST /reviews/{id}/approve/     → approve + apply action
    POST /reviews/{id}/reject/      → reject with reason
    POST /reviews/{id}/escalate/    → move to founder (checker only)
    GET  /reviews/pending-for-me/   → my inbox
    """
    serializer_class = ReviewRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ReviewRequest.objects.select_related(
            'court_case', 'court_case__client', 'submitted_by', 'reviewed_by'
        )

        case_id = self.request.query_params.get('court_case')
        client_id = self.request.query_params.get('client')
        status_filter = self.request.query_params.get('status')
        litigation_type = self.request.query_params.get('litigation_type')

        if case_id:
            qs = qs.filter(court_case_id=case_id)
        if client_id:
            qs = qs.filter(court_case__client_id=client_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if litigation_type:
            qs = qs.filter(court_case__litigation_type=litigation_type)

        # Admins see everything
        if is_admin_role(user):
            return qs

        # ── Non-admins: include reviews on cases they're assigned to
        # via parent Litigation (since CourtCase.makers/checkers may be empty
        # while TDS/IT Litigation.makers/checkers hold the actual assignments)
        tds_client_ids = TDSLitigation.objects.filter(
            Q(makers=user) | Q(checkers=user)
        ).values_list('client_id', flat=True)

        it_client_ids = IncomeTaxLitigation.objects.filter(
            Q(makers=user) | Q(checkers=user)
        ).values_list('client_id', flat=True)

        return qs.filter(
            Q(submitted_by=user) |
            Q(court_case__checkers=user) |
            Q(court_case__makers=user) |
            Q(court_case__litigation_type='tds', court_case__client_id__in=tds_client_ids) |
            Q(court_case__litigation_type='income-tax', court_case__client_id__in=it_client_ids)
        ).distinct()

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        review = self.get_object()
        user = request.user

        if review.status not in ('pending', 'escalated'):
            return Response({'error': f'Cannot approve a review with status "{review.status}".'}, status=400)

        case = review.court_case
        if review.status == 'escalated':
            if not is_high_admin(user):
                return Response({'error': 'Only Admin/Founder can approve escalated reviews.'}, status=403)
        else:
            if not (is_admin_role(user) or is_case_checker(case, user)):
                return Response({'error': 'Only assigned Checker or Admin/Founder/Manager can approve.'}, status=403)

        _apply_review_action(review)

        review.status = 'approved'
        review.reviewed_by = user
        review.reviewed_at = timezone.now()
        review.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        return Response(ReviewRequestSerializer(review, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        review = self.get_object()
        user = request.user
        reason = (request.data.get('reason') or '').strip()

        if not reason:
            return Response({'error': 'Rejection reason is required.'}, status=400)

        if review.status not in ('pending', 'escalated'):
            return Response({'error': f'Cannot reject a review with status "{review.status}".'}, status=400)

        case = review.court_case
        if review.status == 'escalated':
            if not is_high_admin(user):
                return Response({'error': 'Only Admin/Founder can reject escalated reviews.'}, status=403)
        else:
            if not (is_admin_role(user) or is_case_checker(case, user)):
                return Response({'error': 'Only assigned Checker or Admin/Founder/Manager can reject.'}, status=403)

        review.status = 'rejected'
        review.reviewed_by = user
        review.reviewed_at = timezone.now()
        review.review_note = reason
        review.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_note'])

        return Response(ReviewRequestSerializer(review, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='escalate')
    def escalate(self, request, pk=None):
        review = self.get_object()
        user = request.user

        if review.status != 'pending':
            return Response({'error': 'Only pending reviews can be escalated.'}, status=400)

        case = review.court_case
        if not (is_case_checker(case, user) or is_admin_role(user)):
            return Response({'error': 'Only assigned Checker can escalate to Founder.'}, status=403)

        review.status = 'escalated'
        review.escalated_to_founder = True
        review.save(update_fields=['status', 'escalated_to_founder'])

        return Response(ReviewRequestSerializer(review, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path='pending-for-me')
    def pending_for_me(self, request):
        user = request.user
        qs = ReviewRequest.objects.select_related(
            'court_case', 'court_case__client', 'submitted_by'
        )

        if is_founder(user) or getattr(user, 'is_superuser', False):
            # Founder sees escalated + all pending
            qs = qs.filter(Q(status='pending') | Q(status='escalated'))
        elif is_admin_role(user):
            # Admin/Manager see pending + escalated
            qs = qs.filter(Q(status='pending') | Q(status='escalated'))
        else:
            # Checker sees pending on cases they're assigned to (via Litigation)
            tds_client_ids = TDSLitigation.objects.filter(
                checkers=user
            ).values_list('client_id', flat=True)
            it_client_ids = IncomeTaxLitigation.objects.filter(
                checkers=user
            ).values_list('client_id', flat=True)

            qs = qs.filter(status='pending').filter(
                Q(court_case__checkers=user) |
                Q(court_case__litigation_type='tds', court_case__client_id__in=tds_client_ids) |
                Q(court_case__litigation_type='income-tax', court_case__client_id__in=it_client_ids)
            ).distinct()

        return Response(ReviewRequestSerializer(qs, many=True, context={'request': request}).data)