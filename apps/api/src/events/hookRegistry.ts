/**
 * events/hookRegistry.ts — Central Hook Registry
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * PURPOSE:
 * Single entry point for registering ALL domain hooks.
 * Called once at application startup, after bootstrapListeners().
 *
 * PHILOSOPHY:
 * - No hook knows about other hooks
 * - No hook imports from another hook
 * - All hooks are independent, idempotent, and isolated
 * - The registry is the ONLY place with coupling knowledge
 * - A failing hook never prevents others from executing
 *
 * STARTUP SEQUENCE:
 *   bootstrapListeners()   ← from listenerRegistry.ts (Ticket 017)
 *   ↓
 *   bootstrapHooks()       ← from this file (Ticket 022)
 *
 * ADDING A NEW HOOK FILE:
 * 1. Create your hooks file in hooks/
 * 2. Export a registerXxxHooks() function
 * 3. Import and call it here
 * That's it — no other file needs to change.
 *
 * COMPATIBILITY:
 * - Ticket 014, 014B, 014C: Multi-tenant, white-label, feature flags respected via payload.organizationId
 * - Ticket 015: Module engine unaffected (hooks are additive)
 * - Ticket 016: Mobile hooks can be added when mobile engine is connected
 * - Ticket 017: EventBus singleton used (same as listenerRegistry)
 * - Ticket 018: AuditEngine called from multiple hooks
 * - Ticket 019: TenantConfiguration unaffected
 * - Ticket 020, 020B: Performance/KPI/Badge engines called from hooks
 * - Ticket 021A: XP engine called from hooks
 * - Ticket 021B: Leaderboard engine called from hooks
 * - Ticket 021C: Progression engine hooks are now activated
 * - Ticket 021D: Dashboard/ActivityFeed engines called from hooks
 */

import { registerProspectHooks } from './hooks/prospectHooks.js';
import { registerClientHooks } from './hooks/clientHooks.js';
import { registerProductHooks } from './hooks/productHooks.js';
import { registerUserHooks } from './hooks/userHooks.js';
import { registerLoginHooks } from './hooks/loginHooks.js';
import { registerChallengeHooks } from './hooks/challengeHooks.js';
import { registerGoalHooks } from './hooks/goalHooks.js';
import { registerBadgeHooks } from './hooks/badgeHooks.js';
import { registerLevelHooks } from './hooks/levelHooks.js';
import { registerDocumentHooks } from './hooks/documentHooks.js';
import { registerImportHooks } from './hooks/importHooks.js';
import { registerNotificationHooks } from './hooks/notificationHooks.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';

/**
 * bootstrapHooks — Register all domain hooks on the event bus.
 *
 * Call this ONCE at application startup, after bootstrapListeners().
 * Order does not matter — each hook is independent.
 *
 * Example (in apps/api/src/index.ts):
 *   import { bootstrapListeners } from './events/listenerRegistry.js';
 *   import { bootstrapHooks } from './events/hookRegistry.js';
 *
 *   bootstrapListeners();
 *   bootstrapHooks();
 */
export function bootstrapHooks(): void {
  if (DEBUG) console.log('[HookRegistry] Bootstrapping domain hooks...');
  const startTime = Date.now();

  // ── CRM Hooks ──────────────────────────────────────────────────────────────
  registerProspectHooks();
  registerClientHooks();
  registerProductHooks();

  // ── User & Auth Hooks ──────────────────────────────────────────────────────
  registerUserHooks();
  registerLoginHooks();

  // ── Gamification Hooks ─────────────────────────────────────────────────────
  registerChallengeHooks();
  registerGoalHooks();
  registerBadgeHooks();
  registerLevelHooks();

  // ── Document Hooks ─────────────────────────────────────────────────────────
  registerDocumentHooks();

  // ── Import Hooks ───────────────────────────────────────────────────────────
  registerImportHooks();

  // ── Cross-domain Notification Hooks ────────────────────────────────────────
  registerNotificationHooks();

  const duration = Date.now() - startTime;
  if (DEBUG) {
    console.log(`[HookRegistry] All hooks registered in ${duration}ms`);
    console.log('[HookRegistry] Active hook groups: prospect, client, product, user, login, challenge, goal, badge, level, document, import, notification');
  } else {
    console.log(`[EBH] Integration hooks loaded (${duration}ms)`);
  }
}

/**
 * Re-export all hook registration functions for granular use (testing, etc.)
 */
export {
  registerProspectHooks,
  registerClientHooks,
  registerProductHooks,
  registerUserHooks,
  registerLoginHooks,
  registerChallengeHooks,
  registerGoalHooks,
  registerBadgeHooks,
  registerLevelHooks,
  registerDocumentHooks,
  registerImportHooks,
  registerNotificationHooks,
};
