from django.db import models


class Product(models.Model):
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=120, blank=True, null=True)
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit = models.CharField(max_length=60, blank=True, null=True)
    current_stock = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=0)
    status = models.CharField(max_length=30, default='active')
    # Store product image as base64 data URL in the database so it never vanishes
    image_data = models.TextField(blank=True, null=True, help_text='Base64 data URL of the product image')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='products/')
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class Customer(models.Model):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=80, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    credit_status = models.CharField(max_length=30, default='good')
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    password = models.CharField(max_length=128, blank=True, null=True)
    email = models.CharField(max_length=120, blank=True, null=True)
    image_data = models.TextField(blank=True, null=True, help_text='Base64 data URL of the customer image')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Sale(models.Model):
    invoice_no = models.CharField(max_length=100, unique=True)
    customer = models.ForeignKey(Customer, related_name='sales', null=True, blank=True, on_delete=models.SET_NULL)
    type = models.CharField(max_length=30, default='sale')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=40, blank=True, null=True)
    cashier = models.CharField(max_length=120, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)


class UtangPayment(models.Model):
    customer = models.ForeignKey(Customer, related_name='payments', on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True, null=True)
    receipt_no = models.CharField(max_length=120, blank=True, null=True)


class StockMovement(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    movement_type = models.CharField(max_length=40)
    quantity_change = models.IntegerField()
    reference_id = models.IntegerField(blank=True, null=True)
    cost = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
