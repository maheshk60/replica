from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from account.views import csrf_token_view

urlpatterns = [
    path('admin/', admin.site.urls),

    # ─── Core Apps ────────────────────────────────────────────────────────
    path('api/account/',  include('account.urls')),
    path('api/employee/', include('employee.urls')),
    path('api/clients/',  include('clients.urls')),

    # ─── Auth Aliases ─────────────────────────────────────────────────────
    path('api/auth/', include('account.urls')),

    # ─── CSRF ─────────────────────────────────────────────────────────────
    path('api/get-csrf-token/', csrf_token_view),

    # Legal Services (legal services management)
    path('api/legal-services/', include('legal_services.urls')),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)