
# # legal_services/permissions.py

# from rest_framework.permissions import BasePermission
# from .models import TDSLitigation, IncomeTaxLitigation

# ADMIN_ROLES = ['Admin', 'Founder', 'Manager']
# HIGH_ADMIN = ['Admin', 'Founder']   # For log outcome, escalation review


# def is_admin_role(user):
#     return getattr(user, 'role', None) in ADMIN_ROLES or user.is_superuser


# def is_high_admin(user):
#     return getattr(user, 'role', None) in HIGH_ADMIN or user.is_superuser


# def is_founder(user):
#     return getattr(user, 'role', None) == 'Founder' or user.is_superuser


# def is_case_maker(case, user):
#     """Assigned maker on THIS specific case."""
#     return case.makers.filter(id=user.id).exists()


# def is_case_checker(case, user):
#     """Assigned checker on THIS specific case."""
#     return case.checkers.filter(id=user.id).exists()


# class IsAdminOrAssignedOnly(BasePermission):
#     """Admin/Founder/Manager full; Maker view+edit assigned; Checker view only."""

#     def has_permission(self, request, view):
#         return request.user and request.user.is_authenticated

#     def has_object_permission(self, request, view, obj):
#         user = request.user
#         if is_admin_role(user):
#             return True

#         is_maker = obj.makers.filter(id=user.id).exists()
#         is_checker = obj.checkers.filter(id=user.id).exists()

#         if request.method in ('GET', 'HEAD', 'OPTIONS'):
#             return is_maker or is_checker
#         return is_maker


# class IsMakerOrAdminEdit(BasePermission):
#     """
#     Admin/Founder/Manager: full access.
#     Maker: view + edit assigned cases.
#     Checker: view only.
#     Delete: Founder only.
#     """

#     def has_permission(self, request, view):
#         return bool(request.user and request.user.is_authenticated)

#     def has_object_permission(self, request, view, obj):
#         user = request.user

#         if request.method == 'DELETE':
#             return is_founder(user)

#         if is_admin_role(user):
#             return True

#         if obj.litigation_type == 'tds':
#             related_qs = TDSLitigation.objects.filter(client=obj.client)
#         else:
#             related_qs = IncomeTaxLitigation.objects.filter(client=obj.client)

#         is_maker = related_qs.filter(makers=user).exists()
#         is_checker = related_qs.filter(checkers=user).exists()

#         if request.method in ('GET', 'HEAD', 'OPTIONS'):
#             return is_maker or is_checker
#         return is_maker


















# legal_services/permissions.py

from rest_framework.permissions import BasePermission
from .models import TDSLitigation, IncomeTaxLitigation

ADMIN_ROLES = ['Admin', 'Founder', 'Manager']
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
    """
    Check if user is assigned as Maker on this case.
    Looks at BOTH direct CourtCase.makers AND parent Litigation.makers
    (because Assign M/C from list page updates Litigation model,
     while some flows might update CourtCase directly).
    """
    if not user or not user.is_authenticated:
        return False

    # First check direct CourtCase assignment
    if case.makers.filter(id=user.id).exists():
        return True

    # Fallback: check parent litigation assignment
    if case.litigation_type == 'tds':
        return TDSLitigation.objects.filter(
            client=case.client, makers=user
        ).exists()
    else:
        return IncomeTaxLitigation.objects.filter(
            client=case.client, makers=user
        ).exists()


def is_case_checker(case, user):
    """
    Check if user is assigned as Checker on this case.
    Same dual-check as maker.
    """
    if not user or not user.is_authenticated:
        return False

    if case.checkers.filter(id=user.id).exists():
        return True

    if case.litigation_type == 'tds':
        return TDSLitigation.objects.filter(
            client=case.client, checkers=user
        ).exists()
    else:
        return IncomeTaxLitigation.objects.filter(
            client=case.client, checkers=user
        ).exists()


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