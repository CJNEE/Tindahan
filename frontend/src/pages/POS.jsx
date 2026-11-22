import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const DEFAULT_SHOP_PRODUCTS = [
  { id: 101, name: 'Coke', selling_price: 25.00, purchase_cost: 18.00, current_stock: 24, is_coke: true, image_data: null },
  { id: 102, name: 'Coke', selling_price: 25.00, purchase_cost: 18.00, current_stock: 24, is_coke: true, image_data: null },
  { id: 103, name: 'Coke', selling_price: 25.00, purchase_cost: 18.00, current_stock: 24, is_coke: true, image_data: null },
  { id: 104, name: 'SUMP', selling_price: 9.00, purchase_cost: 6.00, current_stock: 20, is_box: true, image_data: null },
  { id: 105, name: 'SUMP', selling_price: 9.00, purchase_cost: 6.00, current_stock: 20, is_box: true, image_data: null },
  { id: 106, name: 'SUMP', selling_price: 9.00, purchase_cost: 6.00, current_stock: 20, is_box: true, image_data: null },
];

export default function POS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    
    // Connect global search in header to this state if user types there
    const searchInput = document.getElementById('global-product-search');
    if (searchInput) {
      const handleInput = (e) => setSearchTerm(e.target.value);
      searchInput.addEventListener('input', handleInput);
      return () => searchInput.removeEventListener('input', handleInput);
    }
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const local = JSON.parse(localStorage.getItem('sari_local_products') || '[]');
    try {
      const response = await api.get('/products/');
      if (response.data && response.data.length > 0) {
        // Merge with local images and preserve updated stocks
        const dbMap = new Map();
        response.data.forEach(p => {
          const localMatch = local.find(s => s.id === p.id);
          const finalImage = p.image_data || (localMatch ? localMatch.image_data : null);
          const finalStock = localMatch && localMatch.current_stock !== undefined ? localMatch.current_stock : p.current_stock;
          dbMap.set(p.id, { ...p, image_data: finalImage, current_stock: finalStock });
        });
        local.forEach(p => {
          if (!dbMap.has(p.id)) dbMap.set(p.id, p);
        });
        const merged = Array.from(dbMap.values());
        setProducts(merged);
        localStorage.setItem('sari_local_products', JSON.stringify(merged));
      } else {
        const fallback = local.length > 0 ? local : DEFAULT_SHOP_PRODUCTS;
        setProducts(fallback);
        if (!local.length) localStorage.setItem('sari_local_products', JSON.stringify(DEFAULT_SHOP_PRODUCTS));
      }
    } catch (error) {
      console.warn('Error fetching products, using shop items:', error);
      const fallback = local.length > 0 ? local : DEFAULT_SHOP_PRODUCTS;
      setProducts(fallback);
      if (!local.length) localStorage.setItem('sari_local_products', JSON.stringify(DEFAULT_SHOP_PRODUCTS));
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.product.id === id) {
        const newQuantity = item.quantity + delta;
        return { ...item, quantity: newQuantity > 0 ? newQuantity : 1 };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.product.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    const totalAmount = cart.reduce((total, item) => total + (item.product.selling_price * item.quantity), 0);
    const invoiceNo = 'INV-' + Math.floor(100000 + Math.random() * 900000);

    const saleData = {
      invoice_no: invoiceNo,
      type: 'sale',
      total_amount: totalAmount,
      amount_paid: totalAmount,
      payment_method: 'cash',
      cashier: 'Admin',
      items: cart.map(item => ({
        product: typeof item.product.id === 'number' ? item.product.id : 1,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: parseFloat(item.product.selling_price),
        subtotal: parseFloat(item.product.selling_price) * item.quantity
      }))
    };

    let createdSale = {
      id: Date.now(),
      invoice_no: invoiceNo,
      type: 'sale',
      total_amount: totalAmount,
      amount_paid: totalAmount,
      payment_method: 'cash',
      cashier: 'Admin',
      created_at: new Date().toISOString(),
      items: cart.map(item => ({
        name: item.product.name,
        product_name: item.product.name,
        product: typeof item.product.id === 'number' ? item.product.id : 1,
        quantity: item.quantity,
        unit_price: parseFloat(item.product.selling_price),
        subtotal: parseFloat(item.product.selling_price) * item.quantity
      }))
    };

    try {
      const res = await api.post('/sales/', saleData);
      if (res.data && res.data.id) {
        createdSale = { ...createdSale, ...res.data };
      }
    } catch (error) {
      console.warn('Checkout API notice:', error.response?.data || error.message);
    }

    // Save to local sales cache so receipts never vanish
    const currentSales = JSON.parse(localStorage.getItem('sari_local_sales') || '[]');
    const updatedSales = [createdSale, ...currentSales.filter(s => s.id !== createdSale.id && s.invoice_no !== createdSale.invoice_no)];
    localStorage.setItem('sari_local_sales', JSON.stringify(updatedSales));

    // Reduce product stock and save permanently to local storage
    const updatedProducts = products.map(p => {
      const cartItem = cart.find(c => c.product.id === p.id);
      if (cartItem) {
        return {
          ...p,
          current_stock: Math.max(0, Number(p.current_stock || 0) - cartItem.quantity)
        };
      }
      return p;
    });
    setProducts(updatedProducts);
    localStorage.setItem('sari_local_products', JSON.stringify(updatedProducts));

    setCheckoutSuccess({ 
      invoiceNo, 
      totalAmount, 
      itemCount: cart.reduce((s, c) => s + c.quantity, 0), 
      saleId: createdSale.id 
    });
    setCart([]);
    setIsSubmitting(false);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const cartTotal = cart.reduce((total, item) => total + (item.product.selling_price * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Banner - Point of Sale (POS) */}
      <div className="pos-banner">
        <div className="pos-banner-left">
          <div className="pos-banner-icon">
            🛍️
          </div>
          <div className="pos-banner-text">
            <h3>Point of Sale (POS)</h3>
            <p>Browse products and add items to your cart</p>
          </div>
        </div>
      </div>

      {/* Checkout Success Banner */}
      {checkoutSuccess && (
        <div className="alert-success" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, color: '#4ade80', fontSize: '15px' }}>✓ Order Placed Successfully!</h4>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Invoice: <strong>{checkoutSuccess.invoiceNo}</strong> • Total Paid: <strong>₱{checkoutSuccess.totalAmount.toFixed(2)}</strong> ({checkoutSuccess.itemCount} items)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to={`/receipt?id=${checkoutSuccess.saleId}`} className="btn btn-sm btn-primary">
              🧾 Print Receipt
            </Link>
            <button className="btn btn-sm btn-secondary" onClick={() => setCheckoutSuccess(null)}>
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout: 3-Col Product Grid on Left, Cart Panel on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        {/* Left Side: 3-Column Products Grid */}
        <div>
          {loading ? (
            <div className="loading-spinner"></div>
          ) : filteredProducts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '2.5rem' }}>🔍</span>
              <h3 style={{ marginTop: '10px', color: '#fff' }}>No products found</h3>
              <p>Try searching for a different keyword or add a new product</p>
            </div>
          ) : (
            <div className="pos-grid-3col">
              {filteredProducts.map(product => {
                const inCart = cart.find(i => i.product.id === product.id);
                const productImg = product.image_data || (product.images && product.images.length > 0 ? (product.images[0].url || product.images[0].image) : null);
                const isOutOfStock = Number(product.current_stock || 0) <= 0;
                const isCoke = product.is_coke || product.name.toLowerCase().includes('coke') || product.name.toLowerCase().includes('coca');

                return (
                  <div key={product.id} className="pos-item-card">
                    {/* Top Image Box */}
                    <div className={`pos-item-image-box ${isCoke && !productImg ? 'brand-coke' : ''}`}>
                      {productImg ? (
                        <img src={productImg} alt={product.name} />
                      ) : isCoke ? (
                        <div style={{ 
                          width: '100%', 
                          height: '100%', 
                          background: 'linear-gradient(135deg, #e11d48, #be123c)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          padding: '12px' 
                        }}>
                          <span style={{ 
                            fontFamily: 'serif', 
                            fontSize: '32px', 
                            fontWeight: '900', 
                            color: '#fff', 
                            fontStyle: 'italic',
                            letterSpacing: '1px'
                          }}>
                            Coca-Cola
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="box-3d">📦</span>
                        </div>
                      )}
                    </div>

                    {/* Product Name */}
                    <div className="pos-item-title">{product.name}</div>

                    {/* Price */}
                    <div className="pos-item-price">₱{parseFloat(product.selling_price || 0).toFixed(2)}</div>

                    {/* Stock */}
                    <div className="pos-item-stock">
                      {isOutOfStock ? 'Out of Stock' : `Stock: ${product.current_stock}`}
                    </div>

                    {/* Add to Cart Button */}
                    <button 
                      className="btn-add-cart"
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      style={{ opacity: isOutOfStock ? 0.4 : 1 }}
                    >
                      <span>🛒</span> Add to Cart
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Cart Panel */}
        <div className="pos-cart-panel">
          {/* Cart Header */}
          <div className="pos-cart-header">
            <div className="pos-cart-title">
              <span>🛒</span>
              <span>Cart ({cartItemsCount})</span>
            </div>
            {cart.length > 0 && (
              <button className="btn-clear-cart" onClick={clearCart}>
                <span>🗑️</span> Clear Cart
              </button>
            )}
          </div>

          {/* Cart Content: Empty State or Filled Items */}
          {cart.length === 0 ? (
            <div className="cart-empty-view">
              <div className="cart-empty-icon">
                🛒
              </div>
              <h4>Your cart is empty</h4>
              <p>Add some products to get started!</p>
            </div>
          ) : (
            <div className="cart-items-list">
              {cart.map(item => (
                <div key={item.product.id} className="cart-row">
                  <div className="cart-row-info">
                    <div className="cart-row-title">{item.product.name}</div>
                    <div className="cart-row-price">₱{parseFloat(item.product.selling_price).toFixed(2)}</div>
                  </div>

                  <div className="cart-qty-pill">
                    <button onClick={() => updateQuantity(item.product.id, -1)}>−</button>
                    <span style={{ fontSize: '13px', fontWeight: '700', minWidth: '18px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button onClick={() => updateQuantity(item.product.id, 1)}>+</button>
                  </div>

                  <div className="cart-row-total">
                    ₱{(item.product.selling_price * item.quantity).toFixed(2)}
                  </div>

                  <button 
                    onClick={() => removeFromCart(item.product.id)}
                    style={{ color: '#ff4d6d', marginLeft: '6px', fontSize: '16px', cursor: 'pointer' }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Cart Footer */}
          <div className="pos-cart-footer">
            <div className="cart-total-row">
              <span className="cart-total-label">Total:</span>
              <span className="cart-total-amount">₱{cartTotal.toFixed(2)}</span>
            </div>

            <button 
              className="btn-proceed-checkout"
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting}
            >
              <span>💳</span>
              <span>{isSubmitting ? 'Processing...' : 'Proceed to Checkout'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
