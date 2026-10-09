# # legal_services/middleware.py

# from .context import set_context, clear_context


# class LegalAuditContextMiddleware:
#     """
#     Reads audit context from incoming request headers and stores it
#     in thread-local storage so signals can access it later.

#     Frontend must send these headers when editing client info:
#       X-Litigation-Type: 'tds' | 'income-tax'
#       X-Court-Case-Id:   '<case_id>'
#       X-Job-Id:          '<job_id>'
#     """

#     def __init__(self, get_response):
#         self.get_response = get_response

#     def __call__(self, request):
#         litigation_type = request.headers.get('X-Litigation-Type')
#         court_case_id = request.headers.get('X-Court-Case-Id')
#         job_id = request.headers.get('X-Job-Id')   # ✅ ADD
#         user = None
#         if hasattr(request, 'user') and request.user.is_authenticated:
#             user = request.user

#         set_context(
#             litigation_type=litigation_type,
#             court_case_id=court_case_id,
#             job_id=job_id,   # ✅ ADD
#             user=user,
#         )

#         try:
#             response = self.get_response(request)
#         finally:
#             clear_context()

#         return response














# legal_services/middleware.py
from .context import set_context, clear_context


def _resolve_user(request):
    """
    Session user may already be authenticated.
    Token auth is applied later by DRF — resolve Token here so Client
    post_save signals see the real Maker on audit logs.
    """
    user = getattr(request, 'user', None)
    if user is not None and getattr(user, 'is_authenticated', False):
        return user

    auth = (
        request.headers.get('Authorization')
        or request.META.get('HTTP_AUTHORIZATION')
        or ''
    )
    if not auth:
        return None

    parts = auth.split()
    if len(parts) == 2 and parts[0].lower() == 'token':
        key = parts[1].strip()
        try:
            from rest_framework.authtoken.models import Token
            token = Token.objects.select_related('user').get(key=key)
            return token.user
        except Exception:
            return None
    return None


class LegalAuditContextMiddleware:
    """
    Frontend on client info Save must send:
      Authorization:     Token <key>
      X-Litigation-Type: tds | income-tax | mca
      X-Job-Id:          <job/case id>
      X-Court-Case-Id:   <optional>
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        litigation_type = (
            request.headers.get('X-Litigation-Type')
            or request.META.get('HTTP_X_LITIGATION_TYPE')
        )
        court_case_id = (
            request.headers.get('X-Court-Case-Id')
            or request.META.get('HTTP_X_COURT_CASE_ID')
        )
        job_id = (
            request.headers.get('X-Job-Id')
            or request.META.get('HTTP_X_JOB_ID')
        )

        if litigation_type:
            litigation_type = str(litigation_type).strip().lower() or None

        user = _resolve_user(request)

        set_context(
            litigation_type=litigation_type,
            court_case_id=court_case_id,
            job_id=job_id,
            user=user,
        )

        try:
            return self.get_response(request)
        finally:
            clear_context()