# legal_services/views.py
from rest_framework import viewsets, parsers
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
    LegalCaseAuditLog, CourtCase, ReviewRequest, CaseNotice,
    NoticeDocument, NoticeReply, CaseClosureDocument,MCAFiling, MCAFilingDocument,
)
from .serializers import (
    TDSLitigationSerializer, IncomeTaxLitigationSerializer,
    MCACaseSerializer, FEMACaseSerializer, PartnershipCaseSerializer,
    LegalCaseAuditLogSerializer,
    CourtCaseSerializer, CaseClosureDocumentSerializer,
    ReviewRequestSerializer, CaseNoticeSerializer,
    NoticeDocumentSerializer, NoticeReplySerializer,MCAFilingSerializer, MCAFilingDocumentSerializer,
)
from .permissions import (
    IsAdminOrAssignedOnly, IsMakerOrAdminEdit,
    is_admin_role, is_high_admin, is_founder,
    is_case_maker, is_case_checker,
)
from .mixins import RoleScopedQuerysetMixin

from .litigation import helpers as lh
from .litigation import actions as la
from .mca import helpers as mh  # <-- MOVE MCA IMPORTS TO TOP
from .mca import actions as ma 

User = get_user_model()


# ═══════════════════════════════════════════════════════════════════
# TDS LITIGATION VIEWSET
# ═══════════════════════════════════════════════════════════════════
class TDSLitigationViewSet(viewsets.ModelViewSet):
    serializer_class = TDSLitigationSerializer
    permission_classes = [IsAdminOrAssignedOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filterset_fields = ['client', 'status']

    def get_queryset(self):
        qs = TDSLitigation.objects.select_related(
            'client', 'created_by', 'sub_service', 'task'
        ).prefetch_related('assigned_to', 'makers', 'checkers').all()

        client = self.request.query_params.get('client')
        if client:
            qs = qs.filter(client_id=client)

        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)

        user = self.request.user
        if is_admin_role(user):
            return qs
        return qs.filter(Q(makers=user) | Q(checkers=user)).distinct()

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

        la.assign_makers_checkers(case, maker_ids, checker_ids, 'tds', request.user)
        return Response(self.get_serializer(case).data)


# ═══════════════════════════════════════════════════════════════════
# INCOME TAX LITIGATION VIEWSET
# ═══════════════════════════════════════════════════════════════════
class IncomeTaxLitigationViewSet(viewsets.ModelViewSet):
    serializer_class = IncomeTaxLitigationSerializer
    permission_classes = [IsAdminOrAssignedOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filterset_fields = ['client', 'status']

    def get_queryset(self):
        qs = IncomeTaxLitigation.objects.select_related(
            'client', 'created_by', 'sub_service', 'task'
        ).prefetch_related('assigned_to', 'makers', 'checkers').all()

        client = self.request.query_params.get('client')
        if client:
            qs = qs.filter(client_id=client)

        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)

        user = self.request.user
        if is_admin_role(user):
            return qs
        return qs.filter(Q(makers=user) | Q(checkers=user)).distinct()

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

        la.assign_makers_checkers(case, maker_ids, checker_ids, 'income-tax', request.user)
        return Response(self.get_serializer(case).data)


# ═══════════════════════════════════════════════════════════════════
# MCA / FEMA / PARTNERSHIP (unchanged skeletons)
# ═══════════════════════════════════════════════════════════════════

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
# COURT CASE VIEWSET
# ═══════════════════════════════════════════════════════════════════
class CourtCaseViewSet(viewsets.ModelViewSet):
    serializer_class = CourtCaseSerializer
    permission_classes = [IsMakerOrAdminEdit]

    def get_queryset(self):
        qs = CourtCase.objects.all().select_related(
            'created_by', 'client'
        ).prefetch_related('makers', 'checkers', 'status_logs', 'notices')

        user = self.request.user
        client_id = self.request.query_params.get('client')
        litigation_type = self.request.query_params.get('litigation_type')
        job_id = self.request.query_params.get('job_id')

        if client_id:
            qs = qs.filter(client_id=client_id)
        if litigation_type:
            qs = qs.filter(litigation_type=litigation_type)
        if job_id:
            qs = qs.filter(job_id=job_id)

        if is_admin_role(user):
            return qs

        tds_job_ids = TDSLitigation.objects.filter(
            Q(makers=user) | Q(checkers=user)
        ).values_list('id', flat=True)
        it_job_ids = IncomeTaxLitigation.objects.filter(
            Q(makers=user) | Q(checkers=user)
        ).values_list('id', flat=True)

        return qs.filter(
            Q(litigation_type='tds', job_id__in=tds_job_ids) |
            Q(litigation_type='income-tax', job_id__in=it_job_ids)
        ).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        client_id = self.request.data.get('client')
        litigation_type = self.request.data.get('litigation_type', 'tds')
        job_id = self.request.data.get('job_id')

        if not is_admin_role(user):
            if litigation_type == 'tds':
                is_maker = TDSLitigation.objects.filter(client_id=client_id, makers=user).exists()
            else:
                is_maker = IncomeTaxLitigation.objects.filter(client_id=client_id, makers=user).exists()

            if not is_maker:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Only Admin/Founder/Manager or assigned Maker can create a case.')

        instance = serializer.save(created_by=user, job_id=job_id)
        la.log_court_case_created(instance, user)

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

        la.assign_court_case_mc(case, maker_ids, checker_ids)
        return Response(self.get_serializer(case).data)

    @action(detail=True, methods=['post'], url_path='set-description')
    def set_description(self, request, pk=None):
        case = self.get_object()
        user = request.user

        if not (is_admin_role(user) or is_case_maker(case, user)):
            return Response({'error': 'Only assigned Maker or Admin/Founder/Manager can edit the summary.'}, status=403)

        description = (request.data.get('description') or '').strip()

        if is_admin_role(user):
            la.apply_case_summary_directly(case, description, user)
            return Response(self.get_serializer(case).data)

        review = lh.create_review_request(case, 'summary', {'description': description}, user)
        return Response({
            'review_submitted': True,
            'review_id': review.id,
            'message': 'Summary submitted for checker review.',
            **self.get_serializer(case).data,
        })

    @action(detail=True, methods=['post'], url_path='add-step')
    def add_step(self, request, pk=None):
        case = self.get_object()
        user = request.user

        if not (is_admin_role(user) or is_case_maker(case, user)):
            return Response({'error': 'Only assigned Maker or Admin/Founder/Manager can add updates.'}, status=403)

        note = (request.data.get('note') or '').strip()
        if not note:
            return Response({'error': 'Note cannot be empty.'}, status=400)

        la.add_case_daily_step(case, note, user)
        return Response(self.get_serializer(case).data)

    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        case = self.get_object()
        user = request.user

        if not lh.is_maker_or_admin(case, user):
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

        la.change_case_status(
            case, new_status, note,
            request.data.get('rejection_reason'),
            request.data.get('close_reason'),
            request.data.get('next_hearing_date'),
            user,
        )
        return Response(self.get_serializer(case).data)

    @action(detail=True, methods=['post'], url_path='checker-flag')
    def checker_flag(self, request, pk=None):
        case = self.get_object()
        user = request.user
        if not is_case_checker(case, user):
            return Response({'error': 'Only an assigned Checker can flag this case.'}, status=403)

        la.set_case_checker_flag(case, request.data.get('flagged', True), request.data.get('note', ''), user)
        return Response(self.get_serializer(case).data)

    @action(detail=True, methods=['post'], url_path='checker-approve-close')
    def checker_approve_close(self, request, pk=None):
        case = self.get_object()
        user = request.user
        if not is_case_checker(case, user):
            return Response({'error': 'Only an assigned Checker can approve closing.'}, status=403)

        la.set_case_checker_approve_close(case, user)
        return Response(self.get_serializer(case).data)


# ═══════════════════════════════════════════════════════════════════
# LEGAL AUDIT TRAIL VIEW
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
        if job_id:
            qs = qs.filter(job_id=job_id)
        elif court_case_id:
            qs = qs.filter(court_case_id=court_case_id)

        serializer = LegalCaseAuditLogSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)


# ═══════════════════════════════════════════════════════════════════
# REVIEW REQUEST VIEWSET
# ═══════════════════════════════════════════════════════════════════
class ReviewRequestViewSet(viewsets.ReadOnlyModelViewSet):
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

        if is_admin_role(user):
            return qs

        tds_job_ids = TDSLitigation.objects.filter(
            Q(makers=user) | Q(checkers=user)
        ).values_list('id', flat=True)
        it_job_ids = IncomeTaxLitigation.objects.filter(
            Q(makers=user) | Q(checkers=user)
        ).values_list('id', flat=True)

        return qs.filter(
            Q(submitted_by=user) |
            Q(court_case__litigation_type='tds', court_case__job_id__in=tds_job_ids) |
            Q(court_case__litigation_type='income-tax', court_case__job_id__in=it_job_ids)
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

        la.approve_review_request(review, user)
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

        la.reject_review_request(review, reason, user)
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

        la.escalate_review_request(review, user)
        return Response(ReviewRequestSerializer(review, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path='pending-for-me')
    def pending_for_me(self, request):
        user = request.user
        qs = ReviewRequest.objects.select_related(
            'court_case', 'court_case__client', 'submitted_by'
        )

        if is_founder(user) or getattr(user, 'is_superuser', False):
            qs = qs.filter(Q(status='pending') | Q(status='escalated'))
        elif is_admin_role(user):
            qs = qs.filter(Q(status='pending') | Q(status='escalated'))
        else:
            tds_job_ids = TDSLitigation.objects.filter(checkers=user).values_list('id', flat=True)
            it_job_ids = IncomeTaxLitigation.objects.filter(checkers=user).values_list('id', flat=True)

            qs = qs.filter(status='pending').filter(
                Q(court_case__litigation_type='tds', court_case__job_id__in=tds_job_ids) |
                Q(court_case__litigation_type='income-tax', court_case__job_id__in=it_job_ids)
            ).distinct()

        return Response(ReviewRequestSerializer(qs, many=True, context={'request': request}).data)


# ═══════════════════════════════════════════════════════════════════
# LEGAL CLIENT DETAIL VIEW (unchanged)
# ═══════════════════════════════════════════════════════════════════
class LegalClientDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        from clients.models import Client
        try:
            client = Client.objects.select_related('constitution').get(id=client_id)
        except Client.DoesNotExist:
            return Response({'error': 'Client not found'}, status=404)

        user = request.user
        if not is_admin_role(user):
            has_access = (
                TDSLitigation.objects.filter(client=client).filter(Q(makers=user) | Q(checkers=user)).exists()
                or
                IncomeTaxLitigation.objects.filter(client=client).filter(Q(makers=user) | Q(checkers=user)).exists()
            )
            if not has_access:
                return Response({'error': 'Not authorized'}, status=403)

        return Response({
            'id': client.id, 'name': client.name, 'email': client.email, 'phone': client.phone,
            'contact_person': client.contact_person, 'address': client.address,
            'nature_of_business': client.nature_of_business,
            'constitution': client.constitution_id,
            'constitution_name': client.constitution.name if client.constitution else None,
            'cin': client.cin, 'pan': client.pan, 'gstin': client.gstin, 'iec': client.iec,
            'ksea': client.ksea, 'udyam': client.udyam, 'apt': client.apt, 'ept': client.ept,
            'tan': client.tan, 'lei': client.lei, 'is_active': client.is_active,
        })


# ═══════════════════════════════════════════════════════════════════
# CASE NOTICE VIEWSET
# ═══════════════════════════════════════════════════════════════════
class CaseNoticeViewSet(viewsets.ModelViewSet):
    serializer_class = CaseNoticeSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = CaseNotice.objects.select_related(
            'court_case', 'court_case__client', 'created_by', 'reviewed_by'
        ).prefetch_related('documents', 'replies').all()

        court_case_id = self.request.query_params.get('court_case')
        litigation_type = self.request.query_params.get('litigation_type')
        client_id = self.request.query_params.get('client')
        job_id = self.request.query_params.get('job_id')

        if court_case_id:
            qs = qs.filter(court_case_id=court_case_id)
        if litigation_type:
            qs = qs.filter(court_case__litigation_type=litigation_type)
        if client_id:
            qs = qs.filter(court_case__client_id=client_id)
        if job_id:
            qs = qs.filter(court_case__job_id=job_id)

        user = self.request.user
        if is_admin_role(user):
            return qs.order_by('-created_at')

        tds_job_ids = TDSLitigation.objects.filter(
            Q(makers=user) | Q(checkers=user)
        ).values_list('id', flat=True)
        it_job_ids = IncomeTaxLitigation.objects.filter(
            Q(makers=user) | Q(checkers=user)
        ).values_list('id', flat=True)

        qs = qs.filter(
            Q(court_case__litigation_type='tds', court_case__job_id__in=tds_job_ids) |
            Q(court_case__litigation_type='income-tax', court_case__job_id__in=it_job_ids)
        ).distinct()
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        instance = serializer.save(created_by=user)
        la.log_notice_created(instance, user)

    @action(detail=True, methods=['post'], url_path='set-status')
    def set_status(self, request, pk=None):
        notice = self.get_object()
        user = request.user
        new_status = request.data.get('status')

        if not is_high_admin(user):
            return Response({'error': 'Only Founder can set notice status.'}, status=403)
        if new_status not in ['wip', 'open']:
            return Response({'error': 'Invalid status.'}, status=400)

        la.set_notice_status(notice, new_status, user)
        return Response(self.get_serializer(notice).data)

    @action(detail=True, methods=['post'], url_path='submit-for-review')
    def submit_for_review(self, request, pk=None):
        notice = self.get_object()
        user = request.user

        if not (is_case_maker(notice.court_case, user) or is_admin_role(user)):
            return Response({'error': 'Only Maker can submit for review.'}, status=403)

        if not notice.documents.filter(doc_type='pending', review_status='pending').exists():
            return Response({'error': 'No documents to review.'}, status=400)

        la.submit_notice_for_review(notice, user)
        return Response(self.get_serializer(notice).data)

    @action(detail=True, methods=['post'], url_path='review-accept')
    def review_accept(self, request, pk=None):
        notice = self.get_object()
        user = request.user

        if not (is_case_checker(notice.court_case, user) or is_high_admin(user)):
            return Response({'error': 'Only Checker or Founder can accept.'}, status=403)
        if notice.review_status not in ('pending', 'escalated'):
            return Response({'error': 'Notice is not pending review.'}, status=400)

        la.accept_notice_review(notice, user)
        return Response(self.get_serializer(notice).data)

    @action(detail=True, methods=['post'], url_path='review-reject')
    def review_reject(self, request, pk=None):
        notice = self.get_object()
        user = request.user
        reason = (request.data.get('reason') or '').strip()

        if not (is_case_checker(notice.court_case, user) or is_high_admin(user)):
            return Response({'error': 'Only Checker or Founder can reject.'}, status=403)
        if not reason:
            return Response({'error': 'Reason is required.'}, status=400)
        if notice.review_status not in ('pending', 'escalated'):
            return Response({'error': 'Notice is not pending review.'}, status=400)

        la.reject_notice_review(notice, reason, user)
        return Response(self.get_serializer(notice).data)

    @action(detail=True, methods=['post'], url_path='review-escalate')
    def review_escalate(self, request, pk=None):
        notice = self.get_object()
        user = request.user

        if not is_case_checker(notice.court_case, user):
            return Response({'error': 'Only Checker can escalate.'}, status=403)
        if notice.review_status != 'pending':
            return Response({'error': 'Notice is not pending review.'}, status=400)

        la.escalate_notice_review(notice, user)
        return Response(self.get_serializer(notice).data)

    @action(detail=True, methods=['post'], url_path='submit-edit-for-review')
    def submit_edit_for_review(self, request, pk=None):
        notice = self.get_object()
        user = request.user

        if not (is_case_maker(notice.court_case, user) or is_admin_role(user)):
            return Response({'error': 'Only Maker can submit edit for review.'}, status=403)

        if ReviewRequest.objects.filter(
            court_case=notice.court_case, action_type='notice_edit',
            status='pending', payload__notice_id=notice.id,
        ).exists():
            return Response({'error': 'A pending edit review already exists for this notice.'}, status=400)

        old_values = {
            'din_number': notice.din_number,
            'officer': notice.officer,
            'section': notice.section,
            'notice_date': str(notice.notice_date) if notice.notice_date else None,
            'due_date': str(notice.due_date) if notice.due_date else None,
            'extended_due_date': str(notice.extended_due_date) if notice.extended_due_date else None,
            'ph_date': str(notice.ph_date) if notice.ph_date else None,
            'notes': notice.notes,
        }
        new_values = {
            'din_number': request.data.get('din_number'),
            'officer': request.data.get('officer'),
            'section': request.data.get('section'),
            'notice_date': request.data.get('notice_date'),
            'due_date': request.data.get('due_date'),
            'extended_due_date': request.data.get('extended_due_date'),
            'ph_date': request.data.get('ph_date'),
            'notes': request.data.get('notes'),
        }

        changed_fields = []
        for field, new_val in new_values.items():
            old_val = old_values.get(field)
            old_str = str(old_val) if old_val not in (None, '') else ''
            new_str = str(new_val) if new_val not in (None, '') else ''
            if old_str != new_str:
                changed_fields.append(field)

        if not changed_fields:
            return Response({'error': 'No changes detected.'}, status=400)

        payload = {
            'notice_id': notice.id,
            'notice_din': notice.din_number,
            'old_values': old_values,
            'new_values': new_values,
            'changed_fields': changed_fields,
        }

        if is_admin_role(user):
            la.apply_notice_edit_directly(notice, changed_fields, new_values, old_values, user)
            return Response(self.get_serializer(notice).data)

        review = la.create_notice_edit_review(notice, payload, user)
        return Response({
            'review_submitted': True,
            'review_id': review.id,
            'message': 'Notice edit submitted for checker review.',
            **self.get_serializer(notice).data,
        })

    @action(detail=True, methods=['post'], url_path='submit-docs')
    def submit_docs(self, request, pk=None):
        notice = self.get_object()
        user = request.user

        if not (is_case_maker(notice.court_case, user) or is_admin_role(user)):
            return Response({'error': 'Only Maker can submit documents.'}, status=403)

        _, count = la.submit_notice_drafts(notice, user)
        if count == 0:
            return Response({'error': 'No draft documents to submit.'}, status=400)

        return Response(self.get_serializer(notice).data)


# ═══════════════════════════════════════════════════════════════════
# NOTICE DOCUMENT VIEWSET
# ═══════════════════════════════════════════════════════════════════
class NoticeDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = NoticeDocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = NoticeDocument.objects.all()
        notice_id = self.request.query_params.get('notice')
        doc_type = self.request.query_params.get('doc_type')
        job_id = self.request.query_params.get('job_id')

        if job_id:
            qs = qs.filter(notice__court_case__job_id=job_id)
        if notice_id:
            qs = qs.filter(notice_id=notice_id)
        if doc_type:
            qs = qs.filter(doc_type=doc_type)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        doc_type = serializer.validated_data.get('doc_type', 'pending')
        reply_version = self.request.data.get('reply_version')

        review_status = 'not_applicable' if doc_type == 'court_notice' else 'draft'

        instance = serializer.save(
            uploaded_by=user,
            review_status=review_status,
            reply_version=reply_version if reply_version else None
        )
        la.log_notice_document_created(instance, user)

    def perform_destroy(self, instance):
        from rest_framework.exceptions import PermissionDenied
        user = self.request.user
        court_case = instance.notice.court_case
        is_court_notice = instance.doc_type == 'court_notice'
        is_maker = is_case_maker(court_case, user)

        if is_court_notice:
            if not is_maker:
                raise PermissionDenied('Only the assigned Maker can delete the Court Notice.')
        elif (
            instance.doc_type in ('acknowledgment', 'pending', 'pending_support')
            and instance.review_status in ('rejected', 'draft')
            and instance.uploaded_by == user
        ):
            pass
        else:
            raise PermissionDenied('This document cannot be deleted.')

        la.delete_notice_document_cascade(instance, user)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        doc = self.get_object()
        user = request.user

        if not (is_case_checker(doc.notice.court_case, user) or is_high_admin(user)):
            return Response({'error': 'Only Checker or Founder can approve.'}, status=403)
        if doc.review_status not in ('pending', 'escalated'):
            return Response({'error': 'Cannot approve this document.'}, status=400)

        la.approve_notice_document(doc, user)
        return Response(NoticeDocumentSerializer(doc, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        doc = self.get_object()
        user = request.user
        reason = (request.data.get('reason') or '').strip()

        if not (is_case_checker(doc.notice.court_case, user) or is_high_admin(user)):
            return Response({'error': 'Only Checker or Founder can reject.'}, status=403)
        if not reason:
            return Response({'error': 'Rejection reason is required.'}, status=400)
        if doc.review_status not in ('pending', 'escalated'):
            return Response({'error': 'Cannot reject this document.'}, status=400)

        la.reject_notice_document(doc, reason, user)
        return Response(NoticeDocumentSerializer(doc, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='escalate')
    def escalate(self, request, pk=None):
        doc = self.get_object()
        user = request.user

        if not is_case_checker(doc.notice.court_case, user):
            return Response({'error': 'Only Checker can escalate.'}, status=403)
        if doc.review_status != 'pending':
            return Response({'error': 'Only pending documents can be escalated.'}, status=400)

        la.escalate_notice_document(doc, user)
        return Response(NoticeDocumentSerializer(doc, context={'request': request}).data)


# ═══════════════════════════════════════════════════════════════════
# NOTICE REPLY VIEWSET
# ═══════════════════════════════════════════════════════════════════
class NoticeReplyViewSet(viewsets.ModelViewSet):
    serializer_class = NoticeReplySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = NoticeReply.objects.select_related(
            'notice', 'notice__court_case',
            'created_by', 'last_edited_by', 'reviewed_by',
        )
        notice_id = self.request.query_params.get('notice')
        court_case_id = self.request.query_params.get('court_case')
        status_filter = self.request.query_params.get('status')
        job_id = self.request.query_params.get('job_id')

        if job_id:
            qs = qs.filter(notice__court_case__job_id=job_id)
        if notice_id:
            qs = qs.filter(notice_id=notice_id)
        if court_case_id:
            qs = qs.filter(notice__court_case_id=court_case_id)
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(created_by=user, last_edited_by=user, status='draft')

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        old_status = instance.status
        old_title = instance.title

        if old_status == 'approved':
            raise PermissionError('Cannot edit an approved reply.')

        saved = serializer.save(last_edited_by=user)
        la.handle_reply_post_update(instance, saved, old_status, old_title, user)

    @action(detail=True, methods=['post'], url_path='send-for-review')
    def send_for_review(self, request, pk=None):
        reply = self.get_object()
        user = request.user

        if reply.status not in ('draft', 'rejected'):
            return Response({'error': f'Cannot send reply with status "{reply.status}".'}, status=400)
        if not reply.content_html or not reply.content_html.strip():
            return Response({'error': 'Reply content cannot be empty.'}, status=400)

        la.send_reply_for_review(reply, user)
        return Response(self.get_serializer(reply).data)

    def perform_destroy(self, instance):
        from rest_framework.exceptions import PermissionDenied
        user = self.request.user

        if instance.status == 'approved':
            raise PermissionDenied('Cannot delete an approved reply.')

        if instance.status == 'draft' and instance.created_by != user:
            if not is_high_admin(user):
                raise PermissionDenied('You can only delete your own drafts.')

        la.delete_reply_cascade(instance, user)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        reply = self.get_object()
        user = request.user

        if reply.status not in ('pending', 'escalated'):
            return Response({'error': f'Cannot approve reply with status "{reply.status}".'}, status=400)
        if reply.status == 'escalated' and not is_high_admin(user):
            return Response({'error': 'Only Admin/Founder can approve escalated replies.'}, status=403)

        la.approve_reply(reply, user)
        return Response(self.get_serializer(reply).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        reply = self.get_object()
        user = request.user
        reason = (request.data.get('reason') or '').strip()

        if not reason:
            return Response({'error': 'Rejection reason is required.'}, status=400)
        if reply.status not in ('pending', 'escalated'):
            return Response({'error': f'Cannot reject reply with status "{reply.status}".'}, status=400)
        if reply.status == 'escalated' and not is_high_admin(user):
            return Response({'error': 'Only Admin/Founder can reject escalated replies.'}, status=403)

        la.reject_reply(reply, reason, user)
        return Response(self.get_serializer(reply).data)

    @action(detail=True, methods=['post'], url_path='escalate')
    def escalate(self, request, pk=None):
        reply = self.get_object()
        user = request.user

        if reply.status != 'pending':
            return Response({'error': f'Cannot escalate reply with status "{reply.status}". Only pending replies can be escalated.'}, status=400)

        la.escalate_reply(reply, user)
        return Response(self.get_serializer(reply).data)

    @action(detail=True, methods=['post'], url_path='reopen')
    def reopen(self, request, pk=None):
        reply = self.get_object()
        user = request.user

        if reply.status != 'rejected':
            return Response({'error': 'Only rejected replies can be reopened.'}, status=400)
        if reply.created_by != user and not is_admin_role(user):
            return Response({'error': 'Only the original author or admin can reopen.'}, status=403)

        la.reopen_reply(reply, user)
        return Response(self.get_serializer(reply).data)


# ═══════════════════════════════════════════════════════════════════
# REPLY IMAGE UPLOAD (unchanged)
# ═══════════════════════════════════════════════════════════════════
class ReplyImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('image')
        if not file:
            return Response({'error': 'No image file provided.'}, status=400)

        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            return Response({'error': 'Invalid image type.'}, status=400)

        from django.core.files.storage import default_storage
        from datetime import datetime
        now = datetime.now()
        filename = f"reply_images/{now.year}/{now.month:02d}/{file.name}"
        saved_path = default_storage.save(filename, file)
        url = default_storage.url(saved_path)
        return Response({'url': request.build_absolute_uri(url)})


# ═══════════════════════════════════════════════════════════════════
# CASE CLOSURE DOCUMENT VIEWSET
# ═══════════════════════════════════════════════════════════════════
class CaseClosureDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = CaseClosureDocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = CaseClosureDocument.objects.select_related('court_case', 'uploaded_by').all()
        court_case_id = self.request.query_params.get('court_case')
        job_id = self.request.query_params.get('job_id')

        if job_id:
            qs = qs.filter(notice__court_case__job_id=job_id)
        if court_case_id:
            qs = qs.filter(court_case_id=court_case_id)
        return qs

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError, PermissionDenied
        user = self.request.user
        court_case_id = self.request.data.get('court_case')
        doc_type = self.request.data.get('doc_type')

        if not court_case_id or not doc_type:
            raise ValidationError({'error': 'court_case and doc_type are required.'})

        try:
            court_case = CourtCase.objects.get(id=court_case_id)
        except CourtCase.DoesNotExist:
            raise ValidationError({'error': 'Court case not found.'})

        if not (is_case_maker(court_case, user) or is_admin_role(user)):
            raise PermissionDenied('Only assigned Maker can upload closure documents.')
        if court_case.status == 'closed':
            raise ValidationError({'error': 'Cannot upload — case is already closed.'})
        if court_case.closure_review_status in ('pending', 'escalated'):
            raise ValidationError({'error': 'Cannot upload — closure bundle is currently under review.'})

        if court_case.closure_review_status == 'rejected':
            la.reset_rejected_closure_bundle(court_case, user)

        if court_case.closure_documents.filter(doc_type=doc_type).exists():
            raise ValidationError({
                'error': f'{doc_type.replace("_", " ").title()} already uploaded. Delete it first to re-upload.'
            })

        instance = serializer.save(uploaded_by=user)
        la.after_closure_doc_uploaded(instance, court_case, doc_type, user)

    def perform_destroy(self, instance):
        from rest_framework.exceptions import PermissionDenied
        user = self.request.user
        court_case = instance.court_case

        can_maker_delete = (
            (is_case_maker(court_case, user) or is_admin_role(user))
            and court_case.closure_review_status in ('draft', 'not_started')
            and court_case.status != 'closed'
        )

        if not can_maker_delete and not is_founder(user):
            raise PermissionDenied('Cannot delete this file.')

        la.delete_closure_doc(instance, user)


# ═══════════════════════════════════════════════════════════════════
# CASE CLOSURE BUNDLE VIEW
# ═══════════════════════════════════════════════════════════════════
class CaseClosureBundleView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_case(self, pk):
        try:
            return CourtCase.objects.get(id=pk)
        except CourtCase.DoesNotExist:
            return None

    def _has_all_3_docs(self, court_case):
        uploaded_types = set(court_case.closure_documents.values_list('doc_type', flat=True))
        return uploaded_types == {'order', 'demand_notice', 'computation_sheet'}

    def post(self, request, pk, action):
        court_case = self._get_case(pk)
        if not court_case:
            return Response({'error': 'Case not found.'}, status=404)

        user = request.user

        if action == 'submit':
            if not (is_case_maker(court_case, user) or is_admin_role(user)):
                return Response({'error': 'Only Maker can submit for review.'}, status=403)
            if court_case.status == 'closed':
                return Response({'error': 'Case is already closed.'}, status=400)
            if court_case.closure_review_status != 'draft':
                return Response({'error': f'Cannot submit — current status: {court_case.closure_review_status}'}, status=400)
            if not self._has_all_3_docs(court_case):
                return Response({'error': 'All 3 documents (Order, Demand Notice, Computation Sheet) must be uploaded before submitting.'}, status=400)

            la.submit_closure_bundle(court_case, user)
            return Response(CourtCaseSerializer(court_case, context={'request': request}).data)

        if action == 'approve':
            if not (is_case_checker(court_case, user) or is_high_admin(user)):
                return Response({'error': 'Only Checker or Founder can approve.'}, status=403)
            if court_case.closure_review_status not in ('pending', 'escalated'):
                return Response({'error': f'Cannot approve — current status: {court_case.closure_review_status}'}, status=400)
            if court_case.closure_review_status == 'escalated' and not is_high_admin(user):
                return Response({'error': 'Only Founder can approve escalated bundle.'}, status=403)

            la.approve_closure_bundle(court_case, user)
            return Response(CourtCaseSerializer(court_case, context={'request': request}).data)

        if action == 'reject':
            if not (is_case_checker(court_case, user) or is_high_admin(user)):
                return Response({'error': 'Only Checker or Founder can reject.'}, status=403)

            reason = (request.data.get('reason') or '').strip()
            if not reason:
                return Response({'error': 'Rejection reason is required.'}, status=400)
            if court_case.closure_review_status not in ('pending', 'escalated'):
                return Response({'error': f'Cannot reject — current status: {court_case.closure_review_status}'}, status=400)
            if court_case.closure_review_status == 'escalated' and not is_high_admin(user):
                return Response({'error': 'Only Founder can reject escalated docuements.'}, status=403)

            la.reject_closure_bundle(court_case, reason, user)
            return Response(CourtCaseSerializer(court_case, context={'request': request}).data)

        if action == 'escalate':
            if not is_case_checker(court_case, user):
                return Response({'error': 'Only Checker can escalate.'}, status=403)
            if court_case.closure_review_status != 'pending':
                return Response({'error': 'Only pending bundles can be escalated.'}, status=400)

            la.escalate_closure_bundle(court_case, user)
            return Response(CourtCaseSerializer(court_case, context={'request': request}).data)

        return Response({'error': f'Unknown action: {action}'}, status=400)



# ═══════════════════════════════════════════════════════════════════
# MCA VIEWSETS
# ═══════════════════════════════════════════════════════════════════

class MCACaseViewSet(viewsets.ModelViewSet):
    serializer_class = MCACaseSerializer
    permission_classes = [IsAdminOrAssignedOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filterset_fields = ['client', 'status']

    def get_queryset(self):
        qs = MCACase.objects.select_related(
            'client', 'created_by', 'sub_service', 'sub_service__main_service', 'task'
        ).prefetch_related('assigned_to', 'makers', 'checkers', 'filings').all()

        client = self.request.query_params.get('client')
        if client:
            qs = qs.filter(client_id=client)

        sub_service = self.request.query_params.get('sub_service')
        if sub_service:
            qs = qs.filter(sub_service_id=sub_service)

        sub_service_slug = self.request.query_params.get('sub_service_slug')
        if sub_service_slug:
            qs = qs.filter(
                Q(sub_service__name__iexact=sub_service_slug) |
                Q(sub_service__name__icontains=sub_service_slug)
            )

        # ── Company vs LLP (THIS is what job list pages use) ──
        main_service = (self.request.query_params.get('main_service') or '').strip().lower()
        if main_service == 'company':
            qs = qs.filter(service_group='company')
        elif main_service == 'llp':
            qs = qs.filter(service_group='llp')

        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)

        user = self.request.user
        if not user or not user.is_authenticated:
            return MCACase.objects.none()
        if is_admin_role(user):
            return qs
        return qs.filter(Q(makers=user) | Q(checkers=user)).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        instance = serializer.save(created_by=user)
        ma.log_mca_case_created(instance, user)

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

        ma.assign_mca_makers_checkers(case, maker_ids, checker_ids, request.user)
        return Response(self.get_serializer(case).data)

class MCAFilingViewSet(viewsets.ModelViewSet):
    serializer_class = MCAFilingSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = MCAFiling.objects.select_related(
            'mca_case', 'mca_case__client', 'mca_case__sub_service', 'created_by'
        ).prefetch_related('documents').all()

        mca_case_id = self.request.query_params.get('mca_case')
        if mca_case_id:
            qs = qs.filter(mca_case_id=mca_case_id)

        user = self.request.user
        if is_admin_role(user):
            return qs.order_by('-created_at')

        mca_case_ids = MCACase.objects.filter(
            Q(makers=user) | Q(checkers=user)
        ).values_list('id', flat=True)
        return qs.filter(mca_case_id__in=mca_case_ids).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        mca_case_id = self.request.data.get('mca_case')
        try:
            mca_case = MCACase.objects.get(id=mca_case_id)
        except MCACase.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': 'MCA case not found.'})

        if not (mh.is_mca_case_maker(mca_case, user) or is_admin_role(user)):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only assigned Maker can create a filing.')

        filing = ma.create_mca_filing(
            mca_case,
            self.request.data.get('event_date'),
            self.request.data.get('notes'),
            user,
        )
        serializer.instance = filing

    def perform_update(self, serializer):
        user = self.request.user
        filing = self.get_object()
        if not (mh.is_mca_case_maker(filing.mca_case, user) or is_admin_role(user)):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only assigned Maker can edit filing.')

        ma.update_mca_filing(filing, self.request.data, user)
        serializer.instance = filing

    # ── ACTION 1: Submit Draft for Review (Maker) ──
    @action(detail=True, methods=['post'], url_path='submit-for-review')
    def submit_for_review(self, request, pk=None):
        filing = self.get_object()
        user = request.user
        if not (mh.is_mca_case_maker(filing.mca_case, user) or is_admin_role(user)):
            return Response({'error': 'Only Maker can submit for review.'}, status=403)

        _, count = ma.submit_mca_drafts_for_review(filing, user)
        if count == 0:
            return Response({'error': 'No draft documents to submit.'}, status=400)

        filing.refresh_from_db()
        return Response(self.get_serializer(filing).data)

    # ── ACTION 2: Review Draft (Checker / CEO) ──
    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        filing = self.get_object()
        user = request.user
        action_type = request.data.get('action')
        note = (request.data.get('note') or '').strip()

        if not (mh.is_mca_case_checker(filing.mca_case, user) or is_high_admin(user)):
            return Response({'error': 'Only Checker or Admin can review.'}, status=403)
        if action_type not in ('approve', 'reject', 'escalate'):
            return Response({'error': 'Invalid action.'}, status=400)
        if action_type == 'reject' and not note:
            return Response({'error': 'Rejection reason is required.'}, status=400)

        _, count = ma.bulk_review_drafts(filing, action_type, note, user)
        if count == 0:
            return Response({'error': 'No pending drafts to review.'}, status=400)

        filing.refresh_from_db()
        return Response(self.get_serializer(filing).data)

    # ── ACTION 3: Submit SRN for Review (Maker) ──
    @action(detail=True, methods=['post'], url_path='submit-srn-for-review')
    def submit_srn_for_review(self, request, pk=None):
        filing = self.get_object()
        user = request.user
        if not (mh.is_mca_case_maker(filing.mca_case, user) or is_admin_role(user)):
            return Response({'error': 'Only Maker can submit SRN.'}, status=403)

        _, count = ma.submit_srn_for_review(filing, user)
        if count == 0:
            return Response({'error': 'No SRN documents to submit.'}, status=400)

        filing.refresh_from_db()
        return Response(self.get_serializer(filing).data)

    # ── ACTION 4: Review SRN (Checker / CEO) ──
    @action(detail=True, methods=['post'], url_path='review-srn')
    def review_srn(self, request, pk=None):
        filing = self.get_object()
        user = request.user
        action_type = request.data.get('action')
        note = (request.data.get('note') or '').strip()

        if not (mh.is_mca_case_checker(filing.mca_case, user) or is_high_admin(user)):
            return Response({'error': 'Only Checker or Admin can review SRN.'}, status=403)
        if action_type not in ('approve', 'reject', 'escalate'):
            return Response({'error': 'Invalid action.'}, status=400)
        if action_type == 'reject' and not note:
            return Response({'error': 'Rejection reason is required.'}, status=400)

        _, count = ma.bulk_review_srn(filing, action_type, note, user)
        if count == 0:
            return Response({'error': 'No pending SRN documents.'}, status=400)

        filing.refresh_from_db()
        return Response(self.get_serializer(filing).data)

    # ── ACTION 5: Record MCA Outcome ──
    @action(detail=True, methods=['post'], url_path='record-outcome')
    def record_outcome(self, request, pk=None):
        filing = self.get_object()
        user = request.user

        if not (mh.is_mca_case_maker(filing.mca_case, user) or is_admin_role(user)):
            return Response({'error': 'Only Maker can record outcome.'}, status=403)
        if filing.stage not in ('mca_verification', 'portal_filing'):
            return Response({'error': 'Cannot record outcome yet — SRN not verified.'}, status=400)

        outcome = request.data.get('outcome')
        note = (request.data.get('note') or '').strip()
        if outcome not in ('approved', 'rejected', 'resubmission_required'):
            return Response({'error': 'Invalid outcome.'}, status=400)

        ma.record_mca_outcome(filing, outcome, note, user)
        filing.refresh_from_db()
        return Response(self.get_serializer(filing).data)



class MCAFilingDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = MCAFilingDocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = MCAFilingDocument.objects.all()
        filing_id = self.request.query_params.get('filing')
        doc_type = self.request.query_params.get('doc_type')
        if filing_id:
            qs = qs.filter(filing_id=filing_id)
        if doc_type:
            qs = qs.filter(doc_type=doc_type)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        doc_type = serializer.validated_data.get('doc_type', 'pending_draft')
        parent_draft = self.request.data.get('parent_draft')

        # SRN must start as draft so Maker can click "Send SRN for Review"
        auto_pending_types = [
            'mca_approval_cert',
            'mca_rejection_notice',
            'resubmission_notice',
        ]
        # DO NOT put srn_receipt / challan / acknowledgment here
        review_status = 'pending' if doc_type in auto_pending_types else 'draft'

        instance = serializer.save(
            uploaded_by=user,
            review_status=review_status,
            parent_draft=parent_draft if parent_draft else None,
        )
        ma.log_mca_doc_created(instance, user)

    def perform_destroy(self, instance):
        from rest_framework.exceptions import PermissionDenied
        user = self.request.user

        # Only draft or rejected + own uploads can be deleted
        if instance.review_status not in ('draft', 'rejected') or instance.uploaded_by != user:
            if not is_admin_role(user):
                raise PermissionDenied('Cannot delete this document.')

        ma.delete_mca_doc_cascade(instance, user)


    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        doc = self.get_object()
        user = request.user
        filing = doc.filing

        if doc.review_status == 'escalated':
            if not is_high_admin(user):
                return Response({'error': 'Only CEO/Founder can approve escalated documents.'}, status=403)
        elif doc.review_status == 'pending':
            if not mh.is_mca_case_checker(filing.mca_case, user):
                return Response({'error': 'Only the assigned Checker can approve pending documents.'}, status=403)
        else:
            return Response({'error': 'Cannot approve this document.'}, status=400)

        # Route by doc_type
        if doc.doc_type in ('pending_draft', 'draft_form'):
            ma.approve_mca_draft(doc, user)
        elif doc.doc_type == 'srn_receipt':
            ma.approve_mca_srn(doc, user)
        else:
            doc.review_status = 'approved'
            doc.reviewed_by = user
            doc.reviewed_at = timezone.now()
            doc.save()
            mh.update_filing_status_from_workflow(filing)

        return Response(MCAFilingDocumentSerializer(doc, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        doc = self.get_object()
        user = request.user
        reason = (request.data.get('reason') or '').strip()
        filing = doc.filing

        if not reason:
            return Response({'error': 'Rejection reason is required.'}, status=400)

        if doc.review_status == 'escalated':
            if not is_high_admin(user):
                return Response({'error': 'Only CEO/Founder can reject escalated documents.'}, status=403)
        elif doc.review_status == 'pending':
            if not mh.is_mca_case_checker(filing.mca_case, user):
                return Response({'error': 'Only the assigned Checker can reject pending documents.'}, status=403)
        else:
            return Response({'error': 'Cannot reject this document.'}, status=400)

        if doc.doc_type in ('pending_draft', 'draft_form'):
            ma.reject_mca_draft(doc, reason, user)
        elif doc.doc_type == 'srn_receipt':
            ma.reject_mca_srn(doc, reason, user)
        else:
            doc.review_status = 'rejected'
            doc.review_note = reason
            doc.reviewed_by = user
            doc.reviewed_at = timezone.now()
            doc.save()
            mh.update_filing_status_from_workflow(filing)

        return Response(MCAFilingDocumentSerializer(doc, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='escalate')
    def escalate(self, request, pk=None):
        doc = self.get_object()
        user = request.user
        filing = doc.filing

        if not mh.is_mca_case_checker(filing.mca_case, user):
            return Response({'error': 'Only Assigned Checker can move to CEO.'}, status=403)
        
        if doc.review_status != 'pending':
            return Response({'error': 'Only pending documents can be escalated.'}, status=400)

        if doc.doc_type in ('pending_draft', 'draft_form'):
            ma.escalate_mca_draft(doc, user)
        elif doc.doc_type == 'srn_receipt':
            ma.escalate_mca_srn(doc, user)
        else:
            doc.review_status = 'escalated'
            doc.save(update_fields=['review_status'])
            mh.update_filing_status_from_workflow(filing)

        return Response(MCAFilingDocumentSerializer(doc, context={'request': request}).data)

