import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('sari_role') || 'admin';
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If member tries to access owner/admin pages (Dashboard, Products, POS, Customers, Payments, Receipts, History)
  if (userRole === 'member' && location.pathname !== '/member') {
    return <Navigate to="/member" replace />;
  }

  // If role is explicitly specified and does not match
  if (role && role !== userRole && userRole !== 'admin') {
    return <Navigate to="/member" replace />;
  }

  return children;
}