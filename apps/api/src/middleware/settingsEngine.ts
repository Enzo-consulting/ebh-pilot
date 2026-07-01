/**
 * settingsEngine.ts — Tenant Configuration Engine
 *
 * Ticket 019 — Tenant Configuration Engine (Fondations SaaS)
 *
 * PURPOSE:
 * Central engine for reading and writing all organization-level configuration.
 * All configuration access MUST go through this engine — never directly to Prisma.
 *
 * ARCHITECTURE PRINCIPLE:
 * "No route should know how configuration is stored.
 *  It should only ask: getSetting(orgId, 'vat_rate')"
 *
 * This allows future changes to the storage backend (Redis cache, CDN, etc.)
 * without touching any route or business logic.
 *
 * WHAT THIS ENGINE MANAGES:
 * - OrganizationSetting    → getSetting() / setSetting()
 * - WorkflowTemplate       → getWorkflow() / getWorkflowStep()
 * - NotificationTemplate   → getNotificationTemplate()
 * - Integration            → getIntegration() / isIntegrationEnabled()
 * - OrganizationIntegration → getOrganizationIntegration()
 *
 * MULTI-TENANT SAFETY:
 * Every function takes organizationId as the first argument.
 * No cross-organization data leakage is possible by design.
 *
 * CACHING (future):
 * Settings are read frequently and change rarely.
 * A Redis cache layer can be added here without changing any caller.
 *
 * API KEY SECURITY:
 * Encrypted config (API keys) is NEVER returned in plain text by getIntegration().
 * A separate decryptIntegrationConfig() function will handle decryption
 * in a secure server-side context only.
 */

import { prisma } from '../prisma.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** A typed organization setting value. */
export interface SettingValue {
  key: string;
  value: string;
  valueType: string;
  category: string;
  description: string | null;
  defaultValue: string | null;
  isReadOnly: boolean;
}

/** Parsed setting value — union of possible deserialized types. */
export type ParsedSettingValue = string | number | boolean | Record<string, unknown> | null;

/** A workflow template with its steps. */
export interface WorkflowWithSteps {
  id: string;
  code: string;
  name: string;
  description: string | null;
  entityType: string;
  isDefault: boolean;
  isActive: boolean;
  color: string | null;
  icon: string | null;
  displayOrder: number;
  config: unknown;
  steps: WorkflowStepInfo[];
}

/** A single workflow step. */
export interface WorkflowStepInfo {
  id: string;
  code: string;
  name: string;
  order: number;
  color: string | null;
  icon: string | null;
  isInitial: boolean;
  isFinal: boolean;
  isSuccess: boolean;
  transitions: string[];
  entryConditions: unknown;
  onEnterActions: unknown;
  slaHours: number | null;
}

/** A notification template. */
export interface NotificationTemplateInfo {
  id: string;
  channel: string;
  eventType: string;
  name: string;
  subject: string | null;
  body: string;
  bodyHtml: string | null;
  locale: string;
  isActive: boolean;
}

/** An organization integration status. */
export interface IntegrationInfo {
  id: string;
  provider: string;
  name: string;
  status: string;
  config: unknown;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  monthlyCallCount: number;
  monthlyQuota: number | null;
  isEnabled: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS — getSetting() / setSetting()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a single organization setting by key.
 *
 * Returns the raw string value and metadata.
 * Use getParsedSetting() to get a typed deserialized value.
 *
 * Returns null if the setting does not exist.
 * The caller should fall back to a sensible default if null is returned.
 *
 * @param organizationId - The organization to query
 * @param key            - The setting key (e.g. "vat_rate", "fiscal_year_start")
 */
export async function getSetting(
  organizationId: string,
  key: string
): Promise<SettingValue | null> {
  try {
    const setting = await (prisma as any).organizationSetting.findUnique({
      where: {
        organizationId_key: { organizationId, key },
      },
      select: {
        key: true,
        value: true,
        valueType: true,
        category: true,
        description: true,
        defaultValue: true,
        isReadOnly: true,
      },
    });
    return setting as SettingValue | null;
  } catch (error) {
    console.error(`[SettingsEngine] getSetting error for key "${key}": ${error}`);
    return null;
  }
}

/**
 * Get a setting value and parse it to its native TypeScript type.
 *
 * Type conversion rules:
 * - SettingValueType.NUMBER  → number
 * - SettingValueType.BOOLEAN → boolean ("true"/"false")
 * - SettingValueType.JSON    → parsed object
 * - All others               → string as-is
 *
 * Returns defaultValue if the setting does not exist.
 * Returns null if defaultValue is not provided and setting is missing.
 *
 * @param organizationId - The organization to query
 * @param key            - The setting key
 * @param defaultValue   - Fallback value if not found
 */
export async function getParsedSetting(
  organizationId: string,
  key: string,
  defaultValue?: ParsedSettingValue
): Promise<ParsedSettingValue> {
  const setting = await getSetting(organizationId, key);

  if (!setting) {
    return defaultValue ?? null;
  }

  try {
    switch (setting.valueType) {
      case 'NUMBER':
        return parseFloat(setting.value);
      case 'BOOLEAN':
        return setting.value === 'true';
      case 'JSON':
        return JSON.parse(setting.value) as Record<string, unknown>;
      default:
        return setting.value;
    }
  } catch {
    // If parsing fails, return raw string
    return setting.value;
  }
}

/**
 * Get all settings for an organization, optionally filtered by category.
 *
 * Used by:
 * - Admin settings panel (display all settings by category)
 * - Bootstrap on app load (prefetch all settings into memory)
 * - Export/backup of organization configuration
 *
 * @param organizationId - The organization to query
 * @param category       - Optional filter by SettingCategory
 */
export async function getAllSettings(
  organizationId: string,
  category?: string
): Promise<SettingValue[]> {
  try {
    const where: Record<string, unknown> = { organizationId };
    if (category) where.category = category;

    return (prisma as any).organizationSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
      select: {
        key: true,
        value: true,
        valueType: true,
        category: true,
        description: true,
        defaultValue: true,
        isReadOnly: true,
      },
    });
  } catch (error) {
    console.error(`[SettingsEngine] getAllSettings error: ${error}`);
    return [];
  }
}

/**
 * Create or update an organization setting.
 *
 * Uses Prisma upsert — creates if not exists, updates if exists.
 * ReadOnly settings cannot be changed by organization admins.
 * Only super-admins can override with force=true.
 *
 * Returns true on success, false on failure.
 *
 * @param organizationId - The organization
 * @param key            - The setting key
 * @param value          - The new value (always serialized as string)
 * @param options        - Optional metadata (valueType, category, description)
 * @param force          - Override read-only protection (super-admin only)
 */
export async function setSetting(
  organizationId: string,
  key: string,
  value: string,
  options?: {
    valueType?: string;
    category?: string;
    description?: string;
    defaultValue?: string;
  },
  force = false
): Promise<boolean> {
  try {
    // Check if setting is read-only
    if (!force) {
      const existing = await getSetting(organizationId, key);
      if (existing?.isReadOnly) {
        console.warn(`[SettingsEngine] Attempt to modify read-only setting "${key}" blocked.`);
        return false;
      }
    }

    await (prisma as any).organizationSetting.upsert({
      where: {
        organizationId_key: { organizationId, key },
      },
      create: {
        organizationId,
        key,
        value,
        valueType: options?.valueType ?? 'STRING',
        category:  options?.category  ?? 'GENERAL',
        description:   options?.description  ?? null,
        defaultValue:  options?.defaultValue ?? null,
      },
      update: {
        value,
        ...(options?.valueType   && { valueType:   options.valueType }),
        ...(options?.category    && { category:    options.category }),
        ...(options?.description && { description: options.description }),
      },
    });

    return true;
  } catch (error) {
    console.error(`[SettingsEngine] setSetting error for key "${key}": ${error}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOWS — getWorkflow() / getWorkflowByEntity()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a workflow template by code, including all its steps.
 *
 * Used by:
 * - Prospect routes (load the prospect workflow to validate transitions)
 * - Kanban views (display workflow columns)
 * - Workflow Engine (Ticket 017 WorkflowListener)
 * - Mobile app (render workflow steps)
 *
 * Returns null if the workflow does not exist for this organization.
 *
 * @param organizationId - The organization
 * @param code           - The workflow code (e.g. "prospect", "client", "order")
 */
export async function getWorkflow(
  organizationId: string,
  code: string
): Promise<WorkflowWithSteps | null> {
  try {
    const workflow = await (prisma as any).workflowTemplate.findUnique({
      where: {
        organizationId_code: { organizationId, code },
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workflow) return null;

    return {
      ...workflow,
      steps: workflow.steps.map((s: any) => ({
        ...s,
        transitions: Array.isArray(s.transitions) ? s.transitions : [],
      })),
    } as WorkflowWithSteps;
  } catch (error) {
    console.error(`[SettingsEngine] getWorkflow error for code "${code}": ${error}`);
    return null;
  }
}

/**
 * Get the default active workflow for a given entity type.
 *
 * If the organization has a custom workflow for this entity, return it.
 * Otherwise return null (caller should use built-in default logic).
 *
 * @param organizationId - The organization
 * @param entityType     - Entity type (e.g. "prospect", "client", "order")
 */
export async function getDefaultWorkflow(
  organizationId: string,
  entityType: string
): Promise<WorkflowWithSteps | null> {
  try {
    const workflow = await (prisma as any).workflowTemplate.findFirst({
      where: { organizationId, entityType, isDefault: true, isActive: true },
      include: {
        steps: { orderBy: { order: 'asc' } },
      },
    });

    if (!workflow) return null;

    return {
      ...workflow,
      steps: workflow.steps.map((s: any) => ({
        ...s,
        transitions: Array.isArray(s.transitions) ? s.transitions : [],
      })),
    } as WorkflowWithSteps;
  } catch (error) {
    console.error(`[SettingsEngine] getDefaultWorkflow error: ${error}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION TEMPLATES — getNotificationTemplate()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the notification template for a specific channel + event + locale.
 *
 * Called by NotificationListener (Ticket 017) before sending a notification.
 * If no template is found for the requested locale, falls back to "fr".
 * If still not found, returns null (use built-in default message).
 *
 * @param organizationId - The organization
 * @param channel        - Notification channel (EMAIL, SMS, PUSH, ...)
 * @param eventType      - Domain event type (e.g. "PROSPECT_CREATED")
 * @param locale         - Language code (e.g. "fr", "en", "de")
 */
export async function getNotificationTemplate(
  organizationId: string,
  channel: string,
  eventType: string,
  locale = 'fr'
): Promise<NotificationTemplateInfo | null> {
  try {
    // Try exact locale match first
    let template = await (prisma as any).notificationTemplate.findUnique({
      where: {
        organizationId_channel_eventType_locale: {
          organizationId, channel, eventType, locale,
        },
      },
    });

    // Fallback to French if not found
    if (!template && locale !== 'fr') {
      template = await (prisma as any).notificationTemplate.findUnique({
        where: {
          organizationId_channel_eventType_locale: {
            organizationId, channel, eventType, locale: 'fr',
          },
        },
      });
    }

    if (!template || !template.isActive) return null;

    return template as NotificationTemplateInfo;
  } catch (error) {
    console.error(`[SettingsEngine] getNotificationTemplate error: ${error}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATIONS — getIntegration() / isIntegrationEnabled()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a specific integration is enabled for an organization.
 *
 * Fast boolean check — does NOT load the config or encrypted secrets.
 * Use this in middleware and feature checks.
 *
 * @param organizationId - The organization
 * @param provider       - Integration provider (e.g. "OPENAI", "STRIPE")
 */
export async function isIntegrationEnabled(
  organizationId: string,
  provider: string
): Promise<boolean> {
  try {
    const orgIntegration = await (prisma as any).organizationIntegration.findFirst({
      where: {
        organizationId,
        status: 'ACTIVE',
        integration: { provider },
      },
      select: { id: true },
    });
    return !!orgIntegration;
  } catch (error) {
    console.error(`[SettingsEngine] isIntegrationEnabled error for "${provider}": ${error}`);
    return false;
  }
}

/**
 * Get integration info for an organization (without encrypted secrets).
 *
 * Returns status, non-sensitive config, usage stats, expiry.
 * NEVER returns encryptedConfig — use decryptIntegrationConfig() separately.
 *
 * @param organizationId - The organization
 * @param provider       - Integration provider (e.g. "OPENAI", "STRIPE")
 */
export async function getIntegration(
  organizationId: string,
  provider: string
): Promise<IntegrationInfo | null> {
  try {
    const orgIntegration = await (prisma as any).organizationIntegration.findFirst({
      where: {
        organizationId,
        integration: { provider },
      },
      select: {
        id:               true,
        status:           true,
        config:           true,
        // encryptedConfig is intentionally EXCLUDED
        expiresAt:        true,
        lastUsedAt:       true,
        monthlyCallCount: true,
        monthlyQuota:     true,
        integration: {
          select: {
            provider: true,
            name:     true,
          },
        },
      },
    });

    if (!orgIntegration) return null;

    return {
      id:               orgIntegration.id,
      provider:         orgIntegration.integration.provider,
      name:             orgIntegration.integration.name,
      status:           orgIntegration.status,
      config:           orgIntegration.config,
      expiresAt:        orgIntegration.expiresAt,
      lastUsedAt:       orgIntegration.lastUsedAt,
      monthlyCallCount: orgIntegration.monthlyCallCount,
      monthlyQuota:     orgIntegration.monthlyQuota,
      isEnabled:        orgIntegration.status === 'ACTIVE',
    } as IntegrationInfo;
  } catch (error) {
    console.error(`[SettingsEngine] getIntegration error for "${provider}": ${error}`);
    return null;
  }
}

/**
 * Get all enabled integrations for an organization.
 *
 * Used by:
 * - Admin integrations page (show what is connected)
 * - AI router (which AI provider is configured?)
 * - Document engine (YouSign or DocuSign?)
 *
 * @param organizationId - The organization
 */
export async function getEnabledIntegrations(
  organizationId: string
): Promise<IntegrationInfo[]> {
  try {
    const orgIntegrations = await (prisma as any).organizationIntegration.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: {
        id:               true,
        status:           true,
        config:           true,
        expiresAt:        true,
        lastUsedAt:       true,
        monthlyCallCount: true,
        monthlyQuota:     true,
        integration: {
          select: { provider: true, name: true },
        },
      },
    });

    return orgIntegrations.map((oi: any) => ({
      id:               oi.id,
      provider:         oi.integration.provider,
      name:             oi.integration.name,
      status:           oi.status,
      config:           oi.config,
      expiresAt:        oi.expiresAt,
      lastUsedAt:       oi.lastUsedAt,
      monthlyCallCount: oi.monthlyCallCount,
      monthlyQuota:     oi.monthlyQuota,
      isEnabled:        true,
    })) as IntegrationInfo[];
  } catch (error) {
    console.error(`[SettingsEngine] getEnabledIntegrations error: ${error}`);
    return [];
  }
}
