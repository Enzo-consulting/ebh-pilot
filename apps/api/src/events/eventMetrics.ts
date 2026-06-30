// eventMetrics.ts — Event Metrics Engine (Ticket 022)
import { DomainEvent } from './types.js';

export interface EventMetricRecord {
  event: string;
  totalEmitted: number;
  totalListeners: number;
  totalErrors: number;
  avgDurationMs: number;
  maxDurationMs: number;
  lastEmittedAt: number;
}

export interface EventMetricsSnapshot {
  totalEvents: number;
  totalListeners: number;
  totalErrors: number;
  avgDurationMs: number;
  maxDurationMs: number;
  byEvent: Record<string, EventMetricRecord>;
  snapshotAt: number;
}

interface InternalRecord {
  totalEmitted: number;
  totalListeners: number;
  totalErrors: number;
  totalDurationMs: number;
  maxDurationMs: number;
  lastEmittedAt: number;
}

export class EventMetrics {
  private readonly records = new Map<string, InternalRecord>();
  private globalTotalEvents = 0;
  private globalTotalListeners = 0;
  private globalTotalErrors = 0;
  private globalTotalDurationMs = 0;
  private globalMaxDurationMs = 0;

  recordListenerExecution(event: string, durationMs: number, hadError: boolean): void {
    let rec = this.records.get(event);
    if (!rec) {
      rec = { totalEmitted: 0, totalListeners: 0, totalErrors: 0, totalDurationMs: 0, maxDurationMs: 0, lastEmittedAt: 0 };
      this.records.set(event, rec);
    }
    rec.totalListeners++;
    rec.totalDurationMs += durationMs;
    if (durationMs > rec.maxDurationMs) rec.maxDurationMs = durationMs;
    if (hadError) rec.totalErrors++;
    this.globalTotalListeners++;
    this.globalTotalDurationMs += durationMs;
    if (durationMs > this.globalMaxDurationMs) this.globalMaxDurationMs = durationMs;
    if (hadError) this.globalTotalErrors++;
  }

  recordEventEmitted(event: string): void {
    let rec = this.records.get(event);
    if (!rec) {
      rec = { totalEmitted: 0, totalListeners: 0, totalErrors: 0, totalDurationMs: 0, maxDurationMs: 0, lastEmittedAt: 0 };
      this.records.set(event, rec);
    }
    rec.totalEmitted++;
    rec.lastEmittedAt = Date.now();
    this.globalTotalEvents++;
  }

  getSnapshot(): EventMetricsSnapshot {
    const byEvent: Record<string, EventMetricRecord> = {};
    for (const [event, rec] of this.records.entries()) {
      byEvent[event] = {
        event,
        totalEmitted: rec.totalEmitted,
        totalListeners: rec.totalListeners,
        totalErrors: rec.totalErrors,
        avgDurationMs: rec.totalListeners > 0 ? Math.round(rec.totalDurationMs / rec.totalListeners) : 0,
        maxDurationMs: rec.maxDurationMs,
        lastEmittedAt: rec.lastEmittedAt,
      };
    }
    return {
      totalEvents: this.globalTotalEvents,
      totalListeners: this.globalTotalListeners,
      totalErrors: this.globalTotalErrors,
      avgDurationMs: this.globalTotalListeners > 0 ? Math.round(this.globalTotalDurationMs / this.globalTotalListeners) : 0,
      maxDurationMs: this.globalMaxDurationMs,
      byEvent,
      snapshotAt: Date.now(),
    };
  }

  reset(): void {
    this.records.clear();
    this.globalTotalEvents = 0;
    this.globalTotalListeners = 0;
    this.globalTotalErrors = 0;
    this.globalTotalDurationMs = 0;
    this.globalMaxDurationMs = 0;
  }

  getEventMetric(event: DomainEvent | string): EventMetricRecord | null {
    const rec = this.records.get(event);
    if (!rec) return null;
    return {
      event,
      totalEmitted: rec.totalEmitted,
      totalListeners: rec.totalListeners,
      totalErrors: rec.totalErrors,
      avgDurationMs: rec.totalListeners > 0 ? Math.round(rec.totalDurationMs / rec.totalListeners) : 0,
      maxDurationMs: rec.maxDurationMs,
      lastEmittedAt: rec.lastEmittedAt,
    };
  }
}

export const eventMetrics = new EventMetrics();
