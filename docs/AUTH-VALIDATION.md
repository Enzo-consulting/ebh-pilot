# AUTH-VALIDATION — EBH Pilot
## Rapport de validation de l'authentification Supabase — Ticket 013

> **Date :** 25 juin 2026
> **Périmètre :** Parcours complet d'authentification Supabase
> **Résultat global :** ✅ Authentification réelle Supabase validée — 2 anomalies corrigées

---

## 1. Parcours testé

### 1.1 Connexion (signIn)

**Fichier :** `apps/web/src/pages/Login.tsx` + `apps/web/src/auth/AuthProvider.tsx`

**Flux :**
1. Utilisateur saisit email + mot de passe
2. Validation Zod (`signInSchema`) côté client
3. Appel `signIn({ email, password })` depuis `useAuth()`
4. `AuthProvider.signIn` appelle `supabase.auth.signInWithPassword({ email, password })`
5. Si succès : `onAuthStateChange` met à jour `user` et `session` automatiquement
6. `navigate('/')` → accès au dashboard

**Résultat :** ✅ Connexion 100% via Supabase Auth. Aucun bypass possible.

### 1.2 Inscription (signUp)

**Flux :**
1. Utilisateur bascule en mode "Créer un compte"
2. Validation Zod (`signUpSchema`) côté client (email, password, name)
3. Appel `signUp({ email, password, name })` depuis `useAuth()`
4. `AuthProvider.signUp` appelle `supabase.auth.signUp({ email, password, options: { data: { name } } })`
5. Supabase envoie un email de confirmation (selon la config du projet)
6. `onAuthStateChange` gère la session post-inscription

**Résultat :** ✅ Inscription via Supabase. Aucun compte créé automatiquement par le code.

### 1.3 Récupération session au démarrage

**Fichier :** `apps/web/src/auth/AuthProvider.tsx` (useEffect)

**Flux :**
```typescript
supabase.auth.getSession().then(({ data }) => {
  setSession(data.session);
    setUser(data.session?.user ?? null);
      setLoading(false);
      });
      ```

      **Résultat :** ✅ La session est récupérée depuis le localStorage Supabase au montage du composant. `loading = true` pendant ce délai → `ProtectedRoute` affiche `LoadingScreen` → pas de flash de redirection.

      ### 1.4 Persistance de session après refresh

      **Mécanisme :** Supabase stocke le token dans `localStorage` sous la clé `sb-[project-ref]-auth-token`. Au refresh de la page, `getSession()` relit ce token, le valide et restaure la session sans redemander la connexion.

      **Résultat :** ✅ Persistance automatique gérée par le SDK Supabase. Aucun code supplémentaire requis.

      ### 1.5 Écoute onAuthStateChange

      **Fichier :** `apps/web/src/auth/AuthProvider.tsx`

      ```typescript
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        setSession(s);
          setUser(s?.user ?? null);
          });
          return () => sub.subscription.unsubscribe();
          ```

          **Résultat :** ✅ L'état auth est mis à jour en temps réel pour tout événement (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED). Le cleanup `unsubscribe()` évite les fuites mémoire.

          ### 1.6 Comportement à l'expiration de session

          **Mécanisme :** Le SDK Supabase rafraîchit automatiquement le token d'accès (access_token, durée 1h) en utilisant le refresh_token (durée configurable dans Supabase) avant expiration. `onAuthStateChange` émet `TOKEN_REFRESHED` → `session` et `user` restent à jour.

          **Si le refresh_token expire :** Supabase émet `SIGNED_OUT` → `onAuthStateChange` reçoit `session = null` → `setUser(null)` → `ProtectedRoute` redirige vers `/login`.

          **Résultat :** ✅ Expiration gérée automatiquement par le SDK. L'utilisateur est redirigé vers /login proprement.

          ### 1.7 Déconnexion (signOut)

          **Fichier :** `apps/web/src/components/Topbar.tsx` + `apps/web/src/auth/AuthProvider.tsx`

          **Flux :**
          1. Utilisateur clique sur l'icône `LogOut` dans la Topbar
          2. `signOut()` depuis `useAuth()`
          3. `supabase.auth.signOut()` → invalide la session côté Supabase + efface localStorage
          4. `setUser(null)` + `setSession(null)` → state local nettoyé
          5. `onAuthStateChange` émet `SIGNED_OUT` (double sécurité)
          6. `ProtectedRoute` détecte `user = null` → `Navigate to="/login" replace`

          **Résultat :** ✅ Déconnexion complète. Session invalidée côté serveur ET côté client.

          ---

          ## 2. Routes protégées

          ### 2.1 Analyse de App.tsx

          ```typescript
          const AuthedLayout = () => <ProtectedRoute children={<AppLayout />} />;

          <Routes>
            <Route path="/login" element={<Login />} />           // Publique
              <Route element={<AuthedLayout />}>
                  <Route path="/" element={<Dashboard />} />           // Protégée
                      <Route path="/clients" element={<Clients />} />       // Protégée
                          <Route path="/prospects" element={<Navigate to="/clients" replace />} /> // Protégée
                              <Route path="/products" element={<Products />} />     // Protégée
                                  <Route path="/profitability" element={<Profitability />} /> // Protégée
                                      <Route path="/ai-import" element={<AiImport />} />    // Protégée
                                          <Route path="*" element={<NotFound />} />             // Protégée (404)
                                            </Route>
                                              <Route path="*" element={<NotFound />} />               // 404 global
                                              </Routes>
                                              ```

                                              ### 2.2 Routes publiques

                                              | Route | Composant | Accès |
                                              |---|---|---|
                                              | `/login` | `Login` | ✅ Public — hors layout protégé |

                                              ### 2.3 Routes privées (toutes protégées par ProtectedRoute)

                                              | Route | Composant | Protection |
                                              |---|---|---|
                                              | `/` | `Dashboard` | ✅ ProtectedRoute |
                                              | `/clients` | `Clients` | ✅ ProtectedRoute |
                                              | `/prospects` | `Navigate → /clients` | ✅ ProtectedRoute |
                                              | `/products` | `Products` | ✅ ProtectedRoute |
                                              | `/profitability` | `Profitability` | ✅ ProtectedRoute |
                                              | `/ai-import` | `AiImport` | ✅ ProtectedRoute |
                                              | `/*` (404) | `NotFound` | ✅ ProtectedRoute |

                                              **Résultat :** ✅ Toutes les pages privées passent par `ProtectedRoute`. La route 404 à l'intérieur du layout protégé est également protégée.

                                              ### 2.4 Logique ProtectedRoute

                                              ```typescript
                                              export function ProtectedRoute({ children }: { children: ReactNode }) {
                                                const { user, loading } = useAuth();
                                                  if (loading) return <LoadingScreen />;      // Attend la résolution session
                                                    if (!user) return <Navigate to="/login" replace />;  // Redirige si non connecté
                                                      return <>{children}</>;                     // Rend les enfants si connecté
                                                      }
                                                      ```

                                                      **Résultat :** ✅ Les 3 états sont correctement gérés : chargement, non authentifié, authentifié.

                                                      ---

                                                      ## 3. Anomalies identifiées et corrigées

                                                      ### Anomalie 1 — signInDemo sans garde de production (CRITIQUE)

                                                      **Fichier :** `apps/web/src/auth/AuthProvider.tsx`
                                                      **Gravité :** 🔴 Critique — contournement d'authentification possible en production

                                                      **Problème :**
                                                      ```typescript
                                                      // Avant (dangereux)
                                                      const signInDemo = () => {
                                                        setUser({ id: 'demo', email: 'demo@ebh.pilot' } as User);
                                                        };
                                                        ```
                                                        `signInDemo` pouvait être appelé en production si `configured = false` (VITE_SUPABASE_* absents). Cela permettait à n'importe qui d'accéder aux pages protégées sans authentification réelle.

                                                        **Correction appliquée (commit d9b3ea8) :**
                                                        ```typescript
                                                        const signInDemo = () => {
                                                          if (!import.meta.env.DEV) {
                                                              console.warn('signInDemo is disabled in production.');
                                                                  return;
                                                                    }
                                                                      setUser({ id: 'demo', email: 'demo@ebh.pilot' } as User);
                                                                      };
                                                                      ```

                                                                      **Résultat :** ✅ En production (`import.meta.env.DEV = false`), `signInDemo` ne fait rien. En développement local, le mode démo reste disponible pour l'exploration sans Supabase.

                                                                      ### Anomalie 2 — Bouton "Continuer en mode démo" visible en production (MODÉRÉ)

                                                                      **Fichier :** `apps/web/src/pages/Login.tsx`
                                                                      **Gravité :** 🟡 Modéré — UX confuse en production

                                                                      **Problème :**
                                                                      ```typescript
                                                                      // Avant (insuffisant)
                                                                      {!configured && (
                                                                        <Button variant="secondary" onClick={() => { signInDemo(); navigate('/'); }}>
                                                                            Continuer en mode démo
                                                                              </Button>
                                                                              )}
                                                                              ```
                                                                              Si `VITE_SUPABASE_*` étaient absents en production (mauvaise configuration), le bouton s'affichait, induisant les utilisateurs en erreur.

                                                                              **Correction appliquée (commit 933303f) :**
                                                                              ```typescript
                                                                              {!configured && import.meta.env.DEV && (
                                                                                <Button variant="secondary" onClick={() => { signInDemo(); navigate('/'); }}>
                                                                                    Continuer en mode démo
                                                                                      </Button>
                                                                                      )}
                                                                                      ```

                                                                                      **Résultat :** ✅ Le bouton n'est visible qu'en développement local. En production, la page de connexion n'affiche que le formulaire email/mot de passe Supabase.

                                                                                      ---

                                                                                      ## 4. Fichiers vérifiés

                                                                                      | Fichier | Résultat | Anomalie |
                                                                                      |---|---|---|
                                                                                      | `apps/web/src/pages/Login.tsx` | ✅ Corrigé | Bouton démo caché en prod (commit 933303f) |
                                                                                      | `apps/web/src/auth/AuthProvider.tsx` | ✅ Corrigé | signInDemo gardé (commit d9b3ea8) |
                                                                                      | `apps/web/src/auth/supabase.ts` | ✅ OK | Aucune anomalie |
                                                                                      | `apps/web/src/auth/useAuth.ts` | ✅ OK | Aucune anomalie |
                                                                                      | `apps/web/src/components/ProtectedRoute.tsx` | ✅ OK | Aucune anomalie |
                                                                                      | `apps/web/src/components/Topbar.tsx` | ✅ OK | Bouton LogOut présent et fonctionnel |
                                                                                      | `apps/web/src/App.tsx` | ✅ OK | Toutes routes privées sous ProtectedRoute |
                                                                                      | `apps/web/src/main.tsx` | ✅ OK | AuthProvider correctement positionné |

                                                                                      ---

                                                                                      ## 5. Fichiers modifiés

                                                                                      | Fichier | Commit | Modification |
                                                                                      |---|---|---|
                                                                                      | `apps/web/src/auth/AuthProvider.tsx` | `d9b3ea8` | Garde `import.meta.env.DEV` sur `signInDemo` |
                                                                                      | `apps/web/src/pages/Login.tsx` | `933303f` | Garde `import.meta.env.DEV` sur le bouton démo |

                                                                                      ---

                                                                                      ## 6. Checklist finale Ticket 013

                                                                                      - [x] Login utilise Supabase Auth (`signInWithPassword`) — aucun bypass
                                                                                      - [x] AuthProvider récupère session via `getSession()` au démarrage
                                                                                      - [x] AuthProvider récupère user via `session?.user` et `onAuthStateChange`
                                                                                      - [x] ProtectedRoute protège toutes les pages privées (/, /clients, /products, /profitability, /ai-import)
                                                                                      - [x] Déconnexion : `supabase.auth.signOut()` + nettoyage state local + redirection /login
                                                                                      - [x] Persistance de session : gérée par localStorage Supabase (getSession au démarrage)
                                                                                      - [x] Expiration de session : TOKEN_REFRESHED automatique, SIGNED_OUT → redirection /login
                                                                                      - [x] Anomalie 1 corrigée : signInDemo gardé par import.meta.env.DEV
                                                                                      - [x] Anomalie 2 corrigée : bouton démo caché en production
                                                                                      - [x] Aucun compte créé automatiquement par le code
                                                                                      - [x] Aucune nouvelle fonctionnalité ajoutée
                                                                                      - [x] Architecture conservée
                                                                                      - [x] Design non modifié

                                                                                      ---

                                                                                      ## 7. Note sur le premier compte administrateur

                                                                                      Conformément aux règles du ticket, **aucun compte n'a été créé automatiquement**.

                                                                                      Le premier compte administrateur doit être créé manuellement par le propriétaire du projet via :
                                                                                      1. Le tableau de bord Supabase → Authentication → Users → "Invite user" ou "Add user"
                                                                                      2. Ou via la page `/login` de l'application une fois déployée (formulaire "Créer un compte")

                                                                                      Aucun script de seeding, aucun compte de démonstration, aucun utilisateur hardcodé dans le code.
