import os
import sys
import django
from datetime import datetime

# ==============================================================================
# 1. DJANGO ENVIRONMENT SETUP
# ==============================================================================
# Change 'core.settings' to your project's settings module if different
# (e.g., 'backend.settings', 'config.settings', 'app.settings')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hrms_backend.settings")
django.setup()

from django.db import transaction
from django.utils.timezone import make_aware
from clients.models import Task
from legal_services.models import (
    TDSLitigation, IncomeTaxLitigation, MCACase, FEMACase, PartnershipCase
)
from legal_services.signals import create_litigation_job_from_task


# ==============================================================================
# 2. CONFIGURATION PARAMETERS (Edit these as needed)
# ==============================================================================

# Set to True to preview actions WITHOUT saving to the database.
# Set to False to actually create records in the database.
DRY_RUN = False

# Target a specific Task ID (e.g. "CKPSCA-STT-5781-25-26").
# Set to None if you want to run for a date/month range instead.
SPECIFIC_TASK_ID = "CKPSCA-STT-5781-25-26"

# Date range filters (YYYY-MM-DD format). Used ONLY if SPECIFIC_TASK_ID is None.
# Filters Tasks based on created_at or due_date.
START_DATE = "2025-04-01"
END_DATE = "2026-03-31"
DATE_FIELD = "created_at"  # Choose 'created_at' or 'due_date'


# ==============================================================================
# 3. MAPPING & HELPERS
# ==============================================================================
JOB_CATEGORY_MODEL_MAP = {
    'tds': TDSLitigation,
    'income-tax': IncomeTaxLitigation,
    'mca': MCACase,
    'fema': FEMACase,
    'partnership': PartnershipCase,
}


def get_existing_job(task, job_category):
    """Checks if a Legal Job already exists for this task."""
    model_cls = JOB_CATEGORY_MODEL_MAP.get(job_category)
    if not model_cls:
        return None
    return model_cls.objects.filter(task=task).first()


def run_process():
    print("=" * 80)
    print(f" 🚀 LEGAL JOB CREATION / BACKFILL SCRIPT ")
    print(f" MODE: {'[DRY RUN - PREVIEW ONLY]' if DRY_RUN else '[LIVE RUN - WILL WRITE TO DATABASE]'}")
    print("=" * 80)

    # --------------------------------------------------------------------------
    # Query Selection
    # --------------------------------------------------------------------------
    if SPECIFIC_TASK_ID:
        print(f"🎯 Target Mode: Specific Task ID = '{SPECIFIC_TASK_ID}'")
        tasks = Task.objects.filter(task_id=SPECIFIC_TASK_ID)
    else:
        print(f"📅 Range Mode: Filter [{DATE_FIELD}] from '{START_DATE}' to '{END_DATE}'")
        start_dt = make_aware(datetime.strptime(START_DATE, "%Y-%m-%d"))
        end_dt = make_aware(datetime.strptime(f"{END_DATE} 23:59:59", "%Y-%m-%d %H:%M:%S"))

        filter_kwargs = {
            f"{DATE_FIELD}__gte": start_dt,
            f"{DATE_FIELD}__lte": end_dt,
        }
        tasks = Task.objects.filter(**filter_kwargs).order_by('created_at')

    total_tasks = tasks.count()
    print(f"📋 Found {total_tasks} Task record(s) matching criteria.\n")

    if total_tasks == 0:
        print("❌ No matching tasks found. Exiting.")
        return

    # --------------------------------------------------------------------------
    # Processing Tasks
    # --------------------------------------------------------------------------
    stats = {
        'total': total_tasks,
        'created': 0,
        'skipped_exists': 0,
        'skipped_no_category': 0,
        'skipped_no_client': 0,
        'errors': 0,
    }

    print("-" * 80)
    print(f"{'TASK ID':<25} | {'CLIENT NAME':<25} | {'CATEGORY':<12} | {'STATUS / ACTION'}")
    print("-" * 80)

    for task in tasks:
        task_code = task.task_id or f"ID #{task.id}"
        client_name = task.client.name[:24] if task.client else "NO CLIENT"
        sub_service = task.sub_service
        job_category = (sub_service.job_category or '').strip().lower() if sub_service else ''

        # Validation Checks
        if not task.client:
            print(f"{task_code:<25} | {client_name:<25} | {job_category:<12} | ⚠️ SKIPPED (No client attached)")
            stats['skipped_no_client'] += 1
            continue

        if not sub_service or not job_category:
            sub_name = sub_service.name if sub_service else "None"
            print(f"{task_code:<25} | {client_name:<25} | {'NONE':<12} | ⚠️ SKIPPED (SubService '{sub_name}' has no job_category)")
            stats['skipped_no_category'] += 1
            continue

        if job_category not in JOB_CATEGORY_MODEL_MAP:
            print(f"{task_code:<25} | {client_name:<25} | {job_category:<12} | ⚠️ SKIPPED (Category '{job_category}' not recognized)")
            stats['skipped_no_category'] += 1
            continue

        # Check for existing job
        existing = get_existing_job(task, job_category)
        if existing:
            ref = getattr(existing, 'reference_no', f'Job ID #{existing.id}')
            print(f"{task_code:<25} | {client_name:<25} | {job_category:<12} | ℹ️ SKIPPED (Already linked to {ref})")
            stats['skipped_exists'] += 1
            continue

        # Execution Logic
        model_cls = JOB_CATEGORY_MODEL_MAP[job_category]
        target_model_name = model_cls.__name__

        if DRY_RUN:
            print(f"{task_code:<25} | {client_name:<25} | {job_category:<12} | 🧪 WOULD CREATE -> {target_model_name}")
            stats['created'] += 1
        else:
            try:
                with transaction.atomic():
                    # Call the signal function logic directly
                    create_litigation_job_from_task(sender=Task, instance=task, created=True)

                    # Fetch the created job for reporting
                    new_job = get_existing_job(task, job_category)
                    new_ref = getattr(new_job, 'reference_no', 'Created') if new_job else 'Created'

                    print(f"{task_code:<25} | {client_name:<25} | {job_category:<12} | ✅ CREATED ({new_ref})")
                    stats['created'] += 1
            except Exception as e:
                print(f"{task_code:<25} | {client_name:<25} | {job_category:<12} | ❌ ERROR: {str(e)}")
                stats['errors'] += 1

    # --------------------------------------------------------------------------
    # Summary Report
    # --------------------------------------------------------------------------
    print("=" * 80)
    print(" 📊 SUMMARY REPORT")
    print("=" * 80)
    print(f" Total Tasks Evaluated     : {stats['total']}")
    print(f" {'Would Create' if DRY_RUN else 'Successfully Created'}    : {stats['created']}")
    print(f" Skipped (Already Exists)  : {stats['skipped_exists']}")
    print(f" Skipped (Missing Category): {stats['skipped_no_category']}")
    print(f" Skipped (Missing Client)  : {stats['skipped_no_client']}")
    print(f" Errors Encountered        : {stats['errors']}")
    print("=" * 80)

    if DRY_RUN:
        print("\n💡 NOTE: This was a DRY RUN. No database records were modified.")
        print("   To execute live creation, set `DRY_RUN = False` inside the script and re-run.\n")


# ==============================================================================
# 4. ENTRY POINT
# ==============================================================================
if __name__ == "__main__":
    run_process()