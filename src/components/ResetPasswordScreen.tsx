import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { syncPendingInvitationForUser } from '@/lib/invitations';

export function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [sessionLoading, setSessionLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const invitationSyncUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrateSession = async () => {
      setSessionLoading(true);
      setError(null);

      // Support PKCE flow (redirects back with ?code=...)
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.warn('Could not exchange auth code for session:', exchangeError.message);
        } else {
          // Remove the code from the URL to avoid re-exchanging on refresh.
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionError) {
        setHasSession(false);
        setSessionLoading(false);
        setError(sessionError.message || 'Could not load session.');
        return;
      }

      const session = data.session;
      setHasSession(!!session);
      setSessionLoading(false);

      // Best-effort: if the user came from an invitation, sync role/metadata and mark invite accepted.
      if (session?.user && invitationSyncUserIdRef.current !== session.user.id) {
        invitationSyncUserIdRef.current = session.user.id;
        void syncPendingInvitationForUser(session.user);
      }
    };

    void hydrateSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      setError(error.message || 'Could not update password.');
      return;
    }

    setSuccess(true);
  };

  const handleGoToLogin = async () => {
    // Optional but helpful: log out so the user can sign in with their new password immediately.
    await supabase.auth.signOut();
    window.location.href = window.location.origin;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-lg border border-border">
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Set your password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Create a password for your GRIP account. After this, you can sign in using email + password.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {sessionLoading ? (
          <p className="text-sm text-muted-foreground">Preparing secure session…</p>
        ) : !hasSession ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              This link is invalid or expired. Please request a new invitation or password reset link.
            </p>
            <Button className="w-full" onClick={handleGoToLogin}>
              Go to login
            </Button>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Your password has been updated successfully. You can now sign in with your email and password.
            </p>
            <Button className="w-full" onClick={handleGoToLogin}>
              Go to login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-background"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-background"
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating password...' : 'Update password'}
            </Button>

            <p className="text-xs text-muted-foreground">
              If this link is invalid or expired, request a new invite or use the “Forgot password” option.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
