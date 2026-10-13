/**
 * DeviceBanService.ts
 * Multi-layered hardware & browser device fingerprinting with progressive suspension:
 * - Strike 1 & 2: Warning toasts with strike count
 * - Strike 3: 24 Hours lock
 * - Strike 4: 3 Days lock
 * - Strike 5: 7 Days lock
 * - Strike 6+: Permanent hardware/device ban
 * Persisted across localStorage, IndexedDB, document.cookie, and Supabase.
 */

import { supabase } from '../../infrastructure/supabase/client';

export interface DeviceBanStatus {
  isBanned: boolean;
  isPermanent: boolean;
  strikeCount: number;
  banLevel: number; // 0 = none, 1 = 24h, 2 = 3d, 3 = 7d, 4 = permanent
  lockedUntilISO: string | null;
  remainingMs: number;
  reason?: string;
  deviceFingerprint: string;
}

const STORAGE_KEY_FP = 'tala_device_fp_v1';
const STORAGE_KEY_STATUS = 'tala_device_ban_status_v1';
const COOKIE_NAME_FP = 'tala_dfp_v1';
const IDB_NAME = 'tala_security_vault';
const IDB_STORE = 'security_keys';

export class DeviceBanService {
  private static cachedFingerprint: string | null = null;
  private static cachedStatus: DeviceBanStatus | null = null;

  /**
   * Generates a persistent browser & hardware device fingerprint.
   * Uses canvas rendering, WebGL info, hardware concurrency, screen dimensions,
   * color depth, timezone, and platform.
   */
  public static async getDeviceFingerprint(): Promise<string> {
    if (this.cachedFingerprint) return this.cachedFingerprint;

    // Check localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FP);
      if (stored && stored.length >= 16) {
        this.cachedFingerprint = stored;
        return stored;
      }
    } catch {}

    // Check cookie
    try {
      const match = document.cookie.match(new RegExp('(^| )' + COOKIE_NAME_FP + '=([^;]+)'));
      if (match && match[2] && match[2].length >= 16) {
        this.cachedFingerprint = match[2];
        try {
          localStorage.setItem(STORAGE_KEY_FP, match[2]);
        } catch {}
        return match[2];
      }
    } catch {}

    // Check IndexedDB
    const idbFp = await this.readFromIndexedDB(STORAGE_KEY_FP);
    if (idbFp) {
      this.cachedFingerprint = idbFp;
      this.persistDeviceFingerprint(idbFp);
      return idbFp;
    }

    // Generate new hardware/canvas fingerprint
    const fpComponents: string[] = [];

    // 1. Screen & Hardware properties
    if (typeof window !== 'undefined') {
      fpComponents.push(`${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);
      fpComponents.push(`avail:${window.screen.availWidth}x${window.screen.availHeight}`);
      fpComponents.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
      fpComponents.push(`cores:${navigator.hardwareConcurrency || 4}`);
      fpComponents.push(`mem:${(navigator as any).deviceMemory || 4}`);
      fpComponents.push(`platform:${navigator.platform || ''}`);
      fpComponents.push(`lang:${navigator.language || ''}`);
      fpComponents.push(`touch:${navigator.maxTouchPoints || 0}`);
    }

    // 2. Canvas Fingerprint
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 60;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = "14px 'Arial', sans-serif";
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Tala-PH-Security-Token-🇵🇭', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Tala-PH-Security-Token-🇵🇭', 4, 17);
        fpComponents.push(`canvas:${canvas.toDataURL()}`);
      }
    } catch {}

    // 3. WebGL Renderer
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const vendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          fpComponents.push(`webgl:${vendor}|${renderer}`);
        }
      }
    } catch {}

    // Compute simple robust 32-char hash
    const rawString = fpComponents.join('|||');
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
      const char = rawString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex1 = Math.abs(hash).toString(16).padStart(8, '0');

    let hash2 = 5381;
    for (let i = rawString.length - 1; i >= 0; i--) {
      hash2 = (hash2 * 33) ^ rawString.charCodeAt(i);
    }
    const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');

    // Add high-resolution randomness seed for uniqueness while hardware properties anchor it
    const fp = `tl_dev_${hex1}${hex2}${Date.now().toString(16).slice(-6)}`;
    this.cachedFingerprint = fp;
    await this.persistDeviceFingerprint(fp);
    return fp;
  }

  /**
   * Persists device fingerprint across localStorage, cookie, and IndexedDB.
   */
  private static async persistDeviceFingerprint(fp: string): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY_FP, fp);
    } catch {}

    try {
      const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${COOKIE_NAME_FP}=${fp}; expires=${farFuture}; path=/; SameSite=Lax`;
    } catch {}

    await this.saveToIndexedDB(STORAGE_KEY_FP, fp);
  }

  /**
   * Checks whether the current device is currently banned or locked.
   * Checks Supabase `device_bans` with local IndexedDB/localStorage backup.
   */
  public static async checkDeviceStatus(): Promise<DeviceBanStatus> {
    const fp = await this.getDeviceFingerprint();
    const now = Date.now();

    // 1. Check local cached status first
    let localStatus: DeviceBanStatus | null = null;
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_STATUS}_${fp}`);
      if (raw) localStatus = JSON.parse(raw);
    } catch {}

    if (!localStatus) {
      const idbStatus = await this.readFromIndexedDB(`${STORAGE_KEY_STATUS}_${fp}`);
      if (idbStatus) {
        try {
          localStatus = JSON.parse(idbStatus);
        } catch {}
      }
    }

    // 2. Query Supabase for authoritative record
    try {
      const { data, error } = await supabase
        .from('device_bans')
        .select('*')
        .eq('device_fingerprint', fp)
        .maybeSingle();

      if (!error && data) {
        const lockedUntil = data.locked_until ? new Date(data.locked_until).getTime() : 0;
        const isStillLocked = data.is_permanent || lockedUntil > now;
        const remainingMs = data.is_permanent ? Infinity : Math.max(0, lockedUntil - now);

        const status: DeviceBanStatus = {
          isBanned: isStillLocked,
          isPermanent: Boolean(data.is_permanent),
          strikeCount: data.strike_count || 1,
          banLevel: data.ban_level || 0,
          lockedUntilISO: data.locked_until || null,
          remainingMs,
          reason: data.reason || 'Repeated community policy violations',
          deviceFingerprint: fp,
        };

        this.cachedStatus = status;
        this.saveStatusLocally(fp, status);
        return status;
      }
    } catch (err) {
      console.warn('[DeviceBanService] Supabase check notice, relying on local state:', err);
    }

    if (localStatus) {
      const lockedUntil = localStatus.lockedUntilISO ? new Date(localStatus.lockedUntilISO).getTime() : 0;
      const isStillLocked = localStatus.isPermanent || lockedUntil > now;
      const remainingMs = localStatus.isPermanent ? Infinity : Math.max(0, lockedUntil - now);

      const status: DeviceBanStatus = {
        ...localStatus,
        isBanned: isStillLocked,
        remainingMs,
      };
      this.cachedStatus = status;
      return status;
    }

    const cleanStatus: DeviceBanStatus = {
      isBanned: false,
      isPermanent: false,
      strikeCount: 0,
      banLevel: 0,
      lockedUntilISO: null,
      remainingMs: 0,
      deviceFingerprint: fp,
    };
    this.cachedStatus = cleanStatus;
    return cleanStatus;
  }

  /**
   * Records a profanity / abusive language strike against this device.
   * Progressive Ban Levels:
   * - Strike 1: Warning 1/3
   * - Strike 2: Warning 2/3
   * - Strike 3: Ban Level 1 (24 Hours lock)
   * - Strike 4: Ban Level 2 (3 Days lock)
   * - Strike 5: Ban Level 3 (7 Days lock)
   * - Strike 6+: Ban Level 4 (Permanent device ban)
   */
  public static async recordViolation(
    reason: string,
    contentSnippet: string,
    aliasId?: string,
    aliasName?: string
  ): Promise<{
    newStrikeCount: number;
    banLevel: number;
    isBanned: boolean;
    isPermanent: boolean;
    lockedUntilISO: string | null;
    warningMessage: string;
  }> {
    const fp = await this.getDeviceFingerprint();
    const current = await this.checkDeviceStatus();

    const newStrikeCount = current.strikeCount + 1;
    let banLevel = 0;
    let lockDurationMs = 0;
    let isPermanent = false;
    let warningMessage = '';

    if (newStrikeCount === 1) {
      banLevel = 0;
      warningMessage = 'Warning (Strike 1/3): Inappropriate language detected. Continued violations will result in your device being locked for 24 hours.';
    } else if (newStrikeCount === 2) {
      banLevel = 0;
      warningMessage = 'Final Warning (Strike 2/3): One more inappropriate submission will immediately lock your device from Tala for 24 hours!';
    } else if (newStrikeCount === 3) {
      banLevel = 1;
      lockDurationMs = 24 * 60 * 60 * 1000; // 24 Hours
      warningMessage = '3 Strikes Reached: Your device has been locked from Tala for 24 hours for repeated policy violations.';
    } else if (newStrikeCount === 4) {
      banLevel = 2;
      lockDurationMs = 3 * 24 * 60 * 60 * 1000; // 3 Days
      warningMessage = '4th Violation: Your device has been locked from Tala for 3 days for repeated abuse.';
    } else if (newStrikeCount === 5) {
      banLevel = 3;
      lockDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 Days
      warningMessage = '5th Violation: Your device has been locked from Tala for 7 days for continuous abuse.';
    } else {
      banLevel = 4;
      isPermanent = true;
      warningMessage = 'Permanent Ban: Your device has been permanently banned from Tala due to severe and repeated abuse.';
    }

    const lockedUntilISO = lockDurationMs > 0 ? new Date(Date.now() + lockDurationMs).toISOString() : null;
    const isBanned = isPermanent || lockDurationMs > 0;

    const newStatus: DeviceBanStatus = {
      isBanned,
      isPermanent,
      strikeCount: newStrikeCount,
      banLevel,
      lockedUntilISO,
      remainingMs: isPermanent ? Infinity : lockDurationMs,
      reason,
      deviceFingerprint: fp,
    };

    // Save locally
    this.cachedStatus = newStatus;
    await this.saveStatusLocally(fp, newStatus);

    // Save to Supabase (device_bans + user_violations)
    try {
      await supabase.from('device_bans').upsert(
        {
          device_fingerprint: fp,
          alias_id: aliasId || null,
          alias_name: aliasName || null,
          strike_count: newStrikeCount,
          ban_level: banLevel,
          locked_until: lockedUntilISO,
          is_permanent: isPermanent,
          reason,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'device_fingerprint' }
      );

      await supabase.from('user_violations').insert({
        device_fingerprint: fp,
        alias_id: aliasId || null,
        content_snippet: contentSnippet.slice(0, 100),
        violation_type: reason,
        strike_number: newStrikeCount,
      });
    } catch (err) {
      console.warn('[DeviceBanService] Could not persist violation to Supabase:', err);
    }

    return {
      newStrikeCount,
      banLevel,
      isBanned,
      isPermanent,
      lockedUntilISO,
      warningMessage,
    };
  }

  /**
   * Submits an appeal to OpenRouter AI (/api/appeal)
   */
  public static async submitAppeal(
    appealReason: string,
    aliasName?: string
  ): Promise<{
    decision: 'APPROVED' | 'DENIED';
    aiExplanation: string;
    unlocked: boolean;
  }> {
    const fp = await this.getDeviceFingerprint();
    const current = await this.checkDeviceStatus();

    try {
      const res = await fetch('/api/appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceFingerprint: fp,
          strikeCount: current.strikeCount,
          banLevel: current.banLevel,
          lockedUntilISO: current.lockedUntilISO,
          appealReason,
          aliasName,
          violationContext: current.reason,
        }),
      });

      if (!res.ok) {
        throw new Error(`Appeal API returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const resolution = data.resolution;

      // Persist appeal record to Supabase if available
      try {
        await supabase.from('ban_appeals').insert({
          device_fingerprint: fp,
          appeal_reason: appealReason,
          alias_name: aliasName || null,
          decision: resolution.decision,
          ai_explanation: resolution.aiExplanation,
          confidence_score: resolution.confidenceScore || 0.9,
          strike_count_before: current.strikeCount,
          ban_level_before: current.banLevel,
        });
      } catch (dbErr) {
        console.warn('[DeviceBanService] Supabase ban_appeals insert notice:', dbErr);
      }

      if (resolution.unlocked) {
        await this.liftBan(resolution.newStrikeCount || 0);
      }

      return {
        decision: resolution.decision,
        aiExplanation: resolution.aiExplanation,
        unlocked: resolution.unlocked,
      };
    } catch (err: any) {
      console.error('[DeviceBanService] submitAppeal failed:', err);
      throw err;
    }
  }

  /**
   * Resets or unlocks device ban after successful appeal or pardon
   */
  public static async liftBan(newStrikeCount = 0): Promise<void> {
    const fp = await this.getDeviceFingerprint();
    const cleanStatus: DeviceBanStatus = {
      isBanned: false,
      isPermanent: false,
      strikeCount: newStrikeCount,
      banLevel: 0,
      lockedUntilISO: null,
      remainingMs: 0,
      deviceFingerprint: fp,
    };

    this.cachedStatus = cleanStatus;
    await this.saveStatusLocally(fp, cleanStatus);

    // Update Supabase
    try {
      await supabase
        .from('device_bans')
        .upsert(
          {
            device_fingerprint: fp,
            strike_count: newStrikeCount,
            ban_level: 0,
            locked_until: null,
            is_permanent: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'device_fingerprint' }
        );
    } catch (err) {
      console.warn('[DeviceBanService] liftBan Supabase update notice:', err);
    }
  }

  private static async saveStatusLocally(fp: string, status: DeviceBanStatus): Promise<void> {
    const serialized = JSON.stringify(status);
    try {
      localStorage.setItem(`${STORAGE_KEY_STATUS}_${fp}`, serialized);
    } catch {}

    await this.saveToIndexedDB(`${STORAGE_KEY_STATUS}_${fp}`, serialized);
  }

  // IndexedDB Helpers
  private static async openDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private static async saveToIndexedDB(key: string, value: string): Promise<void> {
    try {
      const db = await this.openDB();
      if (!db) return;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
    } catch {}
  }

  private static async readFromIndexedDB(key: string): Promise<string | null> {
    try {
      const db = await this.openDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }
}
