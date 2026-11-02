import { PromptVersion, UserProfile, UserUsage } from '../types/user';
import { authService } from './authService';
import { PROMPT_VERSIONS } from './mockData';
import { fetchApi } from './apiClient';

class SettingsService {
  public getPromptVersions() {
    return PROMPT_VERSIONS;
  }

  public setPromptVersion(version: PromptVersion): UserProfile | null {
    return authService.updateUser({ promptVersion: version });
  }

  public updateProfileInfo(name: string, email: string): UserProfile | null {
    return authService.updateUser({ name, email });
  }

  public async fetchRemoteUsage(): Promise<UserUsage | null> {
    try {
      const stats = await fetchApi<any>('/usage/stats');
      if (stats) {
        const usage: UserUsage = {
          questionsAskedToday: stats.dailyQuestionsUsed,
          questionsDailyLimit: stats.dailyQuestionsLimit,
          uploadsToday: stats.dailyUploadsUsed,
          uploadsDailyLimit: stats.dailyUploadsLimit,
          storageUsedBytes: stats.storageUsedBytes,
          storageLimitBytes: stats.storageLimitBytes,
        };
        authService.updateUser({ usage });
        return usage;
      }
    } catch (e) {
      console.warn('Using local usage counters:', e);
    }
    return this.getUsageMetrics();
  }

  public getUsageMetrics(): UserUsage {
    const user = authService.getCurrentUser();
    if (!user) {
      return {
        questionsAskedToday: 0,
        questionsDailyLimit: 20,
        uploadsToday: 0,
        uploadsDailyLimit: 10,
        storageUsedBytes: 0,
        storageLimitBytes: 100 * 1024 * 1024,
      };
    }
    return user.usage;
  }

  public recordQuestionUsage(): boolean {
    const user = authService.getCurrentUser();
    if (!user) return false;

    if (user.usage.questionsAskedToday >= user.usage.questionsDailyLimit) {
      return false; // limit exceeded
    }

    user.usage.questionsAskedToday += 1;
    authService.updateUser({ usage: user.usage });
    return true;
  }

  public recordUploadUsage(fileSizeBytes: number): boolean {
    const user = authService.getCurrentUser();
    if (!user) return false;

    if (user.usage.uploadsToday >= user.usage.uploadsDailyLimit) {
      return false;
    }

    if (user.usage.storageUsedBytes + fileSizeBytes > user.usage.storageLimitBytes) {
      return false;
    }

    user.usage.uploadsToday += 1;
    user.usage.storageUsedBytes += fileSizeBytes;
    authService.updateUser({ usage: user.usage });
    return true;
  }

  public async changePassword(_currentPass: string, _newPass: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 600));
    return true;
  }

  public async deleteAccount(): Promise<void> {
    try {
      await fetchApi('/auth/account/delete', {
        method: 'POST',
        body: JSON.stringify({ confirm_text: 'DELETE' }),
      });
    } catch (e) {
      console.warn('Backend delete account note:', e);
    }
    await authService.signOut();
    localStorage.clear();
  }
}

export const settingsService = new SettingsService();
