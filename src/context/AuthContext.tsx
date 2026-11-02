import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/user';
import { authService } from '../services/authService';
import { useToast } from './ToastContext';

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (name: string, email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
  updateProfile: (name: string, email: string) => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const current = authService.getCurrentUser();
    setUser(current);
    setIsLoading(false);
  }, []);

  const refreshUser = () => {
    setUser(authService.getCurrentUser());
  };

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const u = await authService.signIn(email, pass);
      setUser(u);
      showToast('Welcome back', `Signed in as ${u.email}`, 'success');
    } catch {
      showToast('Authentication failed', 'Please check your credentials', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (name: string, email: string, pass: string) => {
    setIsLoading(true);
    try {
      const u = await authService.signUp(name, email, pass);
      setUser(u);
      showToast('Account created', `Welcome to LensIQ, ${u.name}!`, 'success');
    } catch {
      showToast('Registration failed', 'Unable to create account', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      const u = await authService.signInWithGoogle();
      if (u) {
        setUser(u);
        showToast('Google Sign-In successful', `Connected as ${u.email}`, 'success');
      }
    } catch (err: any) {
      showToast('Google Sign-In', err?.message || 'Authentication failed', 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    authService.signOut();
    setUser(null);
    showToast('Signed out', 'You have been signed out successfully.', 'info');
  };

  const updateProfile = (name: string, email: string) => {
    const updated = authService.updateUser({ name, email });
    if (updated) {
      setUser(updated);
      showToast('Profile updated', 'Your account details have been saved.', 'success');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

