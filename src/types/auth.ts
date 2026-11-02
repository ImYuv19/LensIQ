import { UserProfile } from './user';

export type AuthScreenMode = 'signin' | 'signup' | 'forgot-password' | 'reset-password';

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  isLoading: boolean;
}

