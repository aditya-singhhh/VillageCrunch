import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export { AuthContext };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    // A login lasts 180 days. If the saved one has expired, start logged out (instead of
    // looking logged in and then failing at checkout).
    let expired = false;
    try {
      const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      expired = !!exp && exp * 1000 < Date.now();
    } catch (_) { expired = !token; }
    if (storedUser && token && expired) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } else if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (emailOrPhone, password) => {
    // Get local cart before login
    const localCartString = localStorage.getItem('cart');
    const localCart = localCartString ? JSON.parse(localCartString) : [];

    const { data } = await axios.post('/api/auth/login', { emailOrPhone, password });
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
    localStorage.setItem('token', data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    
    // Return both user data and local cart for syncing
    return { user: data, localCart };
  };

  const register = async (userData) => {
    // Get local cart before registration
    const localCartString = localStorage.getItem('cart');
    const localCart = localCartString ? JSON.parse(localCartString) : [];

    const { data } = await axios.post('/api/auth/register', userData);
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
    localStorage.setItem('token', data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    
    // Return both user data and local cart for syncing
    return { user: data, localCart };
  };

  // Phone OTP: idToken comes from Firebase after the SMS code is confirmed.
  // Returns { needName: true } for a new number until a name is supplied.
  const loginWithPhone = async (idToken, name) => {
    const localCartString = localStorage.getItem('cart');
    const localCart = localCartString ? JSON.parse(localCartString) : [];
    const res = await axios.post('/api/auth/phone', { idToken, name });
    if (res.data.needName) return { needName: true };
    const data = res.data;
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
    localStorage.setItem('token', data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    return { user: data, localCart, isNew: res.status === 201 };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithPhone, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};