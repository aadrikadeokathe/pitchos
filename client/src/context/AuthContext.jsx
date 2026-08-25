import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, loginDemo as apiLoginDemo } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pitchos_token');
    const savedUser = localStorage.getItem('pitchos_user');

    if (token) {
      getMe()
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('pitchos_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          if (savedUser) {
            try { setUser(JSON.parse(savedUser)); } catch (e) { localStorage.removeItem('pitchos_token'); }
          } else {
            localStorage.removeItem('pitchos_token');
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginUser = (token, userData) => {
    localStorage.setItem('pitchos_token', token);
    localStorage.setItem('pitchos_user', JSON.stringify(userData));
    setUser(userData);
  };

  const loginDemo = async () => {
    try {
      const res = await apiLoginDemo();
      loginUser(res.data.token, res.data.user);
      return res.data.user;
    } catch (err) {
      // Fallback demo user if server is offline
      const mockUser = { id: 'demo-interviewer-id', email: 'interviewer@pitchos.demo', isDemo: true };
      loginUser('demo-mock-token', mockUser);
      return mockUser;
    }
  };

  const logout = () => {
    localStorage.removeItem('pitchos_token');
    localStorage.removeItem('pitchos_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
