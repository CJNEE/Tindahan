from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet, CustomerViewSet, SaleViewSet, UtangPaymentViewSet,
    receipt_view, unified_login_view, member_register_view
)
from django.urls import path, include

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'payments', UtangPaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', unified_login_view, name='api_token_auth'),
    path('auth/member-login/', unified_login_view, name='member_login'),
    path('auth/member-register/', member_register_view, name='member_register'),
    path('receipts/<int:pk>/', receipt_view, name='receipt'),
]
