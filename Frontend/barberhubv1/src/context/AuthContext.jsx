import { createContext, useState, useContext } from 'react';
import axios from 'axios'; // We need axios to talk to the backend

// 1. Create the Context
const AuthContext = createContext(null);

// 2. Create the Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null means no user is logged in

  const login = async (email, password) => {
    try {
      // 1. The REAL database connection
      const response = await axios.post('http://localhost:5000/api/login', {
        email,
        password
      });

      // 2. Extract the Golden Ticket (JWT) and user profile from your backend
      const { token, user: userData } = response.data;

      // 3. Save the token to the browser's memory so they don't log out when refreshing
      localStorage.setItem('barberToken', token);

      // 4. Set the global user state (Role, Life Count, etc.)
      setUser(userData);
      
      // 5. Tell the Login.jsx page that it was successful so it can route them
      return { success: true, role: userData.role };

    } catch (error) {
      console.error('Login error:', error);
      // If backend sends a 404 (Not Found) or 401 (Wrong Password), display it!
      alert(error.response?.data?.message || 'Gagal login. Periksa kembali email dan password.');
      return { success: false };
    }
  };

  const logout = () => {
    // Shred the ticket and clear the user
    localStorage.removeItem('barberToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Create a Custom Hook for easy access
export const useAuth = () => useContext(AuthContext);