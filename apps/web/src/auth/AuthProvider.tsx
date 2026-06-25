import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import type { SignInInput, SignUpInput } from '@ebh/shared';

interface AuthContextValue {
    user: User | null;
    session: Session | null;
    loading: boolean;
    configured: boolean;
    signIn: (input: SignInInput) => Promise<{ error: string | null }>;
    signUp: (input: SignUpInput) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    signInDemo: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

  useEffect(() => {
        if (!supabase) {
                setLoading(false);
                return;
        }
        supabase.auth.getSession().then(({ data }) => {
                setSession(data.session);
                setUser(data.session?.user ?? null);
                setLoading(false);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
                setSession(s);
                setUser(s?.user ?? null);
        });
        return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthContextValue['signIn'] = async ({ email, password }) => {
        if (!supabase) return { error: 'Supabase non configure' };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
  };

  const signUp: AuthContextValue['signUp'] = async ({ email, password, name }) => {
        if (!supabase) return { error: 'Supabase non configure' };
        const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { name } },
        });
        return { error: error?.message ?? null };
  };

  const signOut = async () => {
        if (supabase) await supabase.auth.signOut();
        setUser(null);
        setSession(null);
  };

  /**
     * Demo mode — development only.
     * Guarded by import.meta.env.DEV to prevent activation in production.
     */
  const signInDemo = () => {
        if (!import.meta.env.DEV) {
                console.warn('signInDemo is disabled in production.');
                return;
        }
        setUser({ id: 'demo', email: 'demo@ebh.pilot' } as User);
  };

  return (
        <AuthContext.Provider
                value={{
                          user,
                          session,
                          loading,
                          configured: isSupabaseConfigured,
                          signIn,
                          signUp,
                          signOut,
                          signInDemo,
                }}
              >
          {children}
        </AuthContext.Provider>
      );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
