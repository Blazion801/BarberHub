import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ProtectedRoute from './components/common/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Temporary Mock Dashboards
const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold">Customer Dashboard</h1>
      <p>Welcome, {user.name}. You have {user.life_count} lives remaining.</p>
      <button onClick={logout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">Logout</button>
    </div>
  );
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  return (
    <div className="p-8 text-center bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold">Admin Console</h1>
      <p>Logged in as: {user.role}</p>
      <button onClick={logout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">Logout</button>
    </div>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
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
  );
}

export default App;