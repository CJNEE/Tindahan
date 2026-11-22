import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import POS from './pages/POS'
import Customers from './pages/Customers'
import Payments from './pages/Payments'
import Receipt from './pages/Receipt'
import ReceiptsList from './pages/ReceiptsList'
import SalesHistory from './pages/SalesHistory'
import ProductDetail from './pages/ProductDetail'
import CustomerDetail from './pages/CustomerDetail'
import MemberPortal from './pages/MemberPortal'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import './styles.css'

function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/member" element={<ProtectedRoute><Layout><MemberPortal/></Layout></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout><Dashboard/></Layout></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Layout><Products/></Layout></ProtectedRoute>} />
        <Route path="/products/:id" element={<ProtectedRoute><Layout><ProductDetail/></Layout></ProtectedRoute>} />
        <Route path="/shop" element={<ProtectedRoute><Layout><POS/></Layout></ProtectedRoute>} />
        <Route path="/pos" element={<ProtectedRoute><Layout><POS/></Layout></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><Layout><Customers/></Layout></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute><Layout><CustomerDetail/></Layout></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><Layout><Payments/></Layout></ProtectedRoute>} />
        <Route path="/receipts" element={<ProtectedRoute><Layout><ReceiptsList/></Layout></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><Layout><SalesHistory/></Layout></ProtectedRoute>} />
        <Route path="/receipt" element={<ProtectedRoute><Layout><Receipt/></Layout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
