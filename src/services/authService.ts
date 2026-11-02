import { UserProfile } from '../types/user';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { fetchApi, getAuthToken } from './apiClient';

const AUTH_USER_KEY = 'lensiq_auth_user_v1';

class AuthService {
  private currentUser: UserProfile | null = null;

  constructor() {
    const saved = localStorage.getItem(AUTH_USER_KEY);
    const token = getAuthToken();
    if (saved && token) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch {
        this.currentUser = null;
        localStorage.removeItem(AUTH_USER_KEY);
      }
    } else {
      this.currentUser = null;
      localStorage.removeItem(AUTH_USER_KEY);
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
          name: profile.full_name || this.currentUser?.name || 'LensIQ User',
          email: profile.email || this.currentUser?.email || '',
          avatarUrl: profile.avatar_url || this.currentUser?.avatarUrl,
          plan: profile.plan_tier || 'LensIQ Free Plan',
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
    return this.currentUser !== null && Boolean(getAuthToken());
  }

  public async signIn(email: string, password: string): Promise<UserProfile> {
    try {
      const res = await fetchApi<{ access_token: string; token_type: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res?.access_token) {
        localStorage.setItem('lensiq_auth_token', res.access_token);
        const synced = await this.syncRemoteProfile();
        if (synced) return synced;

        if (res.user) {
          const user: UserProfile = {
            id: res.user.id,
            name: res.user.full_name || email.split('@')[0],
            email: res.user.email,
            avatarUrl: res.user.avatar_url,
            plan: res.user.plan_tier || 'LensIQ Free Plan',
            promptVersion: 'v2',
            joinedAt: Date.now(),
            usage: {
              questionsAskedToday: res.user.daily_questions_count || 0,
              questionsDailyLimit: 20,
              uploadsToday: res.user.daily_uploads_count || 0,
              uploadsDailyLimit: 10,
              storageUsedBytes: res.user.storage_used_bytes || 0,
              storageLimitBytes: 100 * 1024 * 1024,
            },
          };
          this.currentUser = user;
          this.persist();
          return user;
        }
      }
      throw new Error('Authentication failed: No access token received.');
    } catch (apiErr: any) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (!error && data.session) {
          localStorage.setItem('lensiq_supabase_token', data.session.access_token);
          const synced = await this.syncRemoteProfile();
          if (synced) return synced;
        }
      }
      throw new Error(apiErr.message || 'Invalid email or password.');
    }
  }

  public async signUp(name: string, email: string, password: string): Promise<UserProfile> {
    try {
      const res = await fetchApi<{ access_token: string; token_type: string; user: any }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password, full_name: name.trim() }),
      });
      if (res?.access_token) {
        localStorage.setItem('lensiq_auth_token', res.access_token);
        const synced = await this.syncRemoteProfile();
        if (synced) return synced;

        if (res.user) {
          const user: UserProfile = {
            id: res.user.id,
            name: res.user.full_name || name.trim(),
            email: res.user.email,
            avatarUrl: res.user.avatar_url,
            plan: res.user.plan_tier || 'LensIQ Free Plan',
            promptVersion: 'v2',
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
      }
      throw new Error('Registration failed: No access token received.');
    } catch (apiErr: any) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
          },
        });
        if (!error && data.session) {
          localStorage.setItem('lensiq_supabase_token', data.session.access_token);
          const synced = await this.syncRemoteProfile();
          if (synced) return synced;
        }
      }
      throw new Error(apiErr.message || 'Failed to create account.');
    }
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

  public async signInWithGoogle(idToken?: string): Promise<UserProfile> {
    // 1. If real Google ID token is provided from Google Identity Services
    if (idToken) {
      const res = await fetchApi<{ access_token: string; token_type: string; user: any }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ id_token: idToken }),
      });
      if (res?.access_token) {
        localStorage.setItem('lensiq_auth_token', res.access_token);
        const synced = await this.syncRemoteProfile();
        if (synced) return synced;

        if (res.user) {
          const user: UserProfile = {
            id: res.user.id,
            name: res.user.full_name,
            email: res.user.email,
            avatarUrl: res.user.avatar_url,
            plan: res.user.plan_tier || 'LensIQ Free Plan',
            promptVersion: 'v2',
            joinedAt: Date.now(),
            usage: {
              questionsAskedToday: res.user.daily_questions_count || 0,
              questionsDailyLimit: 20,
              uploadsToday: res.user.daily_uploads_count || 0,
              uploadsDailyLimit: 10,
              storageUsedBytes: res.user.storage_used_bytes || 0,
              storageLimitBytes: 100 * 1024 * 1024,
            },
          };
          this.currentUser = user;
          this.persist();
          return user;
        }
      }
      throw new Error('Google Sign-In failed: No access token received from server.');
    }

    // 2. Fallback to Supabase OAuth if configured
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw new Error(error.message);
      return null as any;
    }

    // 3. Neither Google ID token nor Supabase Google OAuth configured
    throw new Error(
      'Google OAuth is not configured. Please configure VITE_GOOGLE_CLIENT_ID in your environment to enable Google Authentication.'
    );
  }

  public async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out note:', err);
      }
    }
    localStorage.removeItem('lensiq_auth_token');
    localStorage.removeItem('lensiq_supabase_token');
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem('lensiq_documents_v1');
    localStorage.removeItem('lensiq_conversations_v1');
    localStorage.removeItem('lensiq_messages_v1');
    this.currentUser = null;
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
