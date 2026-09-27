import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  updateUser: (updatedUser: Partial<User>) => void;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('arx_user');
      if (!saved || saved === 'undefined' || saved === 'null') {
        return null;
      }
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem('arx_user');
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('arx_token');
    return saved && saved !== 'undefined' && saved !== 'null' ? saved : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/user');
        const fetchedUser = response.data.user;
        setUser(fetchedUser);
        localStorage.setItem('arx_user', JSON.stringify(fetchedUser));
      } catch {
        setUser(null);
        setToken(null);
        localStorage.removeItem('arx_token');
        localStorage.removeItem('arx_user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [token]);

  useEffect(() => {
    const handleUserUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<User>;
      if (customEvent.detail) {
        setUser((prev) => (prev ? { ...prev, ...customEvent.detail } : customEvent.detail));
        localStorage.setItem('arx_user', JSON.stringify(customEvent.detail));
      }
    };

    window.addEventListener('arx:user-updated', handleUserUpdate);
    return () => window.removeEventListener('arx:user-updated', handleUserUpdate);
  }, []);

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedUser };
      localStorage.setItem('arx_user', JSON.stringify(merged));
      return merged;
    });
  };

  const login = (newToken: string, newUser: User) => {
    if (!newToken || !newUser) return;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('arx_token', newToken);
    localStorage.setItem('arx_user', JSON.stringify(newUser));
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('arx_token');
      localStorage.removeItem('arx_user');
      window.location.href = '/login';
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    return user.permissions?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
