/**
 * events/hooks/levelHooks.ts — Level/Progression Domain Hooks
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * USER_LEVEL_UP → Notification + Activity Feed + Dashboard + Leaderboard
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';
import { computeLeaderboard } from '../../performance/leaderboardEngine.js';
import { createAudit } from '../../audit/auditService.js';
import { addActivityFeedEntry } from '../../dashboard/activityFeedService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';
const log = (msg: string) => DEBUG && console.log(`[LevelHooks] ${msg}`);

async function onUserLevelUp(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;

  // Activity Feed
  try {
    await addActivityFeedEntry({
      organizationId: payload.organizationId,
      userId: payload.userId,
      type: 'level_up',
      title: 'Niveau suivant atteint !',
      description: `Passage au niveau ${(payload.metadata?.newLevel as number) ?? '?'}`,
      resourceType: 'Level',
      resourceId: payload.resourceId,
      metadata: payload.metadata ?? {},
    });
    log('Activity feed updated');
  } catch (err) { errors++; console.error('[LevelHooks] ActivityFeed error:', err); }

  // Leaderboard
  try {
    await computeLeaderboard(payload.organizationId, 'user_level', 'alltime');
    log('Leaderboard updated');
  } catch (err) { errors++; console.error('[LevelHooks] Leaderboard error:', err); }

  // Audit
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'USER_LEVEL_UP', resourceType: 'Level', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
    log('Audit recorded');
  } catch (err) { errors++; console.error('[LevelHooks] Audit error:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.USER_LEVEL_UP, Date.now() - start, errors > 0);
  log(`USER_LEVEL_UP processed in ${Date.now() - start}ms`);
}

export function registerLevelHooks(): void {
  eventBus.subscribe(DomainEvent.USER_LEVEL_UP, onUserLevelUp);
  if (DEBUG) console.log('[LevelHooks] Registered 1 hook');
                       }
