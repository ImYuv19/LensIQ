import React, { useState, useEffect } from 'react';
import {
  User,
  Activity,
  Sliders,
  Shield,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  MessageSquare,
  UploadCloud,
  Check,
  Info,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PromptVersion } from '../../types/user';
import { formatBytes } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetOnboarding?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onResetOnboarding,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    promptVersions,
    currentVersion,
    usage,
    setPromptVersion,
    updateProfile,
    changePassword,
    deleteAccount,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<'account' | 'usage' | 'advanced' | 'about'>('account');

  // Account form state - synced directly with user profile
  const [name, setName] = useState(user?.name || 'Alex Morgan');
  const [email, setEmail] = useState(user?.email || 'alex.morgan@enterprise.ai');

  // Ensure fields stay populated and consistent with mock user profile data
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    } else {
      setName('Alex Morgan');
      setEmail('alex.morgan@enterprise.ai');
    }
  }, [user, isOpen]);

  // Local account timezone detection
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Delete account modal
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && email.trim()) {
      updateProfile(name.trim(), email.trim());
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    const ok = await changePassword(currentPassword, newPassword);
    if (ok) {
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    }
  };

  // Usage percentages
  const questionsPct = Math.min(100, (usage.questionsAskedToday / usage.questionsDailyLimit) * 100);
  const uploadsPct = Math.min(100, (usage.uploadsToday / usage.uploadsDailyLimit) * 100);
  const storagePct = Math.min(100, (usage.storageUsedBytes / usage.storageLimitBytes) * 100);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="2xl"
        title="LensIQ Settings"
        description="Manage your account profile, usage limits, and prompt versioning."
      >
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-[#23272F] -mx-6 px-6 gap-6">
            <button
              onClick={() => setActiveTab('account')}
              className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'account'
                  ? 'border-[#D71920] text-white'
                  : 'border-transparent text-[#8E95A2] hover:text-[#BAC0CC]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Account</span>
            </button>

            <button
              onClick={() => setActiveTab('usage')}
              className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'usage'
                  ? 'border-[#D71920] text-white'
                  : 'border-transparent text-[#8E95A2] hover:text-[#BAC0CC]'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Usage & Limits</span>
            </button>

            <button
              onClick={() => setActiveTab('advanced')}
              className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'advanced'
                  ? 'border-[#D71920] text-white'
                  : 'border-transparent text-[#8E95A2] hover:text-[#BAC0CC]'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Advanced Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'about'
                  ? 'border-[#D71920] text-white'
                  : 'border-transparent text-[#8E95A2] hover:text-[#BAC0CC]'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>About</span>
            </button>
          </div>

          {/* TAB 1: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Profile details */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#181B1F] border border-[#23272F] flex items-center justify-center text-lg font-bold text-white overflow-hidden">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      name.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{name}</h4>
                    <p className="text-xs text-[#8E95A2]">LensIQ Free Plan</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-[#BAC0CC] mb-1">Full Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#BAC0CC] mb-1">Email Address</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>

                <Button type="submit" variant="primary" size="sm">
                  Save Changes
                </Button>
              </form>

              {/* Password update section */}
              <div className="pt-6 border-t border-[#23272F]">
                <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#D71920]" />
                  <span>Security & Password</span>
                </h4>
                <p className="text-xs text-[#8E95A2] mb-4">Update your password to keep your session secure.</p>

                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      type="password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
                  {passwordSuccess && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Password changed successfully!</span>
                    </p>
                  )}

                  <Button type="submit" variant="secondary" size="sm">
                    Update Password
                  </Button>
                </form>
              </div>

              {/* Danger Zone */}
              <div className="pt-6 border-t border-[#23272F]">
                <h4 className="text-sm font-semibold text-red-400 mb-1">Danger Zone</h4>
                <p className="text-xs text-[#8E95A2] mb-3">
                  Permanently delete your account, saved chats, and uploaded document embeddings.
                </p>
                <Button variant="danger" size="sm" onClick={() => setIsDeleteConfirmOpen(true)}>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: USAGE & LIMITS */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#181B1F]/60 border border-[#23272F]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8E95A2] mb-1">
                  Active Free Plan Quotas
                </p>
                <p className="text-xs text-[#BAC0CC] leading-relaxed">
                  Daily AI question and upload quotas reset every 24 hours at midnight in your local account timezone ({localTimezone}).
                </p>
              </div>

              {/* Metric 1: AI Questions Remaining */}
              <div className="p-4 rounded-xl bg-[#121417] border border-[#23272F] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#D71920]" />
                    AI Questions Remaining Today
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {usage.questionsDailyLimit - usage.questionsAskedToday} / {usage.questionsDailyLimit} remaining
                  </span>
                </div>
                <div className="w-full bg-[#181B1F] rounded-full h-2 overflow-hidden border border-[#23272F]">
                  <div
                    className="bg-[#D71920] h-full rounded-full transition-all duration-300"
                    style={{ width: `${questionsPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#8E95A2]">
                  {usage.questionsAskedToday} of 20 daily AI answers generated today.
                </p>
              </div>

              {/* Metric 2: Uploads Remaining */}
              <div className="p-4 rounded-xl bg-[#121417] border border-[#23272F] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-sky-400" />
                    Document Uploads Remaining
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {usage.uploadsDailyLimit - usage.uploadsToday} / {usage.uploadsDailyLimit} remaining
                  </span>
                </div>
                <div className="w-full bg-[#181B1F] rounded-full h-2 overflow-hidden border border-[#23272F]">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadsPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#8E95A2]">
                  {usage.uploadsToday} of 10 maximum daily document uploads used.
                </p>
              </div>

              {/* Metric 3: Storage Used */}
              <div className="p-4 rounded-xl bg-[#121417] border border-[#23272F] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    Document Storage
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {formatBytes(usage.storageUsedBytes)} / {formatBytes(usage.storageLimitBytes)}
                  </span>
                </div>
                <div className="w-full bg-[#181B1F] rounded-full h-2 overflow-hidden border border-[#23272F]">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${storagePct}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#8E95A2]">
                  {formatBytes(Math.max(0, usage.storageLimitBytes - usage.storageUsedBytes))} available out of {formatBytes(usage.storageLimitBytes)} free quota.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ADVANCED SETTINGS (Prompt Versions V1, V2, V3 strictly) */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#181B1F]/60 border border-[#23272F]">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-1">
                  Prompt Version Selection
                </h4>
                <p className="text-xs text-[#8E95A2]">
                  Choose which retrieval and formatting prompt template powers your answers. Version V2 is selected automatically by default.
                </p>
              </div>

              {/* Prompt version cards */}
              <div className="space-y-3">
                {promptVersions.map((pv) => {
                  const isSelected = currentVersion === pv.version;

                  return (
                    <div
                      key={pv.version}
                      onClick={() => setPromptVersion(pv.version as PromptVersion)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#181B1F] border-[#D71920] shadow-sm ring-1 ring-[#D71920]/40'
                          : 'bg-[#121417] border-[#23272F] hover:border-[#353B47] hover:bg-[#181B1F]/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{pv.name}</span>
                            {pv.isDefault && (
                              <span className="text-[10px] bg-[#D71920]/15 text-[#FF6B6B] border border-[#D71920]/30 px-1.5 py-0.2 rounded font-mono">
                                System Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#8E95A2] leading-relaxed">{pv.description}</p>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected
                              ? 'border-[#D71920] bg-[#D71920] text-white'
                              : 'border-[#353B47] bg-[#181B1F]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-[#5B6270] italic">
                Note: Prompt architecture applies immediately across all newly submitted questions.
              </p>
            </div>
          )}

          {/* TAB 4: ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              {/* Studio & Product Card */}
              <div className="p-5 rounded-xl bg-[#181B1F] border border-[#23272F] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D71920] flex items-center justify-center font-bold text-white text-lg shadow-glow-red">
                    L
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      LensIQ
                      <span className="text-xs font-mono font-normal bg-[#121417] text-[#BAC0CC] px-2 py-0.5 rounded border border-[#23272F]">
                        Phase 1 Frontend
                      </span>
                    </h4>
                    <p className="text-xs text-[#8E95A2]">AI-Powered Document Question & Answering</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#121417] border border-[#23272F] space-y-1.5">
                  <p className="text-xs font-semibold text-white">Parent Studio & Creator</p>
                  <p className="text-xs text-[#BAC0CC] leading-relaxed">
                    Created by <strong className="text-white">The Ambitious Lens Studio by uvRaj</strong>
                  </p>
                  <p className="text-xs text-[#8E95A2]">
                    Architect & Lead Creator: <strong className="text-[#FF6B6B]">uvRaj</strong>
                  </p>
                </div>

                <p className="text-xs text-[#BAC0CC] leading-relaxed">
                  LensIQ provides grounded, verifiable document intelligence. Answers cite exact source page coordinates and passages, preventing hallucinations while enabling structured table extraction across enterprise documents.
                </p>
              </div>

              {/* Product Specifications */}
              <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-[#8E95A2]">
                  System Specification
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-lg bg-[#121417] border border-[#23272F]">
                    <span className="text-[#5B6270] block text-[10px] uppercase font-mono">Design System</span>
                    <span className="font-medium text-white">Dark Theme (#0B0C0E) • Bloody Red (#D71920)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#121417] border border-[#23272F]">
                    <span className="text-[#5B6270] block text-[10px] uppercase font-mono">Tech Stack</span>
                    <span className="font-medium text-white">React 18 • TypeScript • Tailwind CSS • Vite</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#121417] border border-[#23272F]">
                    <span className="text-[#5B6270] block text-[10px] uppercase font-mono">Export Engine</span>
                    <span className="font-medium text-white">Native CSV & Valid OpenXML XLSX</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#121417] border border-[#23272F]">
                    <span className="text-[#5B6270] block text-[10px] uppercase font-mono">Project Phase</span>
                    <span className="font-medium text-white">Phase 1 (Strict Frontend Boundaries)</span>
                  </div>
                </div>
              </div>

              {/* Reset Onboarding Walkthrough Action */}
              <div className="pt-4 border-t border-[#23272F] flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white">Onboarding Walkthrough</p>
                  <p className="text-[11px] text-[#8E95A2]">Reset tour state to re-experience the 3-step walkthrough.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem('lensiq_onboarding_completed');
                    onResetOnboarding?.();
                    showToast('Onboarding Reset', 'Product tour will now appear on your next action.', 'info');
                  }}
                  className="text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Tour</span>
                </Button>
              </div>

              <div className="text-center pt-2">
                <p className="text-[11px] text-[#5B6270] font-mono">
                  © 2026 The Ambitious Lens Studio by uvRaj. All rights reserved.
                </p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Permanently Delete Account"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Are you absolutely sure?</p>
              <p className="text-xs text-[#8E95A2] mt-1 leading-relaxed">
                This action will delete your profile, wipe local storage, and reset all document indices.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23272F]">
            <Button variant="ghost" size="sm" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                deleteAccount();
                setIsDeleteConfirmOpen(false);
                onClose();
              }}
            >
              Confirm Account Deletion
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

