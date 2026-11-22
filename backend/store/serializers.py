from decimal import Decimal
from rest_framework import serializers
from .models import Product, ProductImage, Customer, Sale, SaleItem, UtangPayment


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'is_primary']


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'purchase_cost', 'selling_price',
            'unit', 'current_stock', 'min_stock', 'status',
            'image_data',
            'created_at', 'updated_at', 'images',
        ]


class CustomerSerializer(serializers.ModelSerializer):
    total_utang = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    utang_balance = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'phone', 'address', 'credit_status',
            'username', 'password', 'email', 'image_data',
            'created_at', 'updated_at',
            'total_utang', 'total_paid', 'utang_balance'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }

    def get_total_utang(self, obj):
        sales_utang = obj.sales.filter(type='utang')
        total = sum((s.total_amount for s in sales_utang), Decimal('0.00'))
        return float(total)

    def get_total_paid(self, obj):
        payments = obj.payments.all()
        total = sum((p.amount for p in payments), Decimal('0.00'))
        return float(total)

    def get_utang_balance(self, obj):
        bal = self.get_total_utang(obj) - self.get_total_paid(obj)
        return float(max(Decimal('0.00'), Decimal(str(bal))))


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'subtotal']


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)

    class Meta:
        model = Sale
        fields = [
            'id', 'invoice_no', 'customer', 'type', 'total_amount',
            'amount_paid', 'payment_method', 'cashier', 'created_at', 'items',
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        sale = Sale.objects.create(**validated_data)
        for item in items_data:
            SaleItem.objects.create(sale=sale, **item)
            product = item.get('product')
            if product:
                product.current_stock = max(0, product.current_stock - item.get('quantity', 0))
                product.save()
        return sale


class UtangPaymentSerializer(serializers.ModelSerializer):
    customer_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = UtangPayment
        fields = ['id', 'customer', 'customer_id', 'amount', 'payment_date', 'note', 'receipt_no']
        extra_kwargs = {
            'customer': {'required': False}
        }

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['customer_id'] = instance.customer_id
        return ret

    def create(self, validated_data):
        customer_id = validated_data.pop('customer_id', None)
        if customer_id and 'customer' not in validated_data:
            customer = Customer.objects.filter(id=customer_id).first()
            if not customer:
                customer = Customer.objects.first()
            validated_data['customer'] = customer
        elif 'customer' not in validated_data:
            validated_data['customer'] = Customer.objects.first()

        payment = super().create(validated_data)

        # Allocate payment towards unpaid utang sales so sales and utang stay permanently updated in DB
        cust = payment.customer
        if cust:
            unpaid_sales = Sale.objects.filter(customer=cust, type='utang').order_by('id')
            rem = payment.amount
            for s in unpaid_sales:
                owed = s.total_amount - s.amount_paid
                if owed > 0 and rem > 0:
                    deduct = min(rem, owed)
                    s.amount_paid += deduct
                    s.save()
                    rem -= deduct

        return payment
