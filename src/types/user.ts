export type PromptVersion = 'v1' | 'v2' | 'v3';

export interface PromptVersionInfo {
  version: PromptVersion;
  name: string;
  description: string;
  isDefault?: boolean;
}

export interface UserUsage {
  questionsAskedToday: number;
  questionsDailyLimit: number; // 20
  uploadsToday: number;
  uploadsDailyLimit: number; // 10
  storageUsedBytes: number;
  storageLimitBytes: number; // 100 MB = 100 * 1024 * 1024
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan?: string;
  promptVersion: PromptVersion;
  usage: UserUsage;
  joinedAt: number;
}

