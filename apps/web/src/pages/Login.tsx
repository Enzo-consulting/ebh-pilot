import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button, Card, CardBody } from '@ebh/ui';
import { signInSchema, signUpSchema } from '@ebh/shared';
import { useAuth } from '../auth/AuthProvider';

export function Login() {
  const { signIn, signUp, signInDemo, configured } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    const schema = mode === 'in' ? signInSchema : signUpSchema;
    const parsed = schema.safeParse(
      mode === 'in' ? { email, password } : { email, password, name },
    );
    if (!parsed.success) {
      setError('Vérifiez les champs (email valide, mot de passe ≥ 6).');
      return;
    }
    setBusy(true);
    const res =
      mode === 'in'
        ? await signIn({ email, password })
        : await signUp({ email, password, name });
    setBusy(false);
    if (res.error) setError(res.error);
    else navigate('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">EBH Pilot</span>
        </div>

        <Card>
          <CardBody className="space-y-4">
            <div>
              <h1 className="text-lg font-semibold">
                {mode === 'in' ? 'Connexion' : 'Créer un compte'}
              </h1>
              <p className="mt-1 text-sm text-fg-muted">
                {mode === 'in'
                  ? 'Accédez à votre tableau de bord'
                  : 'Quelques secondes suffisent'}
              </p>
            </div>

            {mode === 'up' && (
              <Field
                label="Nom"
                value={name}
                onChange={setName}
                placeholder="Jean Dupont"
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="vous@entreprise.com"
            />
            <Field
              label="Mot de passe"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button className="w-full" onClick={submit} disabled={busy}>
              {busy ? '…' : mode === 'in' ? 'Se connecter' : "S'inscrire"}
            </Button>

            {!configured && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  signInDemo();
                  navigate('/');
                }}
              >
                Continuer en mode démo
              </Button>
            )}

            <p className="text-center text-sm text-fg-muted">
              {mode === 'in' ? 'Pas de compte ?' : 'Déjà inscrit ?'}{' '}
              <button
                className="font-medium text-brand-500 hover:underline"
                onClick={() => setMode((m) => (m === 'in' ? 'up' : 'in'))}
              >
                {mode === 'in' ? "S'inscrire" : 'Se connecter'}
              </button>
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none placeholder:text-fg-muted focus:border-brand-500"
      />
    </label>
  );
}
