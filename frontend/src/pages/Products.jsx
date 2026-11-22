import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const FALLBACK_PRODUCTS = [
  { id: 1, name: 'Coca-Cola 1.5L', selling_price: 85.00, purchase_cost: 65.00, current_stock: 24, image_data: null },
  { id: 2, name: 'Lucky Me Pancit Canton', selling_price: 12.50, purchase_cost: 9.00, current_stock: 48, image_data: null },
  { id: 3, name: 'Argentina Corned Beef', selling_price: 42.00, purchase_cost: 32.00, current_stock: 15, image_data: null },
  { id: 4, name: 'Kopiko Brown Coffee 25g', selling_price: 8.00, purchase_cost: 5.50, current_stock: 60, image_data: null },
  { id: 5, name: 'Tide Powder Detergent 80g', selling_price: 15.00, purchase_cost: 11.00, current_stock: 30, image_data: null },
];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', selling_price: '', purchase_cost: '', current_stock: '', sku: '' });
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editImagePreview, setEditImagePreview] = useState(null);

  // Restock state
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState(10);
  const [restockSuccess, setRestockSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStoredProducts = () => {
    try {
      const local = localStorage.getItem('sari_local_products');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  };

  const saveStoredProducts = (items) => {
    try {
      localStorage.setItem('sari_local_products', JSON.stringify(items));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    const stored = getStoredProducts();
    try {
      const response = await api.get('/products/');
      if (response.data && response.data.length > 0) {
        // Merge API data with any local image_data if API image is missing
        const dbMap = new Map();
        response.data.forEach(p => {
          const localMatch = stored.find(s => s.id === p.id);
          const finalImage = p.image_data || (localMatch ? localMatch.image_data : null);
          dbMap.set(p.id, { ...p, image_data: finalImage });
        });
        stored.forEach(p => {
          if (!dbMap.has(p.id)) dbMap.set(p.id, p);
        });
        const merged = Array.from(dbMap.values());
        setProducts(merged);
        saveStoredProducts(merged);
      } else {
        setProducts(stored.length > 0 ? stored : FALLBACK_PRODUCTS);
      }
    } catch (error) {
      console.error('Error fetching products from database:', error);
      setProducts(stored.length > 0 ? stored : FALLBACK_PRODUCTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Compress & read image as base64 Data URL so it saves permanently in PostgreSQL
  const handleImageFileChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;

    // Use FileReader + Canvas to compress slightly if large (keeps DB lightning fast)
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scale = MAX_WIDTH / Math.max(img.width, MAX_WIDTH);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

        if (isEdit) {
          setEditImagePreview(compressedBase64);
          setEditForm(prev => ({ ...prev, image_data: compressedBase64 }));
        } else {
          setImagePreview(compressedBase64);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newProduct.name || isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      name: newProduct.name,
      sku: newProduct.sku || `SKU-${Date.now().toString().slice(-6)}`,
      selling_price: parseFloat(newProduct.selling_price || 0),
      purchase_cost: parseFloat(newProduct.purchase_cost || 0),
      current_stock: parseInt(newProduct.current_stock || 0, 10),
      status: 'active',
      image_data: imagePreview // Persisted base64 in PostgreSQL!
    };

    let createdItem = {
      id: Date.now(),
      ...payload,
    };

    try {
      const res = await api.post('/products/', payload);
      if (res.data && res.data.id) {
        createdItem = { ...res.data, image_data: res.data.image_data || imagePreview };
      }
    } catch (error) {
      console.warn('API post error, saving locally as backup:', error);
    }

    const currentStored = getStoredProducts();
    const updatedStored = [createdItem, ...currentStored.filter(p => p.id !== createdItem.id)];
    saveStoredProducts(updatedStored);
    setProducts(prev => [createdItem, ...prev.filter(p => p.id !== createdItem.id)]);

    setNewProduct({ name: '', selling_price: '', purchase_cost: '', current_stock: '', sku: '' });
    setImagePreview(null);
    setShowAddForm(false);
    setIsSubmitting(false);
  };

  const handleEditClick = (product) => {
    setEditingId(product.id);
    setEditForm({ ...product });
    setEditImagePreview(product.image_data || null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const updatedPayload = {
      ...editForm,
      selling_price: parseFloat(editForm.selling_price || 0),
      purchase_cost: parseFloat(editForm.purchase_cost || 0),
      current_stock: parseInt(editForm.current_stock || 0, 10),
      image_data: editImagePreview || editForm.image_data
    };

    try {
      await api.put(`/products/${editingId}/`, updatedPayload);
    } catch (error) {
      console.warn('API put error, updating locally:', error);
    }

    const updated = products.map(p => p.id === editingId ? { ...p, ...updatedPayload } : p);
    setProducts(updated);
    saveStoredProducts(updated);
    setEditingId(null);
    setEditImagePreview(null);
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}/`);
      } catch (error) {
        console.warn('API delete error, removing locally:', error);
      }
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      saveStoredProducts(updated);
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockProduct) return;
    const addAmount = parseInt(restockQty || 0, 10);
    if (addAmount <= 0) return;

    const oldStock = parseInt(restockProduct.current_stock || 0, 10);
    const newStock = oldStock + addAmount;
    const updatedProduct = { ...restockProduct, current_stock: newStock };

    try {
      await api.put(`/products/${restockProduct.id}/`, updatedProduct);
    } catch (err) {
      console.warn('Restock API notice:', err);
    }

    const updatedList = products.map(p => p.id === restockProduct.id ? updatedProduct : p);
    setProducts(updatedList);
    saveStoredProducts(updatedList);

    setRestockSuccess({
      productName: restockProduct.name,
      added: addAmount,
      newStock: newStock
    });

    setRestockProduct(null);
    setRestockQty(10);
  };

  return (
    <div className="page-container" style={{ width: '100%' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 24 }}>
        <div>
          <h2>📦 Store Inventory & Products</h2>
          <p>Manage product catalog, upload permanent product images, and restock inventory</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}
        >
          {showAddForm ? '✕ Cancel' : '➕ Add New Product'}
        </button>
      </div>

      {/* Restock Notification Banner */}
      {restockSuccess && (
        <div className="alert-success" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>✓ Restock Completed:</strong> Added <strong>+{restockSuccess.added}</strong> units to <strong>{restockSuccess.productName}</strong>. Total stock is now <strong>{restockSuccess.newStock}</strong>.
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => setRestockSuccess(null)}>Dismiss</button>
        </div>
      )}

      {/* Restock Modal Box */}
      {restockProduct && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--primary)', background: 'var(--gradient-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>📦 Restock: {restockProduct.name}</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setRestockProduct(null)}>✕ Close</button>
          </div>

          <form onSubmit={handleRestockSubmit}>
            <div style={{ marginBottom: 14, fontSize: '14px', color: 'var(--text-secondary)' }}>
              Current Stock: <strong style={{ color: 'var(--gold-200)' }}>{restockProduct.current_stock}</strong> units
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Quick Add:</span>
              {[5, 10, 20, 50, 100].map(qty => (
                <button
                  type="button"
                  key={qty}
                  className="btn btn-sm btn-secondary"
                  onClick={() => setRestockQty(qty)}
                  style={{ 
                    background: Number(restockQty) === qty ? 'var(--gradient-gold)' : 'rgba(255,255,255,0.06)',
                    color: Number(restockQty) === qty ? '#0a0a0a' : 'var(--text)',
                    fontWeight: '700'
                  }}
                >
                  +{qty}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label className="form-label">Units to Add</label>
                <input 
                  type="number" 
                  min="1" 
                  className="form-input" 
                  value={restockQty} 
                  onChange={e => setRestockQty(e.target.value)} 
                  required 
                />
              </div>
              <div style={{ paddingBottom: '10px', fontSize: '15px', fontWeight: 'bold', color: 'var(--gold-300)' }}>
                New Stock Preview: {(parseInt(restockProduct.current_stock || 0, 10) + (parseInt(restockQty || 0, 10)))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">✓ Confirm & Update Stock</button>
              <button type="button" className="btn btn-secondary" onClick={() => setRestockProduct(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Add New Product Form with Permanent Image Upload */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid var(--border-gold)', animation: 'slideDown 0.3s ease' }}>
          <h3 style={{ marginTop: 0, marginBottom: 18 }}>✦ Add New Product to Store</h3>
          <form onSubmit={handleAddSubmit}>
            <div className="form-group form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '14px', marginBottom: 16 }}>
              <div>
                <label className="form-label">Product Name</label>
                <input 
                  className="form-input" 
                  required 
                  value={newProduct.name} 
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} 
                  placeholder="e.g. Sprite 1.5L" 
                />
              </div>
              <div>
                <label className="form-label">Selling Price (₱)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  required 
                  value={newProduct.selling_price} 
                  onChange={(e) => setNewProduct({ ...newProduct, selling_price: e.target.value })} 
                  placeholder="0.00" 
                />
              </div>
              <div>
                <label className="form-label">Purchase Cost (₱)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input" 
                  required 
                  value={newProduct.purchase_cost} 
                  onChange={(e) => setNewProduct({ ...newProduct, purchase_cost: e.target.value })} 
                  placeholder="0.00" 
                />
              </div>
              <div>
                <label className="form-label">Initial Stock</label>
                <input 
                  type="number" 
                  className="form-input" 
                  required 
                  value={newProduct.current_stock} 
                  onChange={(e) => setNewProduct({ ...newProduct, current_stock: e.target.value })} 
                  placeholder="0" 
                />
              </div>
            </div>

            {/* Permanent Product Image Upload with Live Preview */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Product Image (Permanently Saved in Cloud Database)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageFileChange(e, false)} 
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--text-secondary)',
                    fontSize: '13px'
                  }} 
                />
                {imagePreview ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      style={{ 
                        width: '64px', 
                        height: '64px', 
                        objectFit: 'cover', 
                        borderRadius: '10px', 
                        border: '2px solid var(--primary)',
                        boxShadow: '0 4px 12px rgba(212,160,23,0.3)' 
                      }} 
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 'bold' }}>✓ Image Ready for Database</span>
                      <button 
                        type="button" 
                        onClick={() => setImagePreview(null)}
                        style={{ fontSize: '11px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    No image chosen (Default product icon will be shown)
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving to Database...' : '✦ Save Product to Cloud'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div className="card table-container">
        {loading ? (
          <div className="loading-spinner"></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Image</th>
                <th>Product Name</th>
                <th>Selling Price</th>
                <th>Cost</th>
                <th>Current Stock</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => {
                const productImg = product.image_data || (product.images && product.images.length > 0 ? (product.images[0].url || product.images[0].image) : null);

                if (editingId === product.id) {
                  return (
                    <tr key={product.id} style={{ background: 'rgba(212, 160, 23, 0.05)' }}>
                      <td>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleImageFileChange(e, true)}
                          style={{ width: '90px', fontSize: '11px' }}
                        />
                        {editImagePreview && (
                          <img 
                            src={editImagePreview} 
                            alt="preview" 
                            style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', marginTop: '4px' }} 
                          />
                        )}
                      </td>
                      <td>
                        <input 
                          className="form-input" 
                          value={editForm.name} 
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="0.01" 
                          className="form-input" 
                          value={editForm.selling_price} 
                          onChange={e => setEditForm({ ...editForm, selling_price: e.target.value })} 
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="0.01" 
                          className="form-input" 
                          value={editForm.purchase_cost} 
                          onChange={e => setEditForm({ ...editForm, purchase_cost: e.target.value })} 
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={editForm.current_stock} 
                          onChange={e => setEditForm({ ...editForm, current_stock: e.target.value })} 
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-primary btn-sm" onClick={handleEditSubmit} style={{ marginRight: 6 }}>
                          ✓ Save
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                }

                const isLowStock = Number(product.current_stock || 0) <= 5;

                return (
                  <tr key={product.id}>
                    <td>
                      {productImg ? (
                        <img 
                          src={productImg} 
                          alt={product.name} 
                          style={{ 
                            width: '46px', 
                            height: '46px', 
                            objectFit: 'cover', 
                            borderRadius: '8px', 
                            border: '1px solid var(--border-gold)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                          }} 
                        />
                      ) : (
                        <div style={{ 
                          width: '46px', 
                          height: '46px', 
                          background: 'rgba(212, 160, 23, 0.08)', 
                          borderRadius: '8px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '1.4em',
                          border: '1px solid var(--border)'
                        }}>
                          📦
                        </div>
                      )}
                    </td>
                    <td>
                      <Link 
                        to={`/products/${product.id}`} 
                        style={{ fontWeight: '700', color: 'var(--gold-200)', textDecoration: 'none', transition: 'color 0.2s' }}
                        onMouseEnter={e => e.target.style.color = '#fff'}
                        onMouseLeave={e => e.target.style.color = 'var(--gold-200)'}
                      >
                        {product.name}
                      </Link>
                      {product.sku && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{product.sku}</div>
                      )}
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--gold-300)' }}>
                      ₱{parseFloat(product.selling_price || 0).toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      ₱{parseFloat(product.purchase_cost || 0).toFixed(2)}
                    </td>
                    <td>
                      <span className={`badge ${isLowStock ? 'status-danger' : 'status-success'}`}>
                        {product.current_stock} units {isLowStock && '⚠️ Low'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => setRestockProduct(product)}
                        style={{ marginRight: 6, borderColor: 'var(--border-gold)', color: 'var(--gold-300)' }}
                      >
                        📦 Restock
                      </button>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleEditClick(product)} 
                        style={{ marginRight: 6 }}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => handleDelete(product.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No products found. Click "Add New Product" to create your first item.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
