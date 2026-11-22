from django.contrib import admin
from .models import Product, ProductImage, Customer, Sale, SaleItem, UtangPayment, StockMovement

admin.site.register(Product)
admin.site.register(ProductImage)
admin.site.register(Customer)
admin.site.register(Sale)
admin.site.register(SaleItem)
admin.site.register(UtangPayment)
admin.site.register(StockMovement)
