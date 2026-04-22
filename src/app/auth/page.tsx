'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const resetKey = email.trim().toLowerCase() ? `jamieos_reset_${email.trim().toLowerCase()}` : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Signed in');
      router.replace('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Auth failed');
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async () => {
    if (!email.trim()) {
      toast.error('Enter your email first');
      return;
    }

    if (typeof window !== 'undefined' && resetKey) {
      const lastSent = Number(window.localStorage.getItem(resetKey) || '0');
      const elapsed = Date.now() - lastSent;
      const cooldownMs = 15 * 60 * 1000;
      if (lastSent && elapsed < cooldownMs) {
        const mins = Math.ceil((cooldownMs - elapsed) / 60000);
        toast.error(`Password reset already sent recently. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
        return;
      }
    }

    setResetLoading(true);
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/auth/reset`,
      });
      if (error) throw error;
      if (typeof window !== 'undefined' && resetKey) {
        window.localStorage.setItem(resetKey, String(Date.now()));
      }
      toast.success('Password reset email sent');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      if (/rate limit|too many|exceeded/i.test(message)) {
        toast.error('Password reset email rate limit hit. Please wait a bit before trying again.');
      } else {
        toast.error(message);
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-5 border-border/20 bg-card/90 backdrop-blur shadow-sm">
        <div className="mb-2">
          <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-2">JAMIE OS</div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        </div>

        <form className="space-y-3.5" onSubmit={submit}>
          <div className="space-y-2">
            <label className="text-[13px] text-muted-foreground">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" required />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] text-muted-foreground">Password</label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" required />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
          <div className="flex items-center justify-between gap-3 text-[12px] text-muted-foreground pt-1">
            <button type="button" onClick={sendReset} disabled={resetLoading} className="hover:text-foreground transition-colors">
              {resetLoading ? 'Sending reset…' : 'Forgot password?'}
            </button>
            <span>Contact an administrator for access.</span>
          </div>
        </form>
      </Card>
    </div>
  );
}
