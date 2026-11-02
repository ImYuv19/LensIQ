import { UserProfile } from '../types/user';
import { INITIAL_USER } from './mockData';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { fetchApi } from './apiClient';

const AUTH_USER_KEY = 'lensiq_auth_user_v1';

class AuthService {
  private currentUser: UserProfile | null = null;

  constructor() {
    const saved = localStorage.getItem(AUTH_USER_KEY);
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch {
        this.currentUser = INITIAL_USER;
      }
    } else {
      this.currentUser = INITIAL_USER;
      this.persist();
    }

    // If Supabase client configured, listen to auth state changes
    if (isSupabaseConfigured && supabase) {
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          localStorage.setItem('lensiq_supabase_token', session.access_token);
          await this.syncRemoteProfile();
        } else {
          localStorage.removeItem('lensiq_supabase_token');
        }
      });
    }
  }

  private persist() {
    if (this.currentUser) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  }

  public async syncRemoteProfile(): Promise<UserProfile | null> {
    try {
      const profile = await fetchApi<any>('/auth/me');
      if (profile && profile.id) {
        const updatedUser: UserProfile = {
          id: profile.id,
          name: profile.full_name || this.currentUser?.name || 'Alex Morgan',
          email: profile.email || this.currentUser?.email || 'alex.morgan@lensiq.ai',
          avatarUrl: profile.avatar_url || this.currentUser?.avatarUrl,
          plan: 'LensIQ Free Plan',
          promptVersion: this.currentUser?.promptVersion || 'v2',
          joinedAt: this.currentUser?.joinedAt || Date.now(),
          usage: {
            questionsAskedToday: profile.daily_questions_count || 0,
            questionsDailyLimit: 20,
            uploadsToday: profile.daily_uploads_count || 0,
            uploadsDailyLimit: 10,
            storageUsedBytes: profile.storage_used_bytes || 0,
            storageLimitBytes: 100 * 1024 * 1024,
          },
        };
        this.currentUser = updatedUser;
        this.persist();
        return updatedUser;
      }
    } catch (e) {
      console.warn('Sync remote profile note:', e);
    }
    return this.currentUser;
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public async signIn(email: string, password: string): Promise<UserProfile> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw new Error(error.message);
      if (data.session) {
        localStorage.setItem('lensiq_supabase_token', data.session.access_token);
        const synced = await this.syncRemoteProfile();
        if (synced) return synced;
      }
    }

    const user: UserProfile = {
      ...INITIAL_USER,
      email: email.trim(),
      name: email.split('@')[0].replace('.', ' ').replace(/^./, (str) => str.toUpperCase()),
    };
    this.currentUser = user;
    this.persist();
    return user;
  }

  public async signUp(name: string, email: string, password: string): Promise<UserProfile> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
        },
      });
      if (error) throw new Error(error.message);
      if (data.session) {
        localStorage.setItem('lensiq_supabase_token', data.session.access_token);
      }
    }

    const user: UserProfile = {
      ...INITIAL_USER,
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      joinedAt: Date.now(),
      usage: {
        questionsAskedToday: 0,
        questionsDailyLimit: 20,
        uploadsToday: 0,
        uploadsDailyLimit: 10,
        storageUsedBytes: 0,
        storageLimitBytes: 100 * 1024 * 1024,
      },
    };
    this.currentUser = user;
    this.persist();
    return user;
  }

  public async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw new Error(error.message);
    }
    return {
      success: true,
      message: `Password reset instructions have been sent to ${email}. Check your inbox or spam folder.`,
    };
  }

  public async resetPassword(_token: string, newPass: string): Promise<{ success: boolean; message: string }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw new Error(error.message);
    }
    return {
      success: true,
      message: 'Your password has been successfully reset. You may now sign in.',
    };
  }

  public async signInWithGoogle(): Promise<UserProfile> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw new Error(error.message);
    }

    const user: UserProfile = {
      ...INITIAL_USER,
      name: 'Alex Morgan (Google)',
      email: 'alex.morgan.google@gmail.com',
    };
    this.currentUser = user;
    this.persist();
    return user;
  }

  public async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('lensiq_supabase_token');
    this.currentUser = null;
    this.persist();
  }

  public updateUser(updates: Partial<UserProfile>): UserProfile | null {
    if (!this.currentUser) return null;
    this.currentUser = {
      ...this.currentUser,
      ...updates,
    };
    this.persist();

    // Sync to backend if name changed
    if (updates.name) {
      fetchApi('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: updates.name }),
      }).catch((e) => console.warn('Sync profile update note:', e));
    }

    return this.currentUser;
  }
}

export const authService = new AuthService();
