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
      
      // Если юзер вернулся - отлично, сохраняем
      if (currentUser) {
        console.log('[AuthContext] loadUser got:', currentUser.email, currentUser.role);
        setUser(currentUser);
        return currentUser;
      }
      
      // Если вернулся null, проверяем, есть ли активная сессия в клиенте
      // Если сессия есть, но getCurrentUser вернул null (например, сбой сети), 
      // то НЕ разлогиниваем пользователя, оставляем старого (если был)
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        console.warn('[AuthContext] Have session but no profile. Keeping current state.');
        // Можно добавить логику "Офлайн режим", но главное - не setUser(null)
        return user; 
      }

      // Если сессии точно нет - тогда сбрасываем
      setUser(null);
      return null;

    } catch (error) {
      console.error('[AuthContext] Error loading user:', error);
      // При ошибке НЕ сбрасываем пользователя, если он был
      return user;
    }
  }, [user]); // добавляем user в зависимости, чтобы можно было вернуть текущего

  useEffect(() => {
    let isMounted = true;

    const initUser = async () => {
      await loadUser();
      if (isMounted) setLoading(false);
    };

    initUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      console.log('[AuthContext] Auth event:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // При обновлении токена или входе - обновляем данные
        await loadUser();
      } else if (event === 'SIGNED_OUT') {
        // Только явный выход сбрасывает пользователя
        setUser(null);
      }
      // Игнорируем остальные события (INITIAL_SESSION и т.д.), так как initUser уже отработал
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
