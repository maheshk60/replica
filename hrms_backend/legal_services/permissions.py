
# legal_services/permissions.py

from rest_framework.permissions import BasePermission
from .models import TDSLitigation, IncomeTaxLitigation

ADMIN_ROLES = ['Admin', 'Founder', 'Manager','Team Lead']
HIGH_ADMIN = ['Admin', 'Founder']   # For log outcome, escalation review


# ══════════════════════════════════════════════════════════════════════
# ROLE HELPERS
# ══════════════════════════════════════════════════════════════════════
def is_admin_role(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    role = (getattr(user, 'role', '') or '').strip()
    return role in ADMIN_ROLES


def is_high_admin(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    role = (getattr(user, 'role', '') or '').strip()
    return role in HIGH_ADMIN


def is_founder(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    role = (getattr(user, 'role', '') or '').strip()
    return role == 'Founder'


# ══════════════════════════════════════════════════════════════════════
# CASE-LEVEL ASSIGNMENT HELPERS
# ══════════════════════════════════════════════════════════════════════
def is_case_maker(case, user):
    if not user or not user.is_authenticated:
        return False

    # Direct assignment on CourtCase (if ever used)
    if case.makers.filter(id=user.id).exists():
        return True

    job_id = getattr(case, 'job_id', None)

    if case.litigation_type == 'tds':
        qs = TDSLitigation.objects.filter(makers=user)
    else:
        qs = IncomeTaxLitigation.objects.filter(makers=user)

    # ✅ Prefer exact job (no cross-job leak)
    if job_id:
        return qs.filter(id=job_id).exists()

    # Fallback only for old CourtCase rows with null job_id
    return qs.filter(client=case.client).exists()


def is_case_checker(case, user):
    if not user or not user.is_authenticated:
        return False

    if case.checkers.filter(id=user.id).exists():
        return True

    job_id = getattr(case, 'job_id', None)

    if case.litigation_type == 'tds':
        qs = TDSLitigation.objects.filter(checkers=user)
    else:
        qs = IncomeTaxLitigation.objects.filter(checkers=user)

    if job_id:
        return qs.filter(id=job_id).exists()

    return qs.filter(client=case.client).exists()


# ══════════════════════════════════════════════════════════════════════
# PERMISSION CLASSES
# ══════════════════════════════════════════════════════════════════════
class IsAdminOrAssignedOnly(BasePermission):
    """Admin/Founder/Manager full; Maker view+edit assigned; Checker view only."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if is_admin_role(user):
            return True

        is_maker = obj.makers.filter(id=user.id).exists()
        is_checker = obj.checkers.filter(id=user.id).exists()

        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return is_maker or is_checker
        return is_maker


class IsMakerOrAdminEdit(BasePermission):
    """
    Admin/Founder/Manager: full access.
    Maker: view + edit assigned cases.
    Checker: view only.
    Delete: Founder only.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user

        if request.method == 'DELETE':
            return is_founder(user)

        if is_admin_role(user):
            return True

        if obj.litigation_type == 'tds':
            related_qs = TDSLitigation.objects.filter(client=obj.client)
        else:
            related_qs = IncomeTaxLitigation.objects.filter(client=obj.client)

        is_maker = related_qs.filter(makers=user).exists()
        is_checker = related_qs.filter(checkers=user).exists()

        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return is_maker or is_checker
        return is_maker