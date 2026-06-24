import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, SearchX } from 'lucide-react';
import { Button, Card, CardBody } from '@ebh/ui';

/**
 * 404 - Page introuvable.
 * Design coherent avec le reste de l'application :
 * memes tokens de couleur, memes primitives UI (Card, Button).
 */
export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight">EBH Pilot</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardBody className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface">
            <SearchX className="h-8 w-8 text-fg-muted" />
          </div>

          <div>
            <h1 className="text-5xl font-bold tracking-tight text-fg">404</h1>
            <p className="mt-2 text-lg font-medium text-fg">Page introuvable</p>
            <p className="mt-1 text-sm text-fg-muted">
              La page que vous cherchez n&apos;existe pas ou a ete deplacee.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 pt-2">
            <Button className="w-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Retour
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => navigate('/')}>
              Aller au tableau de bord
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
