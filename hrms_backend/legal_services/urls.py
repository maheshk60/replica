
# legal_services/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    TDSLitigationViewSet, IncomeTaxLitigationViewSet,
    MCACaseViewSet, FEMACaseViewSet, PartnershipCaseViewSet, LegalAuditTrailView,
    DocumentCategoryViewSet, ClientCustomDocumentViewSet,
    CourtCaseViewSet, ReviewRequestViewSet
)

router = DefaultRouter()
router.register(r'tds-litigations', TDSLitigationViewSet, basename='tds-litigation')
router.register(r'income-tax-litigations', IncomeTaxLitigationViewSet, basename='income-tax-litigation')
router.register(r'mca-cases', MCACaseViewSet, basename='mca-case')
router.register(r'fema-cases', FEMACaseViewSet, basename='fema-case')
router.register(r'partnership-cases', PartnershipCaseViewSet, basename='partnership-case')
router.register(r'document-categories', DocumentCategoryViewSet, basename='document-category')
router.register(r'custom-documents', ClientCustomDocumentViewSet, basename='custom-document')
router.register(r'court-cases', CourtCaseViewSet, basename='court-case')
router.register(r'reviews', ReviewRequestViewSet, basename='review-request')


urlpatterns = [
    path('audit-trail/', LegalAuditTrailView.as_view(), name='legal-audit-trail'),
] + router.urls