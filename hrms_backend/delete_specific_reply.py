# hrms_backend/delete_specific_reply.py
# Version-aware deletion script for production servers.

from django.db import transaction
from legal_services.models import (
    TDSLitigation, IncomeTaxLitigation, CourtCase,
    CaseNotice, NoticeDocument, LegalCaseAuditLog
)

# --- CONFIGURATION ---
TASK_CODE = "CKPSCA-STT-0013-2026-27"  # Put your STT / Task ID here

# Put the ID of the MAIN REPLY for the version you want to delete
# (Leave as 0 to run Inspection Mode first)
TARGET_MAIN_REPLY_ID = 213  

DRY_RUN = False  # Set to False ONLY when ready to perform the actual deletion!
# ---------------------


def run_version_tool():
    print("=" * 65)
    print("  PRODUCTION VERSION DELETION TOOL")
    print("  Target Task    : " + str(TASK_CODE))
    print("  Target Reply ID: " + (str(TARGET_MAIN_REPLY_ID) if TARGET_MAIN_REPLY_ID > 0 else "NONE (INSPECTION MODE)"))
    print("  Mode           : " + ("[DRY RUN - PREVIEW ONLY]" if DRY_RUN else "[ACTUAL DELETION]"))
    print("=" * 65)

    # 1. Locate Litigation Job
    job = TDSLitigation.objects.filter(task__task_id=TASK_CODE).select_related('client').first()
    l_type = 'tds'
    if not job:
        job = IncomeTaxLitigation.objects.filter(task__task_id=TASK_CODE).select_related('client').first()
        l_type = 'income-tax'
    if not job:
        job = TDSLitigation.objects.filter(reference_no=TASK_CODE).select_related('client').first()
        l_type = 'tds'
    if not job:
        job = IncomeTaxLitigation.objects.filter(reference_no=TASK_CODE).select_related('client').first()
        l_type = 'income-tax'

    if not job:
        print("\n[X] ERROR: Could not find Litigation Job for task code: " + str(TASK_CODE))
        return

    print("\n[+] Found Job:")
    print("    - Job ID      : " + str(job.id))
    print("    - Type        : " + str(l_type).upper())
    print("    - Reference No: " + str(job.reference_no))
    print("    - Client      : " + str(job.client.name))

    court_cases = CourtCase.objects.filter(litigation_type=l_type, job_id=job.id)
    notices = CaseNotice.objects.filter(court_case__in=court_cases)

    if not notices.exists():
        print("\n[!] No notices found for this job.")
        return

    # 2. INSPECTION MODE (If TARGET_MAIN_REPLY_ID == 0)
    if TARGET_MAIN_REPLY_ID == 0:
        print("\n" + "=" * 65)
        print("  INSPECTING VERSION BUNDLES FOR THIS TASK")
        print("=" * 65)

        for notice in notices:
            docs = NoticeDocument.objects.filter(notice=notice)
            mains = list(docs.filter(doc_type__in=['pending', 'reply']).order_by('uploaded_at', 'id'))
            supports = list(docs.filter(doc_type__in=['pending_support', 'supporting_doc']).order_by('uploaded_at', 'id'))

            print(f"\n--- NOTICE #{notice.id} (DIN: {notice.din_number or 'N/A'}) ---")

            if not mains and not supports:
                print("    (No reply versions uploaded for this notice)")
                continue

            # Group supports by reply_version
            for idx, main in enumerate(mains, start=1):
                linked_supports = [s for s in supports if s.reply_version == main.id]
                time_str = main.uploaded_at.strftime('%d %b %Y, %I:%M %p') if main.uploaded_at else 'Unknown'
                v_label = f"VERSION {idx}" if main.review_status != 'draft' else "DRAFT VERSION"

                print(f"\n  [+] {v_label} | Status: {main.review_status.upper()} | Uploaded: {time_str}")
                print(f"      • MAIN REPLY    -> ID #{main.id:<5} | {main.file_name}")
                
                if linked_supports:
                    for s_idx, supp in enumerate(linked_supports, start=1):
                        print(f"      • SUPPORTING #{s_idx:<2} -> ID #{supp.id:<5} | {supp.file_name}")
                else:
                    print("      • (No supporting docs attached to this version)")

            # Unlinked supports (if any)
            linked_ids = set(s.id for main in mains for s in supports if s.reply_version == main.id)
            unlinked = [s for s in supports if s.id not in linked_ids]
            if unlinked:
                print("\n  [+] STANDALONE SUPPORTING DOCS:")
                for supp in unlinked:
                    print(f"      • SUPPORTING    -> ID #{supp.id:<5} | {supp.file_name} (Status: {supp.review_status})")

        print("\n" + "=" * 65)
        print("  INSPECTION COMPLETE")
        print("  To delete an incorrect version:")
        print("    1. Look at the output above and find the MAIN REPLY ID for the version you want to delete.")
        print("    2. Open delete_specific_reply.py")
        print("    3. Set TARGET_MAIN_REPLY_ID = <MAIN_REPLY_ID>")
        print("    4. Set DRY_RUN = False")
        print("    5. Re-run the command.")
        print("=" * 65)
        return

    # 3. TARGETED VERSION DELETION
    main_doc = NoticeDocument.objects.filter(notice__court_case__in=court_cases, id=TARGET_MAIN_REPLY_ID).first()
    if not main_doc:
        print(f"\n[X] ERROR: Could not find Main Reply Document ID #{TARGET_MAIN_REPLY_ID} under task {TASK_CODE}")
        return

    linked_supports = list(NoticeDocument.objects.filter(notice__court_case__in=court_cases, reply_version=main_doc.id))
    all_targets = [main_doc] + linked_supports

    print("\n" + "=" * 65)
    print(f"  TARGET VERSION IDENTIFIED FOR DELETION")
    print("=" * 65)
    print(f"  • Main Reply      : ID #{main_doc.id} | {main_doc.file_name} (Status: {main_doc.review_status})")
    print(f"  • Supporting Docs : {len(linked_supports)} file(s) attached:")
    for s in linked_supports:
        print(f"    - ID #{s.id} | {s.file_name}")

    if DRY_RUN:
        print("\n" + "=" * 65)
        print(f"  DRY RUN: Main Reply #{main_doc.id} and {len(linked_supports)} attached supporting doc(s) WILL be deleted.")
        print("  Set DRY_RUN = False in delete_specific_reply.py to execute.")
        print("=" * 65)
        return

    # 4. Perform Actual Deletion
    with transaction.atomic():
        deleted_count = 0
        for doc in all_targets:
            if doc.file:
                try:
                    doc.file.delete(save=False)
                except Exception as e:
                    print(f"  Warning deleting storage file ({doc.file_name}): {e}")
            doc.delete()
            deleted_count += 1

        # Audit log entry
        from legal_services.utils import log_event
        log_event(
            client_id=job.client_id,
            litigation_type=l_type,
            job_id=job.id,
            event_type='notice_doc_deleted',
            title=f'Version deleted ({main_doc.file_name})',
            description=f'Deleted main reply #{main_doc.id} and {len(linked_supports)} attached supporting document(s).',
            user=None,
            new_values={'file_name': main_doc.file_name}
        )

    print("\n" + "=" * 65)
    print(f"  SUCCESS: Completely deleted Version (Main Reply #{main_doc.id} + {len(linked_supports)} supporting docs)!")
    print("=" * 65)


run_version_tool()