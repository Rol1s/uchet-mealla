import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { User } from '../types';

const ROLE_CACHE_KEY = 'metaltrack_role';
const PROFILE_FETCH_TIMEOUT_MS = 5000;

function getCachedRole(userId: string): 'admin' | 'operator' {
  try {
    const raw = localStorage.getItem(`${ROLE_CACHE_KEY}_${userId}`);
    if (raw === 'admin' || raw === 'operator') return raw;
  } catch { /* ignore */ }
  return 'operator';
}

function setCachedRole(userId: string, role: string): void {
  try { localStorage.setItem(`${ROLE_CACHE_KEY}_${userId}`, role); } catch { /* ignore */ }
}

function clearCachedRole(userId: string): void {
  try { localStorage.removeItem(`${ROLE_CACHE_KEY}_${userId}`); } catch { /* ignore */ }
}

/** Дедупликация: один запрос на userId одновременно */
const profileFetchCache = new Map<string, Promise<User | null>>();

async function fetchProfile(userId: string): Promise<User | null> {
  const cached = profileFetchCache.get(userId);
  if (cached) return cached;

  const promise = (async () => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), PROFILE_FETCH_TIMEOUT_MS)
    );
    try {
      const result = await Promise.race([
        supabase.from('users').select('*').eq('id', userId).single(),
        timeout,
      ]) as { data: User | null; error: unknown };
      return result.data ?? null;
    } catch {
      return null;
    }
  })().finally(() => profileFetchCache.delete(userId));

  profileFetchCache.set(userId, promise);
  return promise;
}

function makeUserFromSession(sessionUser: { id: string; email?: string }, role: 'admin' | 'operator'): User {
  return {
    id: sessionUser.id,
    email: sessionUser.email || '',
    name: sessionUser.email?.split('@')[0] || 'User',
    role,
    created_at: new Date().toISOString(),
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * Используем ТОЛЬКО onAuthStateChange — он гарантированно стреляет INITIAL_SESSION
     * сразу при монтировании с текущей сессией. getSession() отдельно не нужен.
     * Это устраняет дублирование запросов профиля.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { id } = session.user;
      const cachedRole = getCachedRole(id);

      // Немедленно показываем UI с кэшированной ролью
      setUser(makeUserFromSession(session.user, cachedRole));
      setLoading(false);

      // Фоново обновляем реальный профиль из БД
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        const profile = await fetchProfile(id);
        if (profile) {
          setUser(profile);
          setCachedRole(id, profile.role);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    if (user?.id) clearCachedRole(user.id);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
