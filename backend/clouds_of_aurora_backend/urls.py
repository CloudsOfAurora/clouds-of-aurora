# clouds_of_aurora_backend/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')), 
    path('api/', include('core.api.urls')),
]
