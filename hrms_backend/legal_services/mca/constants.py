# legal_services/mca/constants.py
"""
Metadata per MCA form type.
Keyed by SubService slug/name-based key.
"""

FORM_METADATA = {
    'aoc-4': {
        'label': 'AOC-4',
        'name': 'Financial Statement Filing',
        'category': 'annual',
        'default_due_days': 30,
        'due_from': 'agm_date',
        'portal_url': 'https://www.mca.gov.in/mcafoportal/prepareFormDetails.do?formCode=AOC4',
        'required_docs': [
            'Balance Sheet',
            'Profit & Loss Statement',
            'Directors Report',
            'Auditor Report',
        ],
    },
    'aoc-4-xbrl': {
        'label': 'AOC-4 XBRL',
        'name': 'XBRL Financial Statement Filing',
        'category': 'annual',
        'default_due_days': 30,
        'due_from': 'agm_date',
        'portal_url': 'https://www.mca.gov.in/mcafoportal/prepareFormDetails.do?formCode=AOC4XBRL',
        'required_docs': [
            'XBRL Instance Document',
            'Balance Sheet',
            'Auditor Report',
        ],
    },
    'mgt-14': {
        'label': 'MGT-14',
        'name': 'Board Resolution Filing',
        'category': 'event_based',
        'default_due_days': 30,
        'due_from': 'event_date',
        'portal_url': 'https://www.mca.gov.in/mcafoportal/prepareFormDetails.do?formCode=MGT14',
        'required_docs': [
            'Certified Resolution Copy',
            'Notice of Meeting',
            'Explanatory Statement',
        ],
    },
    'mgt-7': {
        'label': 'MGT-7',
        'name': 'Annual Return',
        'category': 'annual',
        'default_due_days': 60,
        'due_from': 'agm_date',
        'portal_url': 'https://www.mca.gov.in/mcafoportal/prepareFormDetails.do?formCode=MGT7',
        'required_docs': [
            'List of Shareholders',
            'List of Directors',
            'Auditor Certificate',
        ],
    },
    'mgt-7a': {
        'label': 'MGT-7A',
        'name': 'Annual Return (OPC / Small Co)',
        'category': 'annual',
        'default_due_days': 60,
        'due_from': 'agm_date',
        'portal_url': 'https://www.mca.gov.in/mcafoportal/prepareFormDetails.do?formCode=MGT7A',
        'required_docs': [
            'List of Shareholders',
            'List of Directors',
        ],
    },
    'msme-1': {
        'label': 'MSME-1',
        'name': 'MSME Half-Yearly Return',
        'category': 'semi_annual',
        'default_due_days': 30,
        'due_from': 'period_end',
        'portal_url': 'https://www.mca.gov.in/mcafoportal/prepareFormDetails.do?formCode=MSME1',
        'required_docs': [
            'List of Delayed MSME Payments',
        ],
    },
    'pas-6': {
        'label': 'PAS-6',
        'name': 'Share Capital Reconciliation',
        'category': 'semi_annual',
        'default_due_days': 60,
        'due_from': 'period_end',
        'portal_url': 'https://www.mca.gov.in/mcafoportal/prepareFormDetails.do?formCode=PAS6',
        'required_docs': [
            'Depository Statement',
            'Reconciliation Certificate',
        ],
    },
    'adt-1': {
        'label': 'ADT-1',
        'name': 'Auditor Appointment',
        'category': 'event_based',
        'default_due_days': 15,
        'due_from': 'event_date',
        'portal_url': 'https://www.mca.gov.in/mcafoportal/prepareFormDetails.do?formCode=ADT1',
        'required_docs': [
            'Board Resolution',
            'Consent Letter',
            'Auditor Certificate',
        ],
    },
    'dpt-3': {
        'label': 'DPT-3',
        'name': 'Return of Deposits',
        'category': 'annual',
        'default_due_days': 90,
        'due_from': 'financial_year_end',
        'portal_url': 'https://www.mca.gov.in/mcafoportal/prepareFormDetails.do?formCode=DPT3',
        'required_docs': [
            'Auditor Certificate',
            'Deposit Details',
        ],
    },
}


def get_form_metadata(sub_service_slug):
    """Returns metadata for a given form slug, or empty defaults."""
    key = (sub_service_slug or '').strip().lower()
    return FORM_METADATA.get(key, {
        'label': key.upper() if key else 'MCA Form',
        'name': 'MCA Filing',
        'category': 'event_based',
        'default_due_days': 30,
        'due_from': 'event_date',
        'portal_url': 'https://www.mca.gov.in/',
        'required_docs': [],
    })