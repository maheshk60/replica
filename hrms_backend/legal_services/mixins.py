# # legal_services/mixins.py
# from .permissions import ADMIN_ROLES


# class RoleScopedQuerysetMixin:
#     """
#     Admin/Founder see all cases.
#     Everyone else sees only cases assigned to them.
#     """
#     def get_queryset(self):
#         qs = super().get_queryset()
#         user = self.request.user
#         if getattr(user, 'role', None) in ADMIN_ROLES:
#             return qs
#         return qs.filter(assigned_to=user)












# legal_services/mixins.py
from django.db.models import Q
from .permissions import ADMIN_ROLES


class RoleScopedQuerysetMixin:
    """
    Admin/Founder see all cases.
    Everyone else sees only cases where they're assigned as a maker or checker.
    """
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, 'role', None) in ADMIN_ROLES:
            return qs
        return qs.filter(Q(makers=user) | Q(checkers=user)).distinct()