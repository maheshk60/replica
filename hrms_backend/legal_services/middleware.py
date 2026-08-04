# legal_services/middleware.py

from .context import set_context, clear_context


class LegalAuditContextMiddleware:
    """
    Reads audit context from incoming request headers and stores it
    in thread-local storage so signals can access it later.

    Frontend must send these headers when editing client info:
      X-Litigation-Type: 'tds' | 'income-tax'
      X-Court-Case-Id:   '<case_id>'
      X-Job-Id:          '<job_id>'
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        litigation_type = request.headers.get('X-Litigation-Type')
        court_case_id = request.headers.get('X-Court-Case-Id')
        job_id = request.headers.get('X-Job-Id')   # ✅ ADD
        user = None
        if hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user

        set_context(
            litigation_type=litigation_type,
            court_case_id=court_case_id,
            job_id=job_id,   # ✅ ADD
            user=user,
        )

        try:
            response = self.get_response(request)
        finally:
            clear_context()

        return response