export interface Alias {
  id: string;
  displayName: string;
  avatarSeed: string;
  badge?: string;
}

const ALIAS_STORAGE_KEY = 'tala_cached_user_alias_v1';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function validateUsername(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'Username cannot be empty.' };
  }
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long.' };
  }
  if (trimmed.length > 28) {
    return { valid: false, error: 'Username must not exceed 28 characters.' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores (_), dots (.), or hyphens (-).' };
  }
  return { valid: true };
}

export function getCachedAlias(): Alias | null {
  try {
    const raw = localStorage.getItem(ALIAS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Alias;
    if (parsed && parsed.id && parsed.displayName) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCachedAlias(alias: Alias): void {
  try {
    localStorage.setItem(ALIAS_STORAGE_KEY, JSON.stringify(alias));
  } catch (err) {
    console.warn('Failed to cache username in localStorage:', err);
  }
}

export function createAnonymousAlias(seedName?: string): Alias {
  const prefixes = ['Silent', 'Curious', 'Midnight', 'Starlight', 'Coastal', 'Mountain', 'Metro', 'Quiet', 'Echo', 'Luminous'];
  const nouns = ['Student', 'Wanderer', 'Thinker', 'Observer', 'Scholar', 'Dreamer', 'Pioneer', 'Listener', 'Rambler', 'Sentinel'];
  
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(100 + Math.random() * 900);
  
  const displayName = seedName ? seedName.trim() : `${randomPrefix}${randomNoun}_${randomNum}`;

  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const avatarSeed = seedName ? seedName.trim() : `${displayName}_${randomSuffix}`;

  return {
    id: generateUUID(),
    displayName,
    avatarSeed,
  };
}
