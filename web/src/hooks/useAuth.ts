import { useState, useEffect, useCallback } from 'react';

interface AuthUser {
  id: string;
  email: string | null;
  authProvider: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || '';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      const json = await res.json();
      setUser(json.data ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = () => {
    window.location.href = `${API_BASE}/api/auth/login`;
  };

  const logout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  return { user, loading, login, logout, refresh: checkAuth };
}
