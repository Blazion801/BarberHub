import { createContext, useState, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email,
        password
      });

      // Save the user data to state
      setUser(response.data.user);
      
      // Save the token to local storage so they stay logged in if they refresh
      localStorage.setItem('token', response.data.token);

      return { success: true, role: response.data.user.role };
    } catch (error) {
      // Return the error message safely back to the Login component
      console.error("Login Context Error:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || "Gagal terhubung ke server." 
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);