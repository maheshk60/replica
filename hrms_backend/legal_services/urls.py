
# legal_services/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    TDSLitigationViewSet, IncomeTaxLitigationViewSet,
    FEMACaseViewSet, PartnershipCaseViewSet, LegalAuditTrailView,
    NoticeReplyViewSet, ReplyImageUploadView,
    CourtCaseViewSet, ReviewRequestViewSet,LegalClientDetailView,CaseNoticeViewSet,NoticeDocumentViewSet, 
    CaseClosureDocumentViewSet, CaseClosureBundleView,  MCACaseViewSet, MCAFilingViewSet, MCAFilingDocumentViewSet,
)

router = DefaultRouter()
router.register(r'tds-litigations', TDSLitigationViewSet, basename='tds-litigation')
router.register(r'income-tax-litigations', IncomeTaxLitigationViewSet, basename='income-tax-litigation')
router.register(r'fema-cases', FEMACaseViewSet, basename='fema-case')
router.register(r'partnership-cases', PartnershipCaseViewSet, basename='partnership-case')
router.register(r'court-cases', CourtCaseViewSet, basename='court-case')
router.register(r'reviews', ReviewRequestViewSet, basename='review-request')
router.register(r'notices',          CaseNoticeViewSet,       basename='case-notice')
router.register(r'notice-documents', NoticeDocumentViewSet,   basename='notice-document')
router.register(r'notice-replies',   NoticeReplyViewSet,      basename='notice-reply') 
router.register(r'closure-documents', CaseClosureDocumentViewSet, basename='closure-document')
router.register(r'mca-cases', MCACaseViewSet, basename='mca-case')
router.register(r'mca-filings', MCAFilingViewSet, basename='mca-filing')
router.register(r'mca-filing-documents', MCAFilingDocumentViewSet, basename='mca-filing-document')

urlpatterns = [
    path('audit-trail/', LegalAuditTrailView.as_view(), name='legal-audit-trail'),
    path('client/<int:client_id>/', LegalClientDetailView.as_view(), name='legal-client-detail'),
    path('reply-image-upload/',     ReplyImageUploadView.as_view(),  name='reply-image-upload'),
    path('court-cases/<int:pk>/closure-<str:action>/', CaseClosureBundleView.as_view(), name='court-case-closure-action'),
] + router.urls