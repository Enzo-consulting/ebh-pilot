# Feature Flags — EBH Pilot

> Ticket 016 — Systeme de feature flags pour l activation granulaire des capacites

## Principes

Les Feature Flags permettent d activer ou desactiver des capacites techniques
specifiques pour chaque organisation, independamment des modules souscrits.

**Difference Module / Feature :**
- **Module** : ensemble fonctionnel coherent (CRM, RH, Documents)
- **Feature** : capacite technique precise (AI_TRANSLATION, PDF_GENERATION, MOBILE_APP)

Un module peut etre actif mais certaines de ses features restent desactivees
(ex: module BI actif, mais CUSTOM_DASHBOARDS desactive jusqu a upgrade).

---

## Catalogue des features

### Intelligence Artificielle

| Code | Description | Quota possible |
|------|-------------|----------------|
| AI_TRANSLATION | Traduction automatique des contenus | Non |
| AI_ANALYSIS | Analyse IA des donnees (prospects, produits) | Oui (requetes/mois) |
| AI_IMPORT | Import intelligent de donnees via IA | Oui (imports/mois) |
| AI_ASSISTANT | Assistant conversationnel IA | Oui (messages/mois) |

### Documents et exports

| Code | Description | Quota possible |
|------|-------------|----------------|
| PDF_GENERATION | Generation de PDF (devis, factures, rapports) | Oui (PDFs/mois) |
| EXPORT_EXCEL | Export des donnees en Excel | Non |
| EXPORT_PDF | Export des listes en PDF | Non |
| DOCUMENTS | Module GED (Gestion electronique documentaire) | Non |

### Communication

| Code | Description | Quota possible |
|------|-------------|----------------|
| EMAILING | Envoi d emails depuis la plateforme | Oui (emails/mois) |
| SMS | Envoi de SMS | Oui (SMS/mois) |
| WHATSAPP | Integration WhatsApp Business | Oui (messages/mois) |
| PUSH_NOTIFICATIONS | Notifications push mobile et web | Non |

### Signatures electroniques

| Code | Description | Quota possible |
|------|-------------|----------------|
| YOUSIGN | Signature electronique via YouSign | Oui (signatures/mois) |
| DOCUSIGN | Signature electronique via DocuSign | Oui (signatures/mois) |

### API et integrations

| Code | Description | Quota possible |
|------|-------------|----------------|
| API_ACCESS | Acces a l API REST publique | Non |
| WEBHOOK | Webhooks sortants vers systemes tiers | Non |

### Reporting et BI

| Code | Description | Quota possible |
|------|-------------|----------------|
| REPORTING | Rapports standard | Non |
| ADVANCED_ANALYTICS | Analytics avances et drill-down | Non |
| CUSTOM_DASHBOARDS | Tableaux de bord personnalisables | Non |

### Mobile

| Code | Description | Quota possible |
|------|-------------|----------------|
| MOBILE_APP | Application mobile (iOS et Android) | Non |
| GPS_TRACKING | Geolocalisation des commerciaux | Non |
| QR_SCAN | Scan de QR codes | Non |
| BARCODE_SCAN | Scan de codes barres | Non |
| OFFLINE_MODE | Mode hors ligne (sync differee) | Non |

### Challenges et gamification

| Code | Description | Quota possible |
|------|-------------|----------------|
| CHALLENGES | Module challenges commerciaux | Non |
| LEADERBOARD | Classements et competitions | Non |

### Personnalisation

| Code | Description | Quota possible |
|------|-------------|----------------|
| CUSTOM_DOMAIN | Domaine personnalise (crm.entreprise.fr) | Non |
| WHITE_LABEL | Identite visuelle complete | Non |

### Administration

| Code | Description | Quota possible |
|------|-------------|----------------|
| AUDIT_LOG | Journal d audit complet | Non |
| MULTI_ORGANIZATION | Gestion multi-organisation | Non |
| SSO | Single Sign-On (SAML, OIDC) | Non |

---

## Cas d usage

### Cas 1 : Concessionnaire automobile

Un reseau de concessionnaires active :
- Module : `products`, `clients`, `crm`, `planning`
- Features : `PDF_GENERATION`, `EMAILING`, `MOBILE_APP`, `GPS_TRACKING`, `QR_SCAN`

Il n a pas besoin de : `hr`, `accounting`, `YOUSIGN`, `AI_TRANSLATION`

### Cas 2 : Cabinet de conseil

Un cabinet active :
- Module : `clients`, `documents`, `bi`
- Features : `PDF_GENERATION`, `YOUSIGN`, `REPORTING`, `API_ACCESS`

### Cas 3 : Reseau de franchises

Un franchiseur active pour toutes ses organisations :
- Features : `WHITE_LABEL`, `CUSTOM_DOMAIN`, `CHALLENGES`, `LEADERBOARD`, `MOBILE_APP`

### Cas 4 : Montee en gamme

Un client Starter qui monte en Pro :
```sql
-- Activer AI_IMPORT pour l organisation
INSERT INTO "OrganizationFeature" (id, "organizationId", "featureId", "isEnabled", "quota")
VALUES (gen_random_uuid(), '<org_id>', '<ai_import_feature_id>', true, 100);
-- quota = 100 imports par mois
```

---

## Utilisation dans le code

```typescript
// Dans une route Express
router.post('/reports/generate',
  requireModule('bi'),
    requireFeature('PDF_GENERATION'),
      generateReportHandler
      );

      // Verification programmatique
      const { enabled } = await hasFeature(orgId, 'AI_ANALYSIS');
      if (!enabled) throw new Error('Feature non disponible');

      // Frontend : liste des features actives
      const features = await getEnabledFeatures(orgId);
      if (features.includes('MOBILE_APP')) {
        // Afficher lien de telechargement de l app
        }
        ```

        ---

        ## Application mobile — Activation sans code

        L application mobile lit les features actives au demarrage :

        ```json
        {
          "features": [
              "MOBILE_APP",
                  "GPS_TRACKING",
                      "QR_SCAN",
                          "PUSH_NOTIFICATIONS",
                              "CHALLENGES",
                                  "OFFLINE_MODE"
                                    ]
                                    }
                                    ```

                                    Chaque feature active/desactive des composants dans l app sans mise a jour.
                                    Aucune modification du code backend ou frontend n est necessaire.

                                    ---

                                    ## Gestion des quotas

                                    Les features avec quota incrementent `usageCount` a chaque utilisation :

                                    ```typescript
                                    // Apres utilisation de la feature
                                    await prisma.organizationFeature.update({
                                      where: { organizationId_featureId: { organizationId, featureId } },
                                        data: { usageCount: { increment: 1 } },
                                        });
                                        ```

                                        Le reset mensuel des quotas sera gere par un cron job (hors scope Ticket 016).
                                        
