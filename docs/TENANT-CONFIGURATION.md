# Tenant Configuration Engine — EBH-Pilot

> Ticket 019 — Tenant Configuration Engine (Fondations SaaS)

---

## Philosophie

Le Tenant Configuration Engine est le moteur de personnalisation par organisation d'EBH-Pilot.

Principe fondamental :

> **Chaque organisation doit pouvoir configurer son propre fonctionnement sans modifier le code.**

Un éditeur automobile aura une TVA à 20%, un cycle de vente en 6 étapes, des emails en français.
Un agent immobilier aura une TVA à 0%, un cycle de vente en 4 étapes, des emails en anglais.
Un distributeur de remorques aura sa propre numérotation de devis, ses propres modèles de notification.

Tout cela est possible sans aucun fork, sans aucun code spécifique — uniquement via la configuration.

---

## Architecture

```
Route HTTP / Service métier
       |
       v
  settingsEngine.ts  (JAMAIS accès direct à Prisma depuis les routes)
       |
       +-- getSetting()           → OrganizationSetting (table: organization_settings)
       +-- getWorkflow()          → WorkflowTemplate + WorkflowStep
       +-- getNotificationTemplate() → NotificationTemplate
       +-- getIntegration()       → OrganizationIntegration + Integration
       +-- isIntegrationEnabled() → check rapide statut intégration
```

### Règle d'architecture

**Toute lecture de configuration DOIT passer par le Settings Engine.**
Aucune route ne doit interroger directement `prisma.organizationSetting.findUnique()`.
Cette règle permet de changer le backend de stockage (Redis, CDN, fichier) sans toucher aucune route.

---

## Modèles Prisma

### OrganizationSetting

Configuration globale clé/valeur par organisation.

| Champ | Description |
|-------|-------------|
| key | Clé unique au sein de l'organisation (snake_case) |
| value | Valeur sérialisée en string |
| valueType | Type pour la désérialisation (STRING, NUMBER, BOOLEAN, JSON, DATE, COLOR, URL) |
| category | Catégorie (GENERAL, LOCALE, FISCAL, NUMBERING, DOCUMENT, EMAIL, WORKFLOW, AI, QUOTA, BRANDING, SECURITY, INTEGRATION, MOBILE) |
| isReadOnly | Si true, non modifiable par l'admin organisation (super-admin uniquement) |

**Exemples de clés :**
- language, timezone, currency, fiscal_year_start
- vat_rate, vat_number, company_registration
- quotation_prefix, invoice_prefix, order_prefix
- date_format, time_format, decimal_separator, thousand_separator
- ai_provider, ai_model, ai_temperature, ai_max_tokens
- max_prospects_per_user, max_import_rows, storage_quota_gb

### WorkflowTemplate

Workflow personnalisable par organisation et par type d'entité.

| Champ | Description |
|-------|-------------|
| code | Identifiant technique (ex: prospect, client, order, sav, project) |
| entityType | Type d'entité concernée |
| isDefault | Si true, workflow utilisé par défaut pour ce type d'entité |
| color, icon | Apparence visuelle |
| config | Configuration JSON libre pour extensions futures |

**Exemples de workflows :**
- Prospect (automobile) : Nouveau → Contacté → Essai → Offre → Commandé → Livré → Perdu
- Prospect (immobilier) : Nouveau → Visite → Offre → Compromis → Acte → Perdu
- SAV : Ouvert → En cours → En attente pièce → Résolu → Fermé
- RH : Candidature → Entretien → Offre → Onboarding → Actif

### WorkflowStep

Étape configurable d'un workflow.

| Champ | Description |
|-------|-------------|
| order | Position dans le workflow |
| isInitial | Étape d'entrée |
| isFinal | Étape de sortie |
| isSuccess | Étape positive (Gagné, Livré, Résolu) |
| transitions | Liste des codes d'étapes vers lesquelles on peut transitionner |
| entryConditions | Conditions requises pour entrer dans cette étape (JSON) |
| onEnterActions | Actions automatiques au changement d'étape (JSON) |
| slaHours | Délai SLA avant escalade (en heures) |

### NotificationTemplate

Template de notification personnalisable par canal et par événement.

**Canaux supportés :** EMAIL, SMS, PUSH, WHATSAPP, TEAMS, SLACK, DISCORD, IN_APP, WEBHOOK

**Variables de template (handlebars-like) :**
- {{user.name}}, {{organization.name}}, {{resource.name}}
- {{event}}, {{date}}, {{url}}, {{branding.primaryColor}}

**Fallback :** Si aucun template trouvé pour la locale demandée, fallback sur 'fr'.

### Integration

Catalogue des intégrations disponibles sur la plateforme.

**Fournisseurs supportés :**
- IA : OPENAI, ANTHROPIC, GEMINI, MISTRAL, AZURE_OPENAI
- Finance : STRIPE, PENNYLANE
- Documents : YOUSIGN, DOCUSIGN
- Productivité : GOOGLE_WORKSPACE, MICROSOFT_365
- Automatisation : ZAPIER, WEBHOOK_CUSTOM
- Communication : TWILIO, SENDGRID, RESEND, MAILGUN, VONAGE
- CRM tiers : HUBSPOT, SALESFORCE, PIPEDRIVE, INTERCOM

### OrganizationIntegration

Activation et configuration d'une intégration pour une organisation.

**Sécurité API Keys :**
- Le champ `encryptedConfig` stocke les clés API chiffrées (AES-256-GCM)
- La clé de chiffrement est une variable d'environnement (ENCRYPTION_KEY)
- `getIntegration()` n'expose JAMAIS encryptedConfig
- Une fonction séparée `decryptIntegrationConfig()` gérera le déchiffrement côté serveur

---

## Fonctions du Settings Engine

| Fonction | Description |
|----------|-------------|
| getSetting(orgId, key) | Récupère un paramètre brut (string) |
| getParsedSetting(orgId, key, default) | Récupère un paramètre typé (number, boolean, JSON) |
| getAllSettings(orgId, category?) | Récupère tous les paramètres d'une organisation |
| setSetting(orgId, key, value, opts?) | Crée ou met à jour un paramètre |
| getWorkflow(orgId, code) | Récupère un workflow avec ses étapes |
| getDefaultWorkflow(orgId, entityType) | Récupère le workflow par défaut pour un type d'entité |
| getNotificationTemplate(orgId, channel, event, locale) | Récupère un template de notification |
| isIntegrationEnabled(orgId, provider) | Vérifie si une intégration est active |
| getIntegration(orgId, provider) | Récupère les infos d'une intégration (sans secrets) |
| getEnabledIntegrations(orgId) | Liste toutes les intégrations actives |

---

## Utilisation (exemples futurs)

### Lire un paramètre depuis une route

```
import { getParsedSetting } from '../middleware/settingsEngine.js';

// Dans une route de création de devis :
const vatRate = await getParsedSetting(req.organizationId, 'vat_rate', 20);
const prefix  = await getParsedSetting(req.organizationId, 'quotation_prefix', 'DEV');
```

### Vérifier si une intégration IA est disponible

```
import { isIntegrationEnabled, getIntegration } from '../middleware/settingsEngine.js';

if (await isIntegrationEnabled(orgId, 'OPENAI')) {
  const integration = await getIntegration(orgId, 'OPENAI');
  // Utiliser integration.config pour le modèle, etc.
}
```

### Charger le workflow d'un prospect

```
import { getDefaultWorkflow } from '../middleware/settingsEngine.js';

const workflow = await getDefaultWorkflow(orgId, 'prospect');
if (workflow) {
  const allowedTransitions = workflow.steps
    .find(s => s.code === currentStatus)?.transitions ?? [];
}
```

---

## Extensibilité

### Ajouter un nouveau paramètre

1. Choisir une clé en snake_case (ex: 'max_file_size_mb')
2. Choisir une catégorie (ex: QUOTA)
3. Appeler `setSetting(orgId, 'max_file_size_mb', '10', { valueType: 'NUMBER', category: 'QUOTA' })`
4. Lire avec `getParsedSetting(orgId, 'max_file_size_mb', 10)`

Aucune migration Prisma requise pour ajouter un nouveau paramètre.

### Ajouter un nouveau canal de notification

1. Ajouter la valeur dans l'enum `NotificationChannel` du schema Prisma
2. Créer les templates dans la table `notification_templates`
3. Implémenter l'envoi dans `NotificationListener`

### Ajouter une nouvelle intégration

1. Ajouter le fournisseur dans l'enum `IntegrationProvider`
2. Créer une entrée dans la table `Integration` (catalogue)
3. L'activation par organisation se fait via `OrganizationIntegration`

---

## Compatibilité avec l'architecture existante

### Multi-tenant (Ticket 014)

Chaque paramètre, workflow, template et intégration est scopé à `organizationId`.
Il est impossible qu'une organisation lise la configuration d'une autre.
La contrainte `@@unique([organizationId, key])` enforce l'isolation au niveau BDD.

### White Label (Ticket 014C)

La catégorie `BRANDING` dans `OrganizationSetting` complète le moteur White Label.
Les paramètres de branding avancé (polices, rayons, espacements) peuvent être stockés ici.
Le `BrandingProvider` (Ticket 014D) pourra appeler `getAllSettings(orgId, 'BRANDING')`
pour charger la configuration visuelle complète.

### Module Engine (Ticket 016)

Le Settings Engine est complémentaire du Module Engine :
- Module Engine : est-ce que le module CRM est activé ?
- Settings Engine : comment fonctionne ce module pour cette organisation ?

Exemple : le module CRM est activé (Module Engine) + le workflow Prospect est configuré (Settings Engine).

### Event Bus (Ticket 017)

Les `onEnterActions` dans `WorkflowStep` peuvent déclencher des Domain Events.
Le Workflow Listener lit les workflows via `getWorkflow()` pour décider quoi faire.
Les templates de notification sont lus par `NotificationListener` via `getNotificationTemplate()`.

### Audit Engine (Ticket 018)

Toute modification de configuration via `setSetting()` devra être auditée.
Un futur `SETTING_UPDATED` Domain Event permettra de tracer tous les changements de config.
L'audit log permettra de savoir qui a changé quelle configuration, quand.

---

## Préparation Marketplace

Le Tenant Configuration Engine constitue les fondations d'une future Marketplace de modules.

**Vision Marketplace :**
- Un partenaire développe un module (ex: Planning, Comptabilité, RH)
- Ce module s'installe sur une organisation via `OrganizationModule`
- Il enregistre ses paramètres via `OrganizationSetting`
- Il crée ses workflows via `WorkflowTemplate`
- Il crée ses templates de notification via `NotificationTemplate`
- Il s'intègre avec des services tiers via `OrganizationIntegration`

Tout cela sans modifier le code core d'EBH-Pilot.

**Compatibilité mobile :**
Les workflows configurés ici piloteront l'affichage mobile :
- Kanban columns = WorkflowStep
- Push notifications = NotificationTemplate (canal PUSH)
- Intégrations mobiles = MOBILE_APP feature (Ticket 016)

**Compatibilité tous secteurs :**
100% générique — aucun code spécifique automobile, immobilier, assurance ou autre.
Chaque secteur configure son fonctionnement via ce moteur.

---

## Sécurité

| Règle | Enforcement |
|-------|-------------|
| API Keys jamais en clair | encryptedConfig (AES-256-GCM) |
| Isolation multi-tenant | @@unique([organizationId, key]) |
| Paramètres en lecture seule | isReadOnly = true |
| Pas d'accès direct Prisma | Toute lecture via settingsEngine.ts |
| Logs d'audit sur les changements | Futur SETTING_UPDATED event |

---

*Document créé avec le Ticket 019 — Tenant Configuration Engine*
