import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editImagePreview, setEditImagePreview] = useState(null);

  // Restock state
  const [showRestock, setShowRestock] = useState(false);
  const [restockQty, setRestockQty] = useState(10);
  const [restockSuccess, setRestockSuccess] = useState(null);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/products/${id}/`);
      setProduct(response.data);
      setEditForm(response.data);
      setEditImagePreview(response.data.image_data || null);
    } catch (error) {
      console.warn('Error fetching product detail, checking local storage:', error);
      const local = JSON.parse(localStorage.getItem('sari_local_products') || '[]');
      const found = local.find(p => String(p.id) === String(id));
      if (found) {
        setProduct(found);
        setEditForm(found);
        setEditImagePreview(found.image_data || null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

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

        setEditImagePreview(compressedBase64);
        setEditForm(prev => ({ ...prev, image_data: compressedBase64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...editForm,
      selling_price: parseFloat(editForm.selling_price || 0),
      purchase_cost: parseFloat(editForm.purchase_cost || 0),
      current_stock: parseInt(editForm.current_stock || 0, 10),
      image_data: editImagePreview || editForm.image_data
    };

    try {
      const res = await api.put(`/products/${id}/`, payload);
      if (res.data) {
        setProduct(res.data);
      }
    } catch (error) {
      console.warn('Error updating product via API:', error);
      setProduct(payload);
    }

    // Update in local storage
    const local = JSON.parse(localStorage.getItem('sari_local_products') || '[]');
    const updatedList = local.map(p => String(p.id) === String(id) ? { ...p, ...payload } : p);
    localStorage.setItem('sari_local_products', JSON.stringify(updatedList));

    setIsEditing(false);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!product) return;
    const addQty = parseInt(restockQty || 0, 10);
    if (addQty <= 0) return;

    const oldStock = parseInt(product.current_stock || 0, 10);
    const newStock = oldStock + addQty;
    const updated = { ...product, current_stock: newStock };

    try {
      await api.put(`/products/${id}/`, updated);
    } catch (err) {
      console.warn('Restock error:', err);
    }

    setProduct(updated);
    setEditForm(updated);

    const local = JSON.parse(localStorage.getItem('sari_local_products') || '[]');
    const updatedList = local.map(p => String(p.id) === String(id) ? updated : p);
    localStorage.setItem('sari_local_products', JSON.stringify(updatedList));

    setRestockSuccess(`Added +${addQty} items! Total stock is now ${newStock}.`);
    setShowRestock(false);
    setRestockQty(10);
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '30px' }}>
        <h3>Product Not Found</h3>
        <p style={{ color: 'var(--text-muted)', margin: '10px 0 20px' }}>The product you are looking for does not exist.</p>
        <Link to="/products" className="btn btn-primary">Back to Products</Link>
      </div>
    );
  }

  const productImg = product.image_data || (product.images && product.images.length > 0 ? (product.images[0].url || product.images[0].image) : null);
  const isLowStock = Number(product.current_stock || 0) <= 5;

  return (
    <div className="card" style={{ maxWidth: '850px', margin: '0 auto', padding: '30px', border: '1px solid var(--border-gold)' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2>✦ {product.name}</h2>
          <p>Product Specifications & Inventory Status</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowRestock(!showRestock)}
            style={{ borderColor: 'var(--border-gold)', color: 'var(--gold-300)' }}
          >
            📦 Restock
          </button>
          <button className="btn btn-secondary" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? '✕ Cancel' : '✎ Edit Product'}
          </button>
          <Link to="/products" className="btn btn-primary">Back to List</Link>
        </div>
      </div>

      {restockSuccess && (
        <div className="alert-success" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✓ {restockSuccess}</span>
          <button className="btn btn-sm btn-secondary" onClick={() => setRestockSuccess(null)}>Dismiss</button>
        </div>
      )}

      {/* Restock Box */}
      {showRestock && (
        <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--primary)', background: 'var(--gradient-card)' }}>
          <h3 style={{ marginTop: 0 }}>📦 Restock {product.name}</h3>
          <form onSubmit={handleRestockSubmit}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: 14 }}>
              <span style={{ fontSize: '13px', alignSelf: 'center', fontWeight: '600', color: 'var(--text-muted)' }}>Quick Add:</span>
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
                <label className="form-label">Quantity to Add</label>
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
                New Stock: {parseInt(product.current_stock || 0, 10) + parseInt(restockQty || 0, 10)}
              </div>
            </div>
            <button type="submit" className="btn btn-primary">✓ Confirm Restock</button>
          </form>
        </div>
      )}

      {/* Main Info with Persistent Image Display */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Product Image */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {productImg ? (
            <img 
              src={productImg} 
              alt={product.name} 
              style={{ 
                width: '100%', 
                height: '220px', 
                objectFit: 'cover', 
                borderRadius: '14px', 
                border: '2px solid var(--border-gold)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
              }} 
            />
          ) : (
            <div style={{ 
              width: '100%', 
              height: '220px', 
              background: 'rgba(212, 160, 23, 0.08)', 
              borderRadius: '14px', 
              border: '1px solid var(--border)',
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '3.5rem' 
            }}>
              <span>📦</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>No Image Uploaded</span>
            </div>
          )}
        </div>

        {/* Details or Edit Form */}
        <div>
          {isEditing ? (
            <form onSubmit={handleEditSubmit}>
              <div className="form-group form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Product Name</label>
                  <input 
                    className="form-input" 
                    value={editForm.name} 
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="form-label">SKU</label>
                  <input 
                    className="form-input" 
                    value={editForm.sku || ''} 
                    onChange={e => setEditForm({ ...editForm, sku: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="form-label">Selling Price (₱)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    value={editForm.selling_price} 
                    onChange={e => setEditForm({ ...editForm, selling_price: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <label className="form-label">Current Stock</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editForm.current_stock} 
                    onChange={e => setEditForm({ ...editForm, current_stock: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '14px' }}>
                <label className="form-label">Update Image (Permanent)</label>
                <input type="file" accept="image/*" onChange={handleImageFileChange} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                ✓ Save Changes
              </button>
            </form>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Product Name</span>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--gold-200)', marginTop: '4px' }}>{product.name}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SKU Code</span>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginTop: '4px' }}>{product.sku || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Selling Price</span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--gold-300)', marginTop: '4px' }}>₱{parseFloat(product.selling_price || 0).toFixed(2)}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Stock</span>
                <div style={{ marginTop: '6px' }}>
                  <span className={`badge ${isLowStock ? 'status-danger' : 'status-success'}`} style={{ fontSize: '13px' }}>
                    {product.current_stock} units {isLowStock && '⚠️ Low Stock'}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Purchase Cost</span>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '4px' }}>₱{parseFloat(product.purchase_cost || 0).toFixed(2)}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Profit Margin</span>
                <div style={{ fontSize: '15px', color: '#4ade80', fontWeight: '700', marginTop: '4px' }}>
                  +₱{(parseFloat(product.selling_price || 0) - parseFloat(product.purchase_cost || 0)).toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
