import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'gesture_pattern_encrypted';
const ERROR_COUNT_KEY = 'gesture_error_count';
const LOCK_UNTIL_KEY = 'gesture_lock_until';
const SECRET_KEY = 'gesture_lock_secret_2024';
const MAX_ERRORS = 5;
const LOCK_DURATION = 30000;

export interface PatternStorage {
  hasPattern: () => boolean;
  savePattern: (pattern: number[]) => void;
  verifyPattern: (pattern: number[]) => boolean;
  clearPattern: () => void;
  getErrorCount: () => number;
  incrementErrorCount: () => number;
  resetErrorCount: () => void;
  isLocked: () => boolean;
  getLockRemainingSeconds: () => number;
  lockUser: () => void;
  clearAll: () => void;
}

export const patternStorage: PatternStorage = {
  hasPattern(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  },

  savePattern(pattern: number[]): void {
    const patternStr = pattern.join(',');
    const encrypted = CryptoJS.AES.encrypt(patternStr, SECRET_KEY).toString();
    localStorage.setItem(STORAGE_KEY, encrypted);
    this.resetErrorCount();
  },

  verifyPattern(pattern: number[]): boolean {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) return false;
    try {
      const decrypted = CryptoJS.AES.decrypt(encrypted, SECRET_KEY).toString(CryptoJS.enc.Utf8);
      const patternStr = pattern.join(',');
      return decrypted === patternStr;
    } catch {
      return false;
    }
  },

  clearPattern(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.resetErrorCount();
  },

  getErrorCount(): number {
    const count = localStorage.getItem(ERROR_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  },

  incrementErrorCount(): number {
    const count = this.getErrorCount() + 1;
    localStorage.setItem(ERROR_COUNT_KEY, count.toString());
    if (count >= MAX_ERRORS) {
      this.lockUser();
    }
    return count;
  },

  resetErrorCount(): void {
    localStorage.removeItem(ERROR_COUNT_KEY);
    localStorage.removeItem(LOCK_UNTIL_KEY);
  },

  isLocked(): boolean {
    const lockUntil = localStorage.getItem(LOCK_UNTIL_KEY);
    if (!lockUntil) return false;
    const now = Date.now();
    if (now >= parseInt(lockUntil, 10)) {
      localStorage.removeItem(LOCK_UNTIL_KEY);
      localStorage.removeItem(ERROR_COUNT_KEY);
      return false;
    }
    return true;
  },

  getLockRemainingSeconds(): number {
    const lockUntil = localStorage.getItem(LOCK_UNTIL_KEY);
    if (!lockUntil) return 0;
    const remaining = Math.ceil((parseInt(lockUntil, 10) - Date.now()) / 1000);
    return Math.max(0, remaining);
  },

  lockUser(): void {
    const lockUntil = Date.now() + LOCK_DURATION;
    localStorage.setItem(LOCK_UNTIL_KEY, lockUntil.toString());
  },

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ERROR_COUNT_KEY);
    localStorage.removeItem(LOCK_UNTIL_KEY);
  }
};

export const MAX_ERROR_ATTEMPTS = MAX_ERRORS;
export const LOCK_DURATION_SECONDS = LOCK_DURATION / 1000;
