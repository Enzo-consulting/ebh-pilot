import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { prisma } from './prisma.js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

// A server-side Supabase client used only to validate access tokens.
const supabase =
    supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
              auth: { persistSession: false, autoRefreshToken: false },
    })
      : null;

export interface AuthedRequest extends Request {
    userId?: string;
}

/**
 * Verifies the `Authorization: Bearer <jwt>` header against Supabase,
 * then maps the Supabase auth user to a local User row (creating it on
 * first sight) and attaches `req.userId` for downstream scoping.
 */
export async function requireAuth(
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ) {
    if (!supabase) {
          return res
            .status(503)
            .json({ error: 'Auth indisponible : Supabase non configuré côté serveur.' });
    }

  const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
          return res.status(401).json({ error: 'Token manquant.' });
    }

  const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
          return res.status(401).json({ error: 'Token invalide.' });
    }

  const authUser = data.user;

  // Ensure a local user exists, keyed by the Supabase auth id.
  const user = await prisma.user.upsert({
        where: { authId: authUser.id },
        update: { email: authUser.email ?? '' },
        create: {
                authId: authUser.id,
                email: authUser.email ?? '',
                name: (authUser.user_metadata?.name as string | undefined) ?? null,
        },
  });

  req.userId = user.id;
    next();
}
