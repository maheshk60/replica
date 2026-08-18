# legal_services/utils.py
from .models import LegalCaseAuditLog


def log_event(*, client_id, litigation_type, event_type, title,
              description='', user=None, old_values=None, new_values=None, court_case=None, job_id=None):
    """
    Log a single audit event to LegalCaseAuditLog, scoped to one client
    and one litigation type (TDS or Income Tax).
    """
    LegalCaseAuditLog.objects.create(
        client_id=client_id,
        litigation_type=litigation_type,
        court_case=court_case, 
        job_id=job_id,
        event_type=event_type,
        title=title,
        description=description,
        by=user,
        old_values=old_values,
        new_values=new_values,
    )


def diff_fields(instance, validated_data, tracked_fields):
    """
    Returns (old, new) dicts containing only fields that actually changed.
    """
    old, new = {}, {}
    for field in tracked_fields:
        if field not in validated_data:
            continue
        old_val = getattr(instance, field, None)
        new_val = validated_data[field]
        old_str = str(old_val) if old_val is not None else None
        new_str = str(new_val) if new_val is not None else None
        if old_str != new_str:
            old[field] = old_str
            new[field] = new_str
    return old, new


def log_shared_event(*, client_id, event_type, title, description='',
                     user=None, old_values=None, new_values=None):
    """
    For actions on Information/Documents — shared data any Maker from
    either TDS or Income Tax can edit. Logs once per litigation type
    that actually has a case for this client, so it shows up in BOTH
    Audit Trail tabs (TDS + Income Tax).

    Uses django.apps.apps.get_model() to avoid circular imports —
    safe to call from any app.
    """
    from django.apps import apps

    TDSLitigation = apps.get_model('legal_services', 'TDSLitigation')
    IncomeTaxLitigation = apps.get_model('legal_services', 'IncomeTaxLitigation')

    if TDSLitigation.objects.filter(client_id=client_id).exists():
        log_event(
            client_id=client_id, litigation_type='tds',
            event_type=event_type, title=title, description=description,
            user=user, old_values=old_values, new_values=new_values,
        )
    if IncomeTaxLitigation.objects.filter(client_id=client_id).exists():
        log_event(
            client_id=client_id, litigation_type='income-tax',
            event_type=event_type, title=title, description=description,
            user=user, old_values=old_values, new_values=new_values,
        )