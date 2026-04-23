'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      for (let i = 0; i < 10; i += 1) {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session) {
          setReady(true);
          setInvalid(false);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      if (mounted) {
        setReady(false);
        setInvalid(true);
      }
    };

    void init();

    return () => {
      mounted = false;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated. Please sign in again.');
      await supabase.auth.signOut();
      router.replace('/login');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (invalid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border border-border/20 bg-card p-6 text-center shadow-sm">
          <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-2">JAMIE OS</div>
          <h1 className="text-[16px] font-semibold text-foreground">Reset link unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This password reset link is not active anymore. Please request a fresh reset email from the sign-in page and open the newest email only.
          </p>
          <Button className="mt-5 w-full" onClick={() => router.replace('/login')}>
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border border-border/20 bg-card p-6 text-center shadow-sm">
          <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-2">JAMIE OS</div>
          <h1 className="text-[16px] font-semibold text-foreground">Resetting password…</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Waiting for your recovery session to load.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border/20 rounded-xl p-6 shadow-xl">
          <div className="mb-6 text-center">
            <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-2">JAMIE OS</div>
            <h1 className="text-[16px] font-semibold text-foreground">Reset password</h1>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Choose a new password for your Jamie OS account.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] text-muted-foreground">
                New password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="h-9 text-[13px] bg-secondary border-border/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[13px] text-muted-foreground">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="h-9 text-[13px] bg-secondary border-border/20"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-9 text-[13px] mt-2">
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
