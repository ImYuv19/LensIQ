import React, { createContext, useContext, useState, useEffect } from 'react';
import { PromptVersion, PromptVersionInfo, UserUsage } from '../types/user';
import { settingsService } from '../services/settingsService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface SettingsContextValue {
  promptVersions: PromptVersionInfo[];
  currentVersion: PromptVersion;
  usage: UserUsage;
  setPromptVersion: (version: PromptVersion) => void;
  updateProfile: (name: string, email: string) => void;
  changePassword: (curr: string, next: string) => Promise<boolean>;
  deleteAccount: () => void;
  refreshUsage: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [currentVersion, setCurrentVersion] = useState<PromptVersion>('v2');
  const [usage, setUsage] = useState<UserUsage>(settingsService.getUsageMetrics());

  useEffect(() => {
    if (user) {
      setCurrentVersion(user.promptVersion || 'v2');
      setUsage(user.usage);
    }
  }, [user]);

  const refreshUsage = () => {
    setUsage(settingsService.getUsageMetrics());
  };

  const setPromptVersion = (version: PromptVersion) => {
    settingsService.setPromptVersion(version);
    setCurrentVersion(version);
    refreshUser();
    showToast('Prompt Version Updated', `Switched to ${version.toUpperCase()} architecture.`, 'success');
  };

  const updateProfile = (name: string, email: string) => {
    settingsService.updateProfileInfo(name, email);
    refreshUser();
    showToast('Profile Saved', 'User information successfully updated.', 'success');
  };

  const changePassword = async (curr: string, next: string): Promise<boolean> => {
    const success = await settingsService.changePassword(curr, next);
    if (success) {
      showToast('Password Changed', 'Your security credentials have been updated.', 'success');
      return true;
    }
    return false;
  };

  const deleteAccount = () => {
    settingsService.deleteAccount();
    refreshUser();
    showToast('Account Deleted', 'All local data and sessions wiped.', 'info');
  };

  return (
    <SettingsContext.Provider
      value={{
        promptVersions: settingsService.getPromptVersions(),
        currentVersion,
        usage,
        setPromptVersion,
        updateProfile,
        changePassword,
        deleteAccount,
        refreshUsage,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

