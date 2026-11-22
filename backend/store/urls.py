from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, CustomerViewSet, SaleViewSet, UtangPaymentViewSet
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token
from .views import receipt_view

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'payments', UtangPaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', obtain_auth_token, name='api_token_auth'),
    path('receipts/<int:pk>/', receipt_view, name='receipt'),
]
