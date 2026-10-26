# hrms_backend/reset_job.py
# Universal Multi-Job Reset Tool for MCA, TDS, and Income Tax Jobs.

from django.db import transaction
from legal_services.models import (
    MCACase, MCAFiling, MCAFilingDocument,
    TDSLitigation, IncomeTaxLitigation, CourtCase,
    NoticeDocument, CaseClosureDocument, LegalCaseAuditLog
)

# --- CONFIGURATION ---
# Add as many STT or Task numbers here as you want!
TASK_CODES = [
    'CKPSCA-STT-0021-2026-27',
    'CKPSCA-STT-0022-2026-27'
    ]
DRY_RUN = True  # Set to False when ready for ACTUAL reset!
# ---------------------


def reset_mca(case):
    filings = MCAFiling.objects.filter(mca_case=case)
    docs = MCAFilingDocument.objects.filter(filing__mca_case=case)
    audit_logs = LegalCaseAuditLog.objects.filter(litigation_type='mca', job_id=case.id)

    print("\n[+] Found MCA Job:")
    print("    - Case ID       : " + str(case.id))
    print("    - Reference No  : " + str(case.reference_no))
    print("    - Client        : " + str(case.client.name))
    print("    - Current Status: " + str(case.status))
    print("    - Filings Count : " + str(filings.count()))
    print("    - Docs Count    : " + str(docs.count()))
    print("    - Audit Logs    : " + str(audit_logs.count()))

    if DRY_RUN:
        print("  --> [DRY RUN] MCA Job above WILL be reset.")
        return

    with transaction.atomic():
        for doc in docs:
            if doc.file:
                try:
                    doc.file.delete(save=False)
                except Exception:
                    pass
            doc.delete()

        for filing in filings:
            filing.srn_number = None
            filing.challan_number = None
            filing.status = 'wip'
            filing.stage = 'internal_review'
            filing.notes = ''
            filing.review_status = 'not_applicable'
            filing.review_note = None
            filing.reviewed_by = None
            filing.reviewed_at = None
            filing.srn_review_status = 'not_applicable'
            filing.srn_review_note = None
            filing.srn_reviewed_by = None
            filing.srn_reviewed_at = None
            filing.mca_outcome = 'pending'
            filing.mca_outcome_note = None
            filing.mca_outcome_recorded_by = None
            filing.mca_outcome_recorded_at = None
            filing.save()

        case.status = 'wip'
        case.save(update_fields=['status', 'updated_at'])
        audit_logs.delete()

    print("  --> SUCCESS: MCA Job reset to fresh WIP state!")


def reset_litigation(job, l_type):
    court_cases = CourtCase.objects.filter(litigation_type=l_type, job_id=job.id)
    notice_docs = NoticeDocument.objects.filter(notice__court_case__in=court_cases)
    closure_docs = CaseClosureDocument.objects.filter(court_case__in=court_cases)
    audit_logs = LegalCaseAuditLog.objects.filter(litigation_type=l_type, job_id=job.id)

    print("\n[+] Found " + str(l_type).upper() + " Litigation Job:")
    print("    - Job ID        : " + str(job.id))
    print("    - Reference No  : " + str(job.reference_no))
    print("    - Client        : " + str(job.client.name))
    print("    - Court Cases   : " + str(court_cases.count()))
    print("    - Notice Docs   : " + str(notice_docs.count()))
    print("    - Closure Docs  : " + str(closure_docs.count()))
    print("    - Audit Logs    : " + str(audit_logs.count()))

    if DRY_RUN:
        print("  --> [DRY RUN] " + str(l_type).upper() + " Job above WILL be reset.")
        return

    with transaction.atomic():
        for doc in notice_docs:
            if doc.file:
                try:
                    doc.file.delete(save=False)
                except Exception:
                    pass

        for doc in closure_docs:
            if doc.file:
                try:
                    doc.file.delete(save=False)
                except Exception:
                    pass

        court_cases.delete()
        job.status = 'open'
        job.save(update_fields=['status', 'updated_at'])
        audit_logs.delete()

    print("  --> SUCCESS: " + str(l_type).upper() + " Job reset to fresh state!")


def process_task(task_code):
    print("\n" + "-" * 60)
    print("Processing Task: " + str(task_code))
    print("-" * 60)

    # 1. MCA
    mca_case = MCACase.objects.filter(task__task_id=task_code).select_related('client').first()
    if not mca_case:
        mca_case = MCACase.objects.filter(reference_no=task_code).select_related('client').first()

    if mca_case:
        reset_mca(mca_case)
        return

    # 2. TDS
    tds_job = TDSLitigation.objects.filter(task__task_id=task_code).select_related('client').first()
    if not tds_job:
        tds_job = TDSLitigation.objects.filter(reference_no=task_code).select_related('client').first()

    if tds_job:
        reset_litigation(tds_job, 'tds')
        return

    # 3. Income Tax
    it_job = IncomeTaxLitigation.objects.filter(task__task_id=task_code).select_related('client').first()
    if not it_job:
        it_job = IncomeTaxLitigation.objects.filter(reference_no=task_code).select_related('client').first()

    if it_job:
        reset_litigation(it_job, 'income-tax')
        return

    print("[X] ERROR: Could not find any MCA, TDS, or Income Tax job for code: " + str(task_code))


def run_universal_reset():
    print("=" * 65)
    print("  UNIVERSAL MULTI-JOB RESET TOOL")
    print("  Tasks to process : " + str(len(TASK_CODES)))
    print("  Mode             : " + ("[DRY RUN - PREVIEW ONLY]" if DRY_RUN else "[ACTUAL RESET - APPLYING CHANGES]"))
    print("=" * 65)

    for code in TASK_CODES:
        process_task(code.strip())

    print("\n" + "=" * 65)
    if DRY_RUN:
        print("  DRY RUN COMPLETE. Set DRY_RUN = False in reset_job.py to execute actual reset.")
    else:
        print("  ALL TASKS PROCESSED AND RESET SUCCESSFULLY!")
    print("=" * 65)


run_universal_reset()

























