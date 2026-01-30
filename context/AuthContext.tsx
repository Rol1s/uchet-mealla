import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, getCurrentUser, signIn as apiSignIn, signOut as apiSignOut } from '../services/supabase';
import type { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      console.log('[AuthContext] loadUser got:', currentUser?.email, currentUser?.role);
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      console.error('[AuthContext] Error loading user:', error);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initUser = async () => {
      await loadUser();
      if (isMounted) setLoading(false);
    };

    initUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN') {
        await loadUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUser]);

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] signIn started');
    setLoading(true);
    try {
      await apiSignIn(email, password);
      console.log('[AuthContext] apiSignIn completed, loading user...');
      const loadedUser = await loadUser();
      console.log('[AuthContext] loadUser returned:', loadedUser?.email);
    } catch (error) {
      console.error('[AuthContext] Sign in error:', error);
      throw error;
    } finally {
      console.log('[AuthContext] signIn finished, setting loading=false');
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await apiSignOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debug: log state changes
  useEffect(() => {
    console.log('[AuthContext] State changed - user:', user?.email, 'loading:', loading, 'isAuthenticated:', !!user);
  }, [user, loading]);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
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
