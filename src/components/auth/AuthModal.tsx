import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('demo-token-123');
  const [newPassword, setNewPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { showToast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    try {
      await signIn(email, password);
      onClose();
    } catch {
      setStatusMessage({ text: 'Invalid email or password.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    try {
      await signUp(name, email, password);
      onClose();
    } catch {
      setStatusMessage({ text: 'Registration could not be completed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await authService.forgotPassword(email);
      setStatusMessage({ text: res.message, type: 'success' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await authService.resetPassword(resetToken, newPassword);
      setStatusMessage({ text: res.message, type: 'success' });
      setTimeout(() => setMode('signin'), 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      title={
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#D71920] flex items-center justify-center font-bold text-white text-xs">
              L
            </div>
            <span className="text-sm font-semibold text-white">
              {mode === 'signin' && 'Sign In to LensIQ'}
              {mode === 'signup' && 'Create your LensIQ Account'}
              {mode === 'forgot' && 'Reset your Password'}
              {mode === 'reset' && 'Set New Password'}
            </span>
          </div>
          <span className="text-[10px] text-[#8E95A2] mt-0.5 ml-8 font-mono">
            The Ambitious Lens Studio by uvRaj
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/10 text-red-400 border border-red-500/30'
            }`}
          >
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Google Single Sign-On Button */}
        {(mode === 'signin' || mode === 'signup') && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg bg-[#181B1F] border border-[#23272F] hover:border-[#353B47] hover:bg-[#1E2228] text-xs font-medium text-white transition-all shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="h-[1px] flex-1 bg-[#23272F]" />
              <span className="text-[10px] uppercase font-mono text-[#5B6270]">or continue with email</span>
              <div className="h-[1px] flex-1 bg-[#23272F]" />
            </div>
          </>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#BAC0CC] mb-1">Email</label>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                icon={<Mail className="w-4 h-4" />}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[#BAC0CC]">Password</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-[#D71920] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                icon={<Lock className="w-4 h-4" />}
              />
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>

            <p className="text-center text-xs text-[#8E95A2] pt-2">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-white hover:underline font-medium"
              >
                Sign up
              </button>
            </p>
          </form>
        )}

        {/* 2. SIGN UP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#BAC0CC] mb-1">Full Name</label>
              <Input
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                icon={<User className="w-4 h-4" />}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#BAC0CC] mb-1">Work Email</label>
              <Input
                type="email"
                placeholder="alex@enterprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                icon={<Mail className="w-4 h-4" />}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#BAC0CC] mb-1">Password</label>
              <Input
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                icon={<Lock className="w-4 h-4" />}
              />
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
              <span>Create Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>

            <p className="text-center text-xs text-[#8E95A2] pt-2">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-white hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* 3. FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-3">
            <p className="text-xs text-[#8E95A2] leading-relaxed">
              Enter your email address and we will generate a simulated reset link for your account.
            </p>

            <div>
              <label className="block text-xs font-medium text-[#BAC0CC] mb-1">Account Email</label>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                icon={<Mail className="w-4 h-4" />}
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
              Send Reset Instructions
            </Button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-[11px] text-[#8E95A2] hover:text-white"
              >
                Have a reset token? Enter it here
              </button>
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-[11px] text-[#D71920] hover:underline"
              >
                Back to Sign in
              </button>
            </div>
          </form>
        )}

        {/* 4. RESET PASSWORD */}
        {mode === 'reset' && (
          <form onSubmit={handleReset} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#BAC0CC] mb-1">Reset Token</label>
              <Input
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="e.g. demo-token-123"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#BAC0CC] mb-1">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                icon={<Lock className="w-4 h-4" />}
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
              Confirm New Password
            </Button>

            <button
              type="button"
              onClick={() => setMode('signin')}
              className="w-full text-center text-xs text-[#8E95A2] hover:text-white pt-1"
            >
              Back to Sign in
            </button>
          </form>
        )}
        {/* Studio attribution footer */}
        <div className="pt-3 border-t border-[#23272F]/60 text-center">
          <p className="text-[10px] text-[#5B6270] font-mono">
            The Ambitious Lens Studio by uvRaj
          </p>
        </div>
      </div>
    </Modal>
  );
};

