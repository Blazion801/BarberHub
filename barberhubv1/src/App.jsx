import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login.jsx';
import Register from './components/auth/Register.jsx';

function App() {
  return (
    <Routes>
      {/* Default route redirects to login for now */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Catch-all for undefined routes */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
          404 - Halaman tidak ditemukan
        </div>
      } />
    </Routes>
  );
}

export default App;