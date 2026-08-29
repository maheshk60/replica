
# legal_services/serializers.py
from rest_framework import serializers
from django.db.models import Q
from .models import (
    TDSLitigation, IncomeTaxLitigation, MCACase, FEMACase,
    PartnershipCase, LegalCaseAuditLog, ReviewRequest,CaseNotice, NoticeDocument, NoticeReply,
    CaseClosureDocument,
)


from datetime import date, datetime, timedelta

def _case_has_attention_required(case_or_notices):
    """
    Returns True if ANY notice is wip/under_review AND its effective due date
    is within 5 days OR already overdue.
    Effective due date = extended_due_date if set, else due_date.
    """
    if hasattr(case_or_notices, 'all'):
        notices = case_or_notices.all()
    else:
        notices = case_or_notices

    today = date.today()
    threshold = today + timedelta(days=5)

    for n in notices:
        # Only wip / under_review notices count for attention
        if n.status not in ('wip', 'under_review'):
            continue

        # Effective due date
        due = n.extended_due_date or n.due_date
        if not due:
            continue

        # Convert string to date if needed
        if isinstance(due, str):
            try:
                due = datetime.strptime(due, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                continue

        # Overdue OR within 5 days → attention required
        if due <= threshold:
            return True

    return False



class BaseLegalCaseSerializer(serializers.ModelSerializer):
    # ── ALL field declarations at top ──────────────────────────
    client_name       = serializers.CharField(source='client.name', read_only=True)
    assigned_to_names = serializers.SerializerMethodField()
    created_by_name   = serializers.SerializerMethodField()
    makers            = serializers.SerializerMethodField()
    checkers          = serializers.SerializerMethodField()

    TRACKED_FIELDS = [
        'status', 'case_number', 'court_name', 'notes',
        'next_hearing_date', 'assessment_year', 'period',
        'description', 'remarks', 'due_date',
    ]

    def get_assigned_to_names(self, obj):
        return [emp.full_name for emp in obj.assigned_to.all()]

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def get_makers(self, obj):
        return [{'id': u.id, 'name': u.get_full_name() or u.email} for u in obj.makers.all()]

    def get_checkers(self, obj):
        return [{'id': u.id, 'name': u.get_full_name() or u.email} for u in obj.checkers.all()]

    def _litigation_type(self, instance):
        from .models import TDSLitigation
        return 'tds' if isinstance(instance, TDSLitigation) else 'income-tax'

    def create(self, validated_data):
        request = self.context.get('request')
        if request:
            validated_data['created_by'] = request.user
        instance = super().create(validated_data)
        from .utils import log_event
        log_event(
            client_id=instance.client_id,
            litigation_type=self._litigation_type(instance),
            job_id=instance.id,
            event_type='case_created',
            title=f'Case created ({instance.reference_no})',
            user=request.user if request else None,
        )
        return instance

    def update(self, instance, validated_data):
        from .utils import log_event, diff_fields
        old_values, new_values = diff_fields(instance, validated_data, self.TRACKED_FIELDS)
        request = self.context.get('request')
        instance = super().update(instance, validated_data)
        if old_values:
            log_event(
                client_id=instance.client_id,
                litigation_type=self._litigation_type(instance),
                job_id=instance.id,
                event_type='activity_update',
                title='Case details updated',
                user=request.user if request else None,
                old_values=old_values,
                new_values=new_values,
            )
        return instance


# ─────────────────────────────────────────────────────────────────────


class TDSLitigationSerializer(BaseLegalCaseSerializer):
    # ── ALL field declarations at top ──────────────────────────
    sub_service_name = serializers.CharField(source='sub_service.name', read_only=True)
    task_id          = serializers.SerializerMethodField()
    task_period      = serializers.SerializerMethodField()
    activity_status  = serializers.SerializerMethodField()
    computed_status  = serializers.SerializerMethodField()
    linked_task      = serializers.SerializerMethodField()

    class Meta:
        model = TDSLitigation
        fields = '__all__'
        read_only_fields = ['reference_no', 'created_by']



    # ── Methods ────────────────────────────────────────────────
    def get_linked_task(self, obj):
        task = getattr(obj, 'task', None)
        if not task:
            return None
        return {
            'id':               task.id,
            'task_id':          task.task_id,
            'client_name':      getattr(task.client, 'name', None),
            'sub_service_name': getattr(task.sub_service, 'name', None),
            'spoc_name':        getattr(task.spoc, 'name', None),
            'team_name':        getattr(task.team, 'name', None),
            'status':           task.status,
            'period':           task.period,
            'due_date':         str(task.due_date) if task.due_date else None,
            'created_by_name':  (
                task.created_by.get_full_name() or task.created_by.email
            ) if task.created_by else None,
            'created_at':       task.created_at.isoformat() if task.created_at else None,
        }

    def get_task_id(self, obj):
        if getattr(obj, 'task', None):
            return obj.task.task_id
        return None

    def get_task_period(self, obj):
        if getattr(obj, 'task', None):
            return obj.task.period
        return None

    def get_activity_status(self, obj):
        from .models import CourtCase
        case = CourtCase.objects.filter(
            client=obj.client, litigation_type='tds', job_id=obj.id
        ).order_by('-created_at').first()
        return case.status if case else 'wip'

    

    def get_computed_status(self, obj):
        from .models import CourtCase
        case = CourtCase.objects.filter(
            client=obj.client, litigation_type='tds', job_id=obj.id
        ).order_by('-created_at').first()
        if not case:
            return 'wip'
        if case.status == 'closed':
            return 'closed'

        notices = case.notices.all()
        if not notices.exists():
            return 'wip'

        # ✅ Attention required check
        if _case_has_attention_required(notices):
            return 'attention_required'

        statuses = set(n.status for n in notices)

        if 'wip' in statuses or 'under_review' in statuses:
            return 'wip'

        if statuses == {'open'}:
            return 'open'

        return 'wip'


# ─────────────────────────────────────────────────────────────────────


class IncomeTaxLitigationSerializer(BaseLegalCaseSerializer):
    # ── ALL field declarations at top ──────────────────────────
    sub_service_name = serializers.CharField(source='sub_service.name', read_only=True)
    task_id          = serializers.SerializerMethodField()
    task_period      = serializers.SerializerMethodField()
    activity_status  = serializers.SerializerMethodField()
    computed_status  = serializers.SerializerMethodField()
    linked_task      = serializers.SerializerMethodField()

    class Meta:
        model = IncomeTaxLitigation
        fields = '__all__'
        read_only_fields = ['reference_no', 'created_by']


        # ── Methods ────────────────────────────────────────────────
    def get_linked_task(self, obj):
        task = getattr(obj, 'task', None)
        if not task:
            return None
        return {
            'id':               task.id,
            'task_id':          task.task_id,
            'client_name':      getattr(task.client, 'name', None),
            'sub_service_name': getattr(task.sub_service, 'name', None),
            'spoc_name':        getattr(task.spoc, 'name', None),
            'team_name':        getattr(task.team, 'name', None),
            'status':           task.status,
            'period':           task.period,
            'due_date':         str(task.due_date) if task.due_date else None,
            'created_by_name':  (
                task.created_by.get_full_name() or task.created_by.email
            ) if task.created_by else None,
            'created_at':       task.created_at.isoformat() if task.created_at else None,
        }

    def get_task_id(self, obj):
        if getattr(obj, 'task', None):
            return obj.task.task_id
        return None

    def get_task_period(self, obj):
        if getattr(obj, 'task', None):
            return obj.task.period
        return None


    def get_activity_status(self, obj):
        from .models import CourtCase
        case = CourtCase.objects.filter(
            client=obj.client, litigation_type='income-tax', job_id=obj.id
        ).order_by('-created_at').first()
        return case.status if case else 'wip'



    def get_computed_status(self, obj):
        from .models import CourtCase
        case = CourtCase.objects.filter(
            client=obj.client, litigation_type='income-tax', job_id=obj.id
        ).order_by('-created_at').first()
        if not case:
            return 'wip'
        if case.status == 'closed':
            return 'closed'

        notices = case.notices.all()
        if not notices.exists():
            return 'wip'

        if _case_has_attention_required(notices):
            return 'attention_required'

        statuses = set(n.status for n in notices)

        if 'wip' in statuses or 'under_review' in statuses:
            return 'wip'

        if statuses == {'open'}:
            return 'open'

        return 'wip'


class MCACaseSerializer(BaseLegalCaseSerializer):
    class Meta:
        model = MCACase
        fields = '__all__'
        read_only_fields = ['reference_no', 'created_by']


class FEMACaseSerializer(BaseLegalCaseSerializer):
    class Meta:
        model = FEMACase
        fields = '__all__'
        read_only_fields = ['reference_no', 'created_by']


class PartnershipCaseSerializer(BaseLegalCaseSerializer):
    class Meta:
        model = PartnershipCase
        fields = '__all__'
        read_only_fields = ['reference_no', 'created_by']


class LegalCaseAuditLogSerializer(serializers.ModelSerializer):
    by_name = serializers.SerializerMethodField()

    class Meta:
        model = LegalCaseAuditLog
        fields = ['id', 'event_type', 'title', 'description', 'by_name', 'created_at','old_values', 'new_values']

    def get_by_name(self, obj):
        return (obj.by.get_full_name() or obj.by.email) if obj.by else 'Admin'




from .models import DocumentCategory, ClientCustomDocument, CourtCase, CourtCaseStatusLog 




class ClientCustomDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ClientCustomDocument
        fields = ['id', 'category', 'file', 'file_url', 'document_name', 'uploaded_at']
        extra_kwargs = {'file': {'write_only': True}}

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None


class NoticeDocumentSerializer(serializers.ModelSerializer):
    file_url         = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = NoticeDocument
        fields = [
            'id', 'notice', 'file', 'file_url', 'file_name',
            'doc_type', 'reply_version', 'review_status', 'review_note',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = [
            'file_name', 'review_status', 'review_note',
            'reviewed_by', 'reviewed_at',
            'uploaded_by', 'uploaded_at',
            'file_url', 'uploaded_by_name', 'reviewed_by_name',
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.email
        return None

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.email
        return None

class CaseNoticeSerializer(serializers.ModelSerializer):
    created_by_name   = serializers.SerializerMethodField()
    reviewed_by_name  = serializers.SerializerMethodField()
    court_notice_docs = serializers.SerializerMethodField()
    pending_docs      = serializers.SerializerMethodField()
    reply_docs        = serializers.SerializerMethodField()
    supporting_docs   = serializers.SerializerMethodField() 
    replies_count     = serializers.SerializerMethodField()
    documents         = serializers.SerializerMethodField()

    # NEW: Context fields for cross-case notice listing
    client_id         = serializers.IntegerField(source='court_case.client_id', read_only=True)
    client_name       = serializers.CharField(source='court_case.client.name', read_only=True)
    litigation_type   = serializers.CharField(source='court_case.litigation_type', read_only=True)
    job_id            = serializers.IntegerField(source='court_case.job_id', read_only=True)
    case_status       = serializers.CharField(source='court_case.status', read_only=True)
    sub_service_name  = serializers.SerializerMethodField()
    task_id           = serializers.SerializerMethodField()
    task_period       = serializers.SerializerMethodField()

    has_escalated_items = serializers.SerializerMethodField()

    class Meta:
        model  = CaseNotice
        fields = [
            'id', 'court_case',
            'din_number', 'officer', 'section',
            'notice_date', 'due_date', 'extended_due_date', 'ph_date',
            'status', 'notes',
            'review_status', 'review_note', 'replies_count',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'created_by', 'created_by_name',
            'created_at', 'updated_at',
            'court_notice_docs', 'pending_docs', 'reply_docs', 'supporting_docs','documents',
            # ✅ NEW: Context fields
            'client_id', 'client_name', 'litigation_type', 'job_id', 'case_status',
            'sub_service_name', 'task_id', 'task_period','has_escalated_items',
        ]
        read_only_fields = [
            'created_by', 'created_at', 'updated_at',
            'court_notice_docs', 'pending_docs', 'reply_docs',
        ]


    # ✅ ADD THIS ENTIRE FUNCTION
    def get_has_escalated_items(self, obj):
        # Check parent notice level
        if obj.review_status == 'escalated':
            return True
        # Check HTML replies
        if obj.replies.filter(status='escalated').exists():
            return True
        # Check Document replies/acks
        if obj.documents.filter(review_status='escalated').exists():
            return True
        # Check Notice Edits
        from .models import ReviewRequest
        if ReviewRequest.objects.filter(
            court_case=obj.court_case,
            status='escalated'
        ).filter(
            Q(payload__notice_id=obj.id) | Q(payload__notice_id=str(obj.id))
        ).exists():
            return True
            
        return False


    def get_supporting_docs(self, obj):
        return NoticeDocumentSerializer(
            # ✅ Fetch both approved and pending support docs so they appear in the UI
            obj.documents.filter(doc_type__in=['supporting_doc', 'pending_support']),
            many=True, context=self.context
        ).data

    def get_replies_count(self, obj):
        return obj.replies.count()

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.email
        return None

    def get_court_notice_docs(self, obj):
        return NoticeDocumentSerializer(
            obj.documents.filter(doc_type='court_notice'),
            many=True, context=self.context
        ).data

    def get_pending_docs(self, obj):
        return NoticeDocumentSerializer(
            obj.documents.filter(doc_type='pending'),
            many=True, context=self.context
        ).data

    def get_reply_docs(self, obj):
        return NoticeDocumentSerializer(
            obj.documents.filter(doc_type='reply'),
            many=True, context=self.context
        ).data

    def get_documents(self, obj):
        return NoticeDocumentSerializer(
            obj.documents.all(),
            many=True, context=self.context
        ).data

    # ✅ NEW helper methods
    def get_sub_service_name(self, obj):
        """Fetch sub_service name from linked TDSLitigation or IncomeTaxLitigation."""
        from .models import TDSLitigation, IncomeTaxLitigation
        job_id = obj.court_case.job_id
        if not job_id:
            return None
        Model = TDSLitigation if obj.court_case.litigation_type == 'tds' else IncomeTaxLitigation
        job = Model.objects.filter(id=job_id).select_related('sub_service').first()
        return job.sub_service.name if job and job.sub_service else None

    def get_task_id(self, obj):
        """Fetch task_id from linked Task via TDS/IT litigation."""
        from .models import TDSLitigation, IncomeTaxLitigation
        job_id = obj.court_case.job_id
        if not job_id:
            return None
        Model = TDSLitigation if obj.court_case.litigation_type == 'tds' else IncomeTaxLitigation
        job = Model.objects.filter(id=job_id).select_related('task').first()
        if job and job.task:
            return job.task.task_id
        return None

    def get_task_period(self, obj):
        """Fetch task period from linked Task."""
        from .models import TDSLitigation, IncomeTaxLitigation
        job_id = obj.court_case.job_id
        if not job_id:
            return None
        Model = TDSLitigation if obj.court_case.litigation_type == 'tds' else IncomeTaxLitigation
        job = Model.objects.filter(id=job_id).select_related('task').first()
        if job and job.task:
            return job.task.period
        return None

class CaseClosureDocumentSerializer(serializers.ModelSerializer):
    file_url          = serializers.SerializerMethodField()
    uploaded_by_name  = serializers.SerializerMethodField()
    doc_type_display  = serializers.CharField(source='get_doc_type_display', read_only=True)

    class Meta:
        model  = CaseClosureDocument
        fields = [
            'id', 'court_case', 'doc_type', 'doc_type_display',
            'file', 'file_url', 'file_name',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = [
            'file_name', 'uploaded_by', 'uploaded_at',
            'file_url', 'uploaded_by_name', 'doc_type_display',
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.email
        return None



class DocumentCategorySerializer(serializers.ModelSerializer):
    documents = ClientCustomDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = DocumentCategory
        fields = ['id', 'client', 'court_case', 'job_id', 'label', 'created_at', 'documents','litigation_type']
        read_only_fields = ['court_case', 'job_id','litigation_type']




class CourtCaseStatusLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CourtCaseStatusLog
        fields = [
            'id', 'event_type', 'old_status', 'new_status', 'note',
            'changed_by', 'changed_by_name', 'created_at',
            'case_number', 'court_name', 'case_type', 'appeal_stage',
            'next_hearing_date', 'adjourned_date', 'adjournment_reason',
            'judgement_info', 'next_action',
            'officer', 'din_number', 'notice_date', 'due_date', 'ph_date',
        ]

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.email
        return 'Unknown'



class CourtCaseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    makers = serializers.SerializerMethodField()
    checkers = serializers.SerializerMethodField()
    status_logs = CourtCaseStatusLogSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    computed_status = serializers.SerializerMethodField()  # ← NEW
    notices = CaseNoticeSerializer(many=True, read_only=True)

    closure_documents          = serializers.SerializerMethodField()
    closure_ready_to_submit    = serializers.SerializerMethodField()
    closure_reviewed_by_name   = serializers.SerializerMethodField()
    closure_submitted_by_name  = serializers.SerializerMethodField()


    class Meta:
        model = CourtCase
        fields = [
            'id', 'client', 'client_name', 'litigation_type', 'job_id', 'case_title', 'case_type', 'court_name',
            'case_number', 'status', 'computed_status', 'next_hearing_date', 'due_date', 'appeal_stage', 'notes',
            'rejection_reason', 'checker_flagged', 'checker_flag_note', 'close_reason', 'checker_approved_close',
            'makers', 'checkers', 'status_logs',
            'created_by', 'created_by_name', 'created_at', 'updated_at', 'adjourned_date', 'adjournment_reason',
            'job_description', 'submitted_to_court', 'court_response',
            'officer', 'din_number', 'notice_date', 'ph_date','notices',
            'closure_review_status', 'closure_review_note',
            'closure_reviewed_by', 'closure_reviewed_by_name', 'closure_reviewed_at',
            'closure_submitted_by', 'closure_submitted_by_name', 'closure_submitted_at',
            'closure_documents', 'closure_ready_to_submit',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'created_by_name', 'status_logs', 'status', 'computed_status','job_id']
        extra_kwargs = {
            'next_hearing_date': {'allow_null': True, 'required': False},
            'due_date': {'allow_null': True, 'required': False},
            'adjourned_date': {'allow_null': True, 'required': False},
            'notice_date': {'allow_null': True, 'required': False},
            'ph_date': {'allow_null': True, 'required': False},
        }



    def get_computed_status(self, obj):
        # ✅ Priority 1: Case closed via bundle workflow
        if obj.status == 'closed':
            return 'closed'

        notices = obj.notices.all()
        if not notices.exists():
            return 'wip'

        # ✅ Priority 2: Attention required — any wip/under_review notice with due ≤5d or overdue
        if _case_has_attention_required(notices):
            return 'attention_required'

        statuses = set(n.status for n in notices)

        # ✅ Priority 3: Any wip or under_review → wip
        if 'wip' in statuses or 'under_review' in statuses:
            return 'wip'

        # ✅ Priority 4: All open → open
        if statuses == {'open'}:
            return 'open'

        return 'wip'


    def get_closure_documents(self, obj):
        """
        Returns closure documents ONLY when appropriate:
        - draft/pending/escalated/approved → return docs
        - rejected → return EMPTY (Maker re-uploads; sees rejection details separately)
        - not_started → return empty (nothing uploaded)
        """
        if obj.closure_review_status == 'rejected':
            return []  # ✅ Hide rejected docs — Maker starts fresh

        return CaseClosureDocumentSerializer(
            obj.closure_documents.all(),
            many=True, context=self.context
        ).data

    def get_closure_ready_to_submit(self, obj):
        """
        True when all 3 required doc types are uploaded AND bundle is in draft state.
        """
        if obj.closure_review_status != 'draft':
            return False
        if obj.status == 'closed':
            return False
        uploaded_types = set(
            obj.closure_documents.values_list('doc_type', flat=True)
        )
        return uploaded_types == {'order', 'demand_notice', 'computation_sheet'}

    def get_closure_reviewed_by_name(self, obj):
        if obj.closure_reviewed_by:
            return obj.closure_reviewed_by.get_full_name() or obj.closure_reviewed_by.email
        return None

    def get_closure_submitted_by_name(self, obj):
        if obj.closure_submitted_by:
            return obj.closure_submitted_by.get_full_name() or obj.closure_submitted_by.email
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def get_makers(self, obj):
        return [{'id': u.id, 'name': u.get_full_name() or u.email} for u in obj.makers.all()]

    def get_checkers(self, obj):
        return [{'id': u.id, 'name': u.get_full_name() or u.email} for u in obj.checkers.all()]

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        instance = super().create(validated_data)
        CourtCaseStatusLog.objects.create(
            case=instance, event_type='created', old_status=None, new_status=instance.status,
            note='Case created', changed_by=request.user if request else None
        )
        return instance

    def update(self, instance, validated_data):
        old_status = instance.status
        instance = super().update(instance, validated_data)
        new_status = instance.status
        if old_status != new_status:
            request = self.context.get('request')
            CourtCaseStatusLog.objects.create(
                case=instance, old_status=old_status, new_status=new_status,
                note=self.context.get('status_change_note', ''),
                changed_by=request.user if request else None
            )
        return instance


class ReviewRequestSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    case_title = serializers.CharField(source='court_case.case_title', read_only=True)
    litigation_type = serializers.CharField(source='court_case.litigation_type', read_only=True)
    client_name = serializers.CharField(source='court_case.client.name', read_only=True)
    client_id = serializers.IntegerField(source='court_case.client_id', read_only=True)
    job_id = serializers.IntegerField(source='court_case.job_id', read_only=True)

    # ── NEW: tell frontend what current user can do ──
    viewer_role = serializers.SerializerMethodField()

    class Meta:
        model = ReviewRequest
        fields = [
            'id', 'court_case', 'case_title', 'client_id', 'client_name', 'litigation_type','job_id', 
            'action_type', 'action_type_display',
            'payload', 'status', 'status_display',
            'submitted_by', 'submitted_by_name', 'submitted_at',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'review_note', 'escalated_to_founder',
            'viewer_role',   # ← NEW
        ]
        read_only_fields = fields

    def get_submitted_by_name(self, obj):
        if obj.submitted_by:
            return obj.submitted_by.get_full_name() or obj.submitted_by.email
        return 'Unknown'

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.email
        return None

    # ✅ NEW METHOD — tells frontend current user's relation to this review
    def get_viewer_role(self, obj):
        """
        Returns one of:
          'submitter'  — user is the maker who submitted this
          'checker'    — user is assigned checker (can approve/reject/escalate)
          'admin'      — Admin/Founder/Manager (can do everything)
          'founder'    — Founder/Admin (can act on escalated)
          'viewer'     — can only view
        """
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return 'viewer'

        user = request.user

        # Import here to avoid circular
        from .permissions import (
            is_admin_role, is_high_admin, is_case_checker
        )

        # Submitter?
        if obj.submitted_by_id == user.id:
            return 'submitter'

        # Founder/Admin (highest priority — can act on everything)
        if is_high_admin(user):
            return 'founder'

        # Any admin (Manager)
        if is_admin_role(user):
            return 'admin'

        # Assigned checker on the case?
        if is_case_checker(obj.court_case, user):
            return 'checker'

        return 'viewer' 


class NoticeReplySerializer(serializers.ModelSerializer):
    created_by_name     = serializers.SerializerMethodField()
    last_edited_by_name = serializers.SerializerMethodField()
    reviewed_by_name    = serializers.SerializerMethodField()

    class Meta:
        model  = NoticeReply
        fields = [
            'id', 'notice',
            'title', 'content_html', 'status',
            'is_final_reply',
            'created_by', 'created_by_name',
            'last_edited_by', 'last_edited_by_name',
            'reviewed_by', 'reviewed_by_name',
            'review_note', 'reviewed_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'created_by', 'last_edited_by', 'reviewed_by',
            'reviewed_at', 'created_at', 'updated_at',
            'created_by_name', 'last_edited_by_name', 'reviewed_by_name',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def get_last_edited_by_name(self, obj):
        if obj.last_edited_by:
            return obj.last_edited_by.get_full_name() or obj.last_edited_by.email
        return None

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.email
        return None