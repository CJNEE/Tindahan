from django.core.management.base import BaseCommand
from store.models import Product, Customer, Sale, SaleItem, UtangPayment

class Command(BaseCommand):
    help = 'Seeds initial data for Sari-Sari Store'

    def handle(self, *args, **options):
        self.stdout.write("Seeding data...")

        products_data = [
            {'name': 'Coca-Cola 1.5L', 'selling_price': 85.00, 'purchase_cost': 65.00, 'current_stock': 24, 'sku': 'PROD-001', 'status': 'active'},
            {'name': 'Lucky Me Pancit Canton', 'selling_price': 12.50, 'purchase_cost': 9.00, 'current_stock': 48, 'sku': 'PROD-002', 'status': 'active'},
            {'name': 'Argentina Corned Beef', 'selling_price': 42.00, 'purchase_cost': 32.00, 'current_stock': 15, 'sku': 'PROD-003', 'status': 'active'},
            {'name': 'Kopiko Brown Coffee 25g', 'selling_price': 8.00, 'purchase_cost': 5.50, 'current_stock': 60, 'sku': 'PROD-004', 'status': 'active'},
            {'name': 'Tide Powder Detergent 80g', 'selling_price': 15.00, 'purchase_cost': 11.00, 'current_stock': 30, 'sku': 'PROD-005', 'status': 'active'},
        ]

        created_products = []
        for p in products_data:
            obj, created = Product.objects.get_or_create(
                name=p['name'],
                defaults=p
            )
            created_products.append(obj)
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created product: {obj.name}"))
            else:
                self.stdout.write(f"Product exists: {obj.name}")

        customers_data = [
            {'name': 'Maria Santos', 'phone': '0917-123-4567', 'address': 'Brgy. San Antonio', 'credit_status': 'warning'},
            {'name': 'Juan Dela Cruz', 'phone': '0918-987-6543', 'address': 'Brgy. Poblacion', 'credit_status': 'good'},
        ]

        created_customers = []
        for c in customers_data:
            obj, created = Customer.objects.get_or_create(
                name=c['name'],
                defaults=c
            )
            created_customers.append(obj)
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created customer: {obj.name}"))
            else:
                self.stdout.write(f"Customer exists: {obj.name}")

        if created_customers and Sale.objects.count() == 0:
            s1 = Sale.objects.create(
                invoice_no='INV-UTANG-001',
                customer=created_customers[0],
                type='utang',
                total_amount=450.00,
                amount_paid=0.00,
                payment_method='credit',
                cashier='Admin'
            )
            SaleItem.objects.create(
                sale=s1,
                product=created_products[0],
                quantity=3,
                unit_price=85.00,
                subtotal=255.00
            )
            SaleItem.objects.create(
                sale=s1,
                product=created_products[2],
                quantity=4,
                unit_price=42.00,
                subtotal=168.00
            )

            s2 = Sale.objects.create(
                invoice_no='INV-UTANG-002',
                customer=created_customers[1],
                type='utang',
                total_amount=280.00,
                amount_paid=0.00,
                payment_method='credit',
                cashier='Admin'
            )
            SaleItem.objects.create(
                sale=s2,
                product=created_products[0],
                quantity=2,
                unit_price=85.00,
                subtotal=170.00
            )
            SaleItem.objects.create(
                sale=s2,
                product=created_products[3],
                quantity=10,
                unit_price=8.00,
                subtotal=80.00
            )

            self.stdout.write(self.style.SUCCESS("Created initial utang transactions for sample customers"))

        self.stdout.write(self.style.SUCCESS("Database seeding completed!"))
