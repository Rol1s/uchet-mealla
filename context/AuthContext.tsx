import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import type { User } from '../types';

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
  const profileCacheRef = useRef<{ userId: string; user: User } | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const cached = profileCacheRef.current;
        if (cached && cached.userId === session.user.id) {
          setUser(cached.user);
          setLoading(false);
          return;
        }

        const fallbackUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.email?.split('@')[0] || 'User',
          role: 'operator',
          created_at: new Date().toISOString(),
        };

        try {
          const profilePromise = supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
          );
          const { data: profile, error } = (await Promise.race([
            profilePromise,
            timeoutPromise,
          ])) as { data: User | null; error: Error | null };

          const resolved = profile && !error ? (profile as User) : fallbackUser;
          profileCacheRef.current = { userId: session.user.id, user: resolved };
          setUser(resolved);
        } catch {
          profileCacheRef.current = { userId: session.user.id, user: fallbackUser };
          setUser(fallbackUser);
        }
      } else {
        profileCacheRef.current = null;
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
    // onAuthStateChange обработает остальное
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // onAuthStateChange обработает остальное
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
