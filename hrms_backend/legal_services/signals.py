# legal_services/signals.py

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from clients.models import Client               # ← just import, don't modify
from .context import get_context
from .utils import log_event


TRACKED_CLIENT_FIELDS = [
    'name', 'email', 'phone', 'address',
    'contact_person', 'nature_of_business',
    'gstin', 'pan', 'tan', 'cin', 'iec',
    'lei', 'ksea', 'udyam', 'apt', 'ept',
    'constitution',
]


# ── Capture old values BEFORE save ──
@receiver(pre_save, sender=Client)
def capture_client_old_values(sender, instance, **kwargs):
    if not instance.pk:
        instance._legal_old_vals = {}
        return
    try:
        old = Client.objects.get(pk=instance.pk)
        instance._legal_old_vals = {
            f: str(getattr(old, f, '') or '')
            for f in TRACKED_CLIENT_FIELDS
        }
    except Client.DoesNotExist:
        instance._legal_old_vals = {}



@receiver(post_save, sender=Client)
def log_client_info_update(sender, instance, created, **kwargs):
    if created:
        return

    old_vals = getattr(instance, '_legal_old_vals', {})
    if not old_vals:
        return

    new_vals = {
        f: str(getattr(instance, f, '') or '')
        for f in TRACKED_CLIENT_FIELDS
    }
    changed_old = {k: v for k, v in old_vals.items() if v != new_vals.get(k)}
    changed_new = {k: new_vals[k] for k in changed_old}
    if not changed_old:
        return

    ctx = get_context()
    litigation_type = ctx.get('litigation_type')
    court_case_id = ctx.get('court_case_id')
    job_id = ctx.get('job_id')          # ✅ ADD THIS LINE
    user = ctx.get('user')

    if not litigation_type:
        return

    court_case = None
    if court_case_id:
        try:
            from .models import CourtCase
            court_case = CourtCase.objects.filter(id=court_case_id).first()
        except Exception:
            court_case = None

    log_event(
        client_id=instance.id,
        litigation_type=litigation_type,
        court_case=court_case,
        job_id=job_id,                  # ✅ ADD THIS LINE
        event_type='info_update',
        title='Client information updated',
        description=f'Fields changed: {", ".join(changed_old.keys())}',
        user=user,
        old_values=changed_old,
        new_values=changed_new,
    )



# ══════════════════════════════════════════════════════════════════
# ✅ Auto-create a legal_services job when a Task is created
# under a SubService tagged with a job_category legal_services recognizes.
# ══════════════════════════════════════════════════════════════════
from clients.models import Task                 # ← just import, don't modify
from .models import TDSLitigation, IncomeTaxLitigation, MCACase, FEMACase, PartnershipCase

@receiver(post_save, sender=Task)
def create_litigation_job_from_task(sender, instance, created, **kwargs):
    """
    Auto-create legal job when Task is created.
    - job_category 'mca' → MCACase (Company + LLP forms)
    - service_group ONLY from Client.constitution.name:
        'LLP'     → llp
        'Company' → company
        empty     → company (default)
    """
    if not created:
        return

    sub_service = instance.sub_service
    if not sub_service or not sub_service.job_category or not instance.client:
        return

    job_category = (sub_service.job_category or '').strip().lower()
    if not job_category:
        return

    from .models import (
        TDSLitigation, IncomeTaxLitigation, MCACase,
        FEMACase, PartnershipCase,
    )
    from .utils import log_event

    JOB_CATEGORY_MODEL_MAP = {
        'tds': TDSLitigation,
        'income-tax': IncomeTaxLitigation,
        'mca': MCACase,
        'fema': FEMACase,
        'partnership': PartnershipCase,
    }

    model_cls = JOB_CATEGORY_MODEL_MAP.get(job_category)
    if not model_cls:
        return

    create_kwargs = {
        'client': instance.client,
        'due_date': instance.due_date,
        'created_by': instance.created_by,
    }

    if model_cls in (TDSLitigation, IncomeTaxLitigation, MCACase):
        create_kwargs['sub_service'] = sub_service
        create_kwargs['task'] = instance

    # ── MCA: page = constitution only ("Company" | "LLP") ───────────
    if model_cls is MCACase:
        service_group = 'company'  # default if constitution empty

        constitution = getattr(instance.client, 'constitution', None)
        const_name = (getattr(constitution, 'name', None) or '').strip()

        if const_name == 'LLP':
            service_group = 'llp'
        elif const_name == 'Company':
            service_group = 'company'
        # else: keep 'company'

        create_kwargs['service_group'] = service_group
    # ────────────────────────────────────────────────────────────────

    job = model_cls.objects.create(**create_kwargs)

    #added this line 
    if model_cls in (TDSLitigation, IncomeTaxLitigation, MCACase):
        _sync_task_mc_to_legal_jobs(instance)

    litigation_type_map = {
        TDSLitigation: 'tds',
        IncomeTaxLitigation: 'income-tax',
        MCACase: 'mca',
        FEMACase: 'fema',
        PartnershipCase: 'partnership',
    }
    lit_type = litigation_type_map.get(model_cls)

    if lit_type not in ('tds', 'income-tax', 'mca'):
        return

    new_values = {
        'task_id': instance.task_id,
        'client_name': instance.client.name if instance.client else None,
    }
    if model_cls is MCACase:
        new_values.update({
            'job_category': 'mca',
            'service_group': getattr(job, 'service_group', None),
            'sub_service': sub_service.name,
            'constitution': (
                getattr(getattr(instance.client, 'constitution', None), 'name', None)
            ),
        })

    try:
        log_event(
            client_id=job.client_id,
            litigation_type=lit_type,
            job_id=job.id,
            event_type='case_created',
            title='Task Created',
            user=instance.created_by,
            new_values=new_values,
        )
    except Exception:
        pass



# ══════════════════════════════════════════════════════════════════
# Sync Maker/Checker from Task → Legal Jobs
# ══════════════════════════════════════════════════════════════════
from clients.models import TaskAssignment
from django.db.models.signals import post_save

def _sync_task_mc_to_legal_jobs(task):
    if not task:
        return
    active = TaskAssignment.objects.filter(task=task, is_active=True)
    maker_ids   = list(active.filter(role='maker').values_list('user_id', flat=True))
    checker_ids = list(active.filter(role='checker').values_list('user_id', flat=True))
    if not maker_ids and not checker_ids:
        return
    legal_jobs = []
    for rel in ['tds_litigation_jobs', 'income_tax_litigation_jobs', 'mca_cases']:
        if hasattr(task, rel):
            legal_jobs.extend(getattr(task, rel).all())
    for job in legal_jobs:
        job.makers.set(maker_ids)
        job.checkers.set(checker_ids)

@receiver(post_save, sender=TaskAssignment)
def sync_mc_on_assignment_save(sender, instance, **kwargs):
    if instance.role:
        _sync_task_mc_to_legal_jobs(instance.task)