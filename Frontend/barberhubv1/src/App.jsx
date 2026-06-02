import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import CustomerDashboard from './components/dashboard/CustomerDashboard';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminDashboard from './components/dashboard/AdminDashboard';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

function App() {
  return (
    <>
      {/* This Toaster sits above everything and listens for notifications. */}
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#1E293B', // premium Lighter Slate
            color: '#F8FAFC',      // Ice White text
            border: '1px solid #64748B', // cool gray border
          },
          success: {
            iconTheme: {
              primary: '#D4AF37', // Metallic Brass/Gold accent
              secondary: '#0F172A', // Deep Slate background
            },
          },
          error: {
            style: {
              background: '#450a0a', // Dark red for errors
              color: '#fca5a5',
              border: '1px solid #7f1d1d',
            }
          }
        }}
      />
      
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Protected Customer Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['Customer']}>
              <CustomerDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Protected Admin Routes */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
      
    </>
  );
}

export default App;