import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

type AuthSubscription = ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'];

interface AuthState {
  user: User | null;
  session: Session | null;
  status: AuthStatus;
  error: string | null;
  init: () => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  loginWithOtp: (email: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;

  // Internal guards to prevent duplicate listeners (React StrictMode runs effects twice in dev)
  _initialized: boolean;
  _authSubscription: AuthSubscription | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  status: 'idle',
  error: null,

  _initialized: false,
  _authSubscription: null,

  init: async () => {
    const { _initialized, _authSubscription } = get();
    if (_initialized && _authSubscription) {
      return;
    }

    set({ status: 'loading' });

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session', error);
      set({ user: null, session: null, status: 'unauthenticated', error: error.message });
      return;
    }

    set({
      user: data.session?.user ?? null,
      session: data.session ?? null,
      status: data.session ? 'authenticated' : 'unauthenticated',
      error: null,
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        user: session?.user ?? null,
        session: session ?? null,
        status: session ? 'authenticated' : 'unauthenticated',
        error: null,
      });
    });

    set({ _initialized: true, _authSubscription: listener.subscription });
  },

  loginWithEmailPassword: async (email, password) => {
    set({ status: 'loading', error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ status: 'unauthenticated', error: error.message });
      return;
    }
    set({
      user: data.user ?? null,
      session: data.session ?? null,
      status: 'authenticated',
      error: null,
    });
  },

  loginWithOtp: async (email) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Allow magic link only for users that already exist in Supabase auth.
    // No new users will be created because shouldCreateUser is false.
    set({ status: 'loading', error: null });
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: false,
      },
    });
    if (error) {
      set({ status: 'unauthenticated', error: error.message });
      return;
    }
    set({ status: 'unauthenticated', error: null });
  },

  sendPasswordReset: async (email) => {
    set({ status: 'loading', error: null });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    if (error) {
      set({ status: 'unauthenticated', error: error.message });
      return;
    }
    set({ status: 'unauthenticated', error: null });
  },

  logout: async () => {
    set({ status: 'loading', error: null });
    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ status: 'authenticated', error: error.message });
      return;
    }
    set({ user: null, session: null, status: 'unauthenticated', error: null });
  },
}));
