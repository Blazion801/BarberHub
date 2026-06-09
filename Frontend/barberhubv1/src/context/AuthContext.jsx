import { createContext, useState, useContext } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 1. SUNTIKAN ANTI-AMNESIA: Cek localStorage saat web pertama kali dimuat
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (email, password) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await axios.post(`${API_URL}/api/login`, { email, password });

      // Save the user data to state
      setUser(response.data.user);

      // 2. SIMPAN DATA USER KE DOMPET: Biar pas refresh bisa diambil lagi
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user)); // <--- INI KUNCINYA

      return { success: true, role: response.data.user.role };
    } catch (error) {
      console.error("Login Context Error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Gagal terhubung ke server.",
      };
    }
  };

  const logout = () => {
    // 3. BERSIHKAN DOMPET SAAT LOGOUT
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
