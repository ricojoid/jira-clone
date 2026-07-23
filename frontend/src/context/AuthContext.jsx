import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.getMe()
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (identifier, password) => {
    const res = await authApi.login({ identifier, email: identifier, username: identifier, password });
    localStorage.setItem('token', res.data.access_token);
    const userRes = await authApi.getMe();
    setUser(userRes.data);
    return userRes.data;
  };

  const register = async (data) => {
    await authApi.register(data);
    return login(data.email, data.password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const roleLower = (user?.role || '').toLowerCase();
  const isSuperAdmin = ['super_admin', 'admin', 'super admin', 'superadmin'].includes(roleLower);
  const isPM = isSuperAdmin || roleLower === 'pm' || roleLower === 'project_manager';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isPM, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
