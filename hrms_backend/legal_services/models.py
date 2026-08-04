
# legal_services/models.py

from django.db import models, transaction
from django.conf import settings
from django.utils.timezone import now
from clients.models import Client,SubService
from employee.models import Employee
from django.db.models import Q

PERIOD_CHOICES = [
    ("Monthly", "Monthly"),
    ("Quarterly", "Quarterly"),
    ("Half-Yearly", "Half-Yearly"),
    ("Annually", "Annually"),
]
 

# -------------------------
# Shared abstract base for all legal case types
# -------------------------
class BaseLegalCase(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('pending_client', 'Pending from Client'),
        ('closed', 'Closed'),
    ]
    
    document = models.FileField(upload_to='legal_services/%(class)s/', null=True, blank=True)

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='%(class)s_cases')
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_assigned'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    description = models.TextField(blank=True, null=True)
    notice_date = models.DateField(blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    makers = models.ManyToManyField(
    settings.AUTH_USER_MODEL, blank=True, related_name='%(class)s_makers'
    )
    checkers = models.ManyToManyField(
    settings.AUTH_USER_MODEL, blank=True, related_name='%(class)s_checkers'
    )

    class Meta:
        abstract = True
        ordering = ['-created_at']


import re

class TDSLitigation(BaseLegalCase):
    reference_no = models.CharField(max_length=100, unique=True, blank=True)
    sub_service = models.ForeignKey(
        'clients.SubService', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='tds_litigations'
    )
    assessment_year = models.CharField(max_length=50, blank=True, null=True)
    period = models.CharField(
        max_length=20,
        choices=PERIOD_CHOICES,
        null=True,
        blank=True,
    )

    assigned_to = models.ManyToManyField(
        'employee.Employee',
        blank=True,
        related_name='+',
    )

    def save(self, *args, **kwargs):
        if not self.reference_no:
            self.reference_no = self._generate_reference("CKPSCA-TDS")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.client.name} - {self.reference_no}"

    def _generate_reference(self, prefix):
        """Shared FY-based reference number generator, same pattern as STTRecord."""
        today = now().date()
        year = today.year
        if today.month >= 4:
            fy_start, fy_end = year, year + 1
        else:
            fy_start, fy_end = year - 1, year
        fy_str = f"{fy_start}-{str(fy_end)[-2:]}"

        with transaction.atomic():
            last_record = self.__class__.objects.filter(
                reference_no__icontains=f"-{fy_str}"
            ).order_by('-id').first()

            next_number = 1
            if last_record and last_record.reference_no:
                match = re.search(r'-(\d{4})-\d{4}-\d{2}$', last_record.reference_no)
                if match:
                    next_number = int(match.group(1)) + 1

            return f"{prefix}-{next_number:04d}-{fy_str}"




class IncomeTaxLitigation(BaseLegalCase):
    reference_no = models.CharField(max_length=100, unique=True, blank=True)
    sub_service = models.ForeignKey(
        'clients.SubService', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='income_tax_litigations'
    )
    assessment_year = models.CharField(max_length=50, blank=True, null=True)
    period = models.CharField(
        max_length=20,
        choices=PERIOD_CHOICES,
        null=True,
        blank=True,
    )

    assigned_to = models.ManyToManyField(
        'employee.Employee',
        blank=True,
        related_name='+',
    )
    
    notice_section = models.CharField(max_length=50, blank=True, null=True)
    demand_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.reference_no:
            self.reference_no = self._generate_reference("CKPSCA-ITL")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.client.name} - {self.reference_no}"

    def _generate_reference(self, prefix):
        today = now().date()
        year = today.year
        if today.month >= 4:
            fy_start, fy_end = year, year + 1
        else:
            fy_start, fy_end = year - 1, year
        fy_str = f"{fy_start}-{str(fy_end)[-2:]}"

        with transaction.atomic():
            last_record = self.__class__.objects.filter(
                reference_no__icontains=f"-{fy_str}"
            ).order_by('-id').first()

            next_number = 1
            if last_record and last_record.reference_no:
                import re
                match = re.search(r'-(\d{4})-\d{4}-\d{2}$', last_record.reference_no)
                if match:
                    next_number = int(match.group(1)) + 1

            return f"{prefix}-{next_number:04d}-{fy_str}"




# -------------------------
# MCA — simple shared structure (extend later if needed)
# -------------------------
class MCACase(BaseLegalCase):
    reference_no = models.CharField(max_length=100, unique=True, blank=True)
    filing_type = models.CharField(max_length=150, blank=True, null=True)  # e.g. AOC-4, MGT-7, DIR-3 KYC

    def save(self, *args, **kwargs):
        if not self.reference_no:
            self.reference_no = self._generate_reference("CKPSCA-MCA")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.client.name} - {self.reference_no}"


# -------------------------
# FEMA — simple shared structure
# -------------------------
class FEMACase(BaseLegalCase):
    reference_no = models.CharField(max_length=100, unique=True, blank=True)
    filing_type = models.CharField(max_length=150, blank=True, null=True)  # e.g. FC-GPR, FLA Return, ODI

    def save(self, *args, **kwargs):
        if not self.reference_no:
            self.reference_no = self._generate_reference("CKPSCA-FEMA")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.client.name} - {self.reference_no}"


# -------------------------
# Partnership — simple shared structure
# -------------------------
class PartnershipCase(BaseLegalCase):
    reference_no = models.CharField(max_length=100, unique=True, blank=True)
    document_type = models.CharField(max_length=150, blank=True, null=True)  # e.g. Deed drafting, Amendment

    def save(self, *args, **kwargs):
        if not self.reference_no:
            self.reference_no = self._generate_reference("CKPSCA-PTR")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.client.name} - {self.reference_no}"




class LegalCaseAuditLog(models.Model):
    EVENT_TYPES = [
        ('case_created', 'Case Created'),
        ('info_update', 'Information Updated'),
        ('doc_upload', 'Document Uploaded'),
        ('doc_delete', 'Document Deleted'),
        ('status_change', 'Status Changed'),
        ('assignment', 'Maker/Checker Assigned'),
        ('activity_update', 'Case Details Updated'),
        ('note', 'Note'),
    ]
    litigation_type = models.CharField(max_length=20, choices=[('tds', 'TDS'), ('income-tax', 'Income Tax')])
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='legal_audit_logs')
    job_id = models.IntegerField(null=True, blank=True, db_index=True)

    # ── NEW: link to specific case (nullable so old rows stay valid) ──
    court_case = models.ForeignKey(
        'CourtCase',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='audit_logs',
    )
    
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client', 'litigation_type', '-created_at']),
            models.Index(fields=['court_case']),   # ← optional, for faster job filter
        ]








# class DocumentCategory(models.Model):
#     client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='document_categories')
#     label = models.CharField(max_length=150)
#     created_at = models.DateTimeField(auto_now_add=True)

#     def __str__(self):
#         return f"{self.client.name} - {self.label}"




class DocumentCategory(models.Model):
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='document_categories')
    court_case = models.ForeignKey(                        # ✅ NEW
        'CourtCase',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='document_categories',
    )
    job_id = models.IntegerField(null=True, blank=True, db_index=True)
    label = models.CharField(max_length=150)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.client.name} - {self.label}"


class ClientCustomDocument(models.Model):
    category = models.ForeignKey(DocumentCategory, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to='client_documents/%Y/%m/')
    document_name = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.document_name and self.file:
            self.document_name = self.file.name.split('/')[-1]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.document_name


class CourtCase(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('wip', 'WIP'),
        ('closed', 'Closed'),
    ]

    ADJOURNMENT_REASON_CHOICES = [
        ('fever', 'Fever'),
        ('travelling', 'Travelling'),
        ('personal_emergency', 'Personal Emergency'),
        ('family_function', 'Family Function'),
        ('client_unavailable', 'Client Unavailable'),
        ('document_not_completed', 'Document Not Completed'),
        ('lawyer_unavailable', 'Lawyer Unavailable'),
        ('court_holiday', 'Court Holiday'),
        ('opposing_party_request', 'Opposing Party Request'),
        ('other', 'Other'),
    ]

    APPEAL_STAGE_CHOICES = [
        ('first_appeal', 'First Appeal'),
        ('second_appeal', 'Second Appeal'),
        ('tribunal', 'Tribunal'),
        ('high_court', 'High Court'),
        ('supreme_court', 'Supreme Court'),
        ('not_applicable', 'Not Applicable'),
    ]

    CASE_TYPE_CHOICES = [
        ('civil', 'Civil'),
        ('criminal', 'Criminal'),
        ('tax', 'Tax Matter'),
        ('corporate', 'Corporate'),
        ('constitutional', 'Constitutional'),
        ('administrative', 'Administrative'),
        ('other', 'Other'),
    ]

    LITIGATION_TYPE_CHOICES = [
        ('tds', 'TDS'),
        ('income-tax', 'Income Tax'),
    ]

    # NOTE: was 'Client' (same-app string ref) — now MUST use the
    # 'app_label.ModelName' form since Client lives in a different app.
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='court_cases')
    litigation_type = models.CharField(max_length=20, choices=LITIGATION_TYPE_CHOICES, default='tds')
    job_id = models.IntegerField(null=True, blank=True, db_index=True)

    case_title = models.CharField(max_length=255)
    case_type = models.CharField(max_length=30, choices=CASE_TYPE_CHOICES, blank=True, null=True)
    court_name = models.CharField(max_length=255, blank=True, null=True)
    case_number = models.CharField(max_length=100, blank=True, null=True)
    appeal_stage = models.CharField(max_length=30, choices=APPEAL_STAGE_CHOICES, blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='wip')
    next_hearing_date = models.DateField(blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    adjourned_date = models.DateField(blank=True, null=True)
    adjournment_reason = models.CharField(max_length=40, choices=ADJOURNMENT_REASON_CHOICES, blank=True, null=True)

    makers = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='court_case_makers')
    checkers = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='court_case_checkers')

    submitted_to_court = models.BooleanField(default=False)
    court_response = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')],
        default='pending', blank=True, null=True
    )
    rejection_reason = models.TextField(blank=True, null=True)

    close_reason = models.TextField(blank=True, null=True)
    checker_flagged = models.BooleanField(default=False)
    checker_flag_note = models.TextField(blank=True, null=True)
    checker_approved_close = models.BooleanField(default=False)

    notes = models.TextField(blank=True, null=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_court_cases')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    job_description = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['job_id'],
                condition=Q(job_id__isnull=False),
                name='unique_courtcase_per_job'
            )
        ]

    def __str__(self):
        return f"{self.client.name} - {self.case_title}"


class CourtCaseStatusLog(models.Model):
    EVENT_TYPES = [
        ('created', 'Case Created'),
        ('description', 'Job Description'),
        ('step', 'Daily Update'),
        ('appeal', 'Appeal Filed'),
        ('adjournment', 'Adjourned'),
        ('outcome_won', 'Case Won'),
        ('outcome_lost', 'Case Lost'),
    ]
    case = models.ForeignKey(CourtCase, on_delete=models.CASCADE, related_name='status_logs')
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES, default='step')
    old_status = models.CharField(max_length=20, blank=True, null=True)
    new_status = models.CharField(max_length=20, blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    case_number = models.CharField(max_length=100, blank=True, null=True)
    court_name = models.CharField(max_length=255, blank=True, null=True)
    case_type = models.CharField(max_length=30, blank=True, null=True)
    appeal_stage = models.CharField(max_length=30, blank=True, null=True)
    next_hearing_date = models.DateField(blank=True, null=True)
    adjourned_date = models.DateField(blank=True, null=True)
    adjournment_reason = models.CharField(max_length=40, blank=True, null=True)
    judgement_info = models.TextField(blank=True, null=True)
    next_action = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']





class ReviewRequest(models.Model):
    """
    Maker submits an action → creates a ReviewRequest (pending).
    Checker/Founder approves → the action is applied to the CourtCase.
    """

    ACTION_TYPES = [
        ('summary',      'Summary Update'),
        ('step',         'Daily Update'),
        ('appeal',       'Submit Appeal'),
        ('adjournment',  'Log Adjournment'),
    ]

    STATUS_CHOICES = [
        ('pending',    'Pending Review'),
        ('approved',   'Approved'),
        ('rejected',   'Rejected'),
        ('escalated',  'Escalated to Founder'),
    ]

    court_case = models.ForeignKey(
        CourtCase,
        on_delete=models.CASCADE,
        related_name='review_requests',
    )
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)

    # ── The full payload from the maker's action, stored as JSON.  ──
    # Applied to the case when approved.
    payload = models.JSONField(default=dict, blank=True)

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')

    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='submitted_reviews',
    )
    submitted_at = models.DateTimeField(auto_now_add=True)

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_reviews',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Rejection reason (only when rejected)
    review_note = models.TextField(blank=True, default='')

    # Set to True when Checker clicked "Move to Founder"
    escalated_to_founder = models.BooleanField(default=False)

    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['court_case', 'status']),
            models.Index(fields=['status', '-submitted_at']),
        ]

    def __str__(self):
        return f"[{self.status}] {self.action_type} — Case {self.court_case_id}"