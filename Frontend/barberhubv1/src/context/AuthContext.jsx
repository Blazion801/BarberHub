import { createContext, useState, useContext } from 'react';

// 1. Create the Context
const AuthContext = createContext(null);

// 2. Create the Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null means no user is logged in

  const login = async (email, password) => {
    // TODO: Replace with actual Axios call to backend (POST /api/login)
    console.log('Simulating backend authentication for:', email);
    
    // Mock RBAC logic based on SRS REQ-1.5
    if (email === 'admin@barberhub.com') {
      setUser({ role: 'Admin', name: 'Master Admin', email });
    } else {
      // Standard customer gets the 3-life payload (REQ-4.1)
      setUser({ role: 'Customer', name: 'John Doe', email, life_count: 3, is_blocked: false });
    }
    
    return true; // Simulate success
  };

  const logout = () => {
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