import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { User } from '../types';

const ROLE_CACHE_KEY = 'metaltrack_role';
const PROFILE_FETCH_TIMEOUT_MS = 8000;
const PROFILE_FETCH_RETRIES = 3;

/** Один запрос профиля на userId — повторные вызовы ждут тот же результат */
const profileFetchCache = new Map<string, Promise<{ data: User | null; error: unknown }>>();

function getCachedRole(userId: string): 'admin' | 'operator' {
  try {
    const raw = localStorage.getItem(`${ROLE_CACHE_KEY}_${userId}`);
    if (raw === 'admin' || raw === 'operator') return raw;
  } catch {
    // ignore
  }
  return 'operator';
}

function setCachedRole(userId: string, role: string): void {
  try {
    localStorage.setItem(`${ROLE_CACHE_KEY}_${userId}`, role);
  } catch {
    // ignore
  }
}

function clearCachedRole(userId: string): void {
  try {
    localStorage.removeItem(`${ROLE_CACHE_KEY}_${userId}`);
  } catch {
    // ignore
  }
}

async function fetchProfileWithRetry(userId: string): Promise<{ data: User | null; error: unknown }> {
  let pending = profileFetchCache.get(userId);
  if (pending) return pending;

  const run = async (): Promise<{ data: User | null; error: unknown }> => {
    for (let attempt = 0; attempt < PROFILE_FETCH_RETRIES; attempt++) {
      const profilePromise = supabase.from('users').select('*').eq('id', userId).single();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), PROFILE_FETCH_TIMEOUT_MS)
      );
      try {
        const result = (await Promise.race([profilePromise, timeoutPromise])) as { data: User | null; error: unknown };
        if (result.data && !result.error) return result;
      } catch {
        // retry
      }
    }
    return { data: null, error: new Error('Profile fetch failed after retries') };
  };

  pending = run().finally(() => {
    profileFetchCache.delete(userId);
  });
  profileFetchCache.set(userId, pending);
  return pending;
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
    // Быстрый показ интерфейса: сразу восстанавливаем сессию и кэшированную роль
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const cachedRole = getCachedRole(session.user.id);
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.email?.split('@')[0] || 'User',
          role: cachedRole,
          created_at: new Date().toISOString(),
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const fallbackRole = getCachedRole(session.user.id);
        const fallbackUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.email?.split('@')[0] || 'User',
          role: fallbackRole,
          created_at: new Date().toISOString(),
        };

        const { data: profile, error } = await fetchProfileWithRetry(session.user.id);

        if (profile && !error) {
          setUser(profile as User);
          setCachedRole(session.user.id, profile.role);
        } else {
          setUser((prev) => {
            if (prev?.id === session.user.id) return prev;
            return fallbackUser;
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    if (user?.id) clearCachedRole(user.id);
    setLoading(true);
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
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
