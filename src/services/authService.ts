/**
 * NEXUS IDENTITY & AUTH SERVICE
 */

export interface UserProfile {
  id: string;
  username: string;
  created_at: string;
}

const STORAGE_KEY_USER_ID = 'nexus_user_id';
const STORAGE_KEY_USERNAME = 'nexus_username';

export function getOrCreateUserId(): string {
  let userId = localStorage.getItem(STORAGE_KEY_USER_ID);
  if (!userId) {
    userId = 'usr_' + crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY_USER_ID, userId);
  }
  return userId;
}

export function getSavedUsername(): string {
  return localStorage.getItem(STORAGE_KEY_USERNAME) || '';
}

export function saveUsername(username: string): void {
  localStorage.setItem(STORAGE_KEY_USERNAME, username.trim());
}

export function clearIdentity(): void {
  localStorage.removeItem(STORAGE_KEY_USER_ID);
  localStorage.removeItem(STORAGE_KEY_USERNAME);
}
