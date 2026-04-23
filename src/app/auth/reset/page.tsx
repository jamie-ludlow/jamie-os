'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        setReady(false);
        return;
      }
      setReady(true);
    };
    check();
    return () => {
      mounted = false;
    };
  }, [router]);

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
      toast.success('Password updated');
      await supabase.auth.signOut();
      router.replace('/auth');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md p-6 border-border/20 bg-card/90 backdrop-blur text-center">
          <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Jamie OS</div>
          <h1 className="text-2xl font-semibold tracking-tight">Reset link unavailable</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            This password reset link is not active. Please request a fresh reset email from the sign-in page.
          </p>
          <Button className="mt-5 w-full" onClick={() => router.replace('/auth')}>
            Back to sign in
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md p-6 border-border/20 bg-card/90 backdrop-blur">
        <div className="mb-6">
          <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Jamie OS</div>
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            This page only works from a password reset email link.
          </p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <label className="text-[13px] text-muted-foreground">New password</label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="New password" required disabled={!ready} />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] text-muted-foreground">Confirm password</label>
            <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="Confirm password" required disabled={!ready} />
          </div>
          <Button className="w-full" type="submit" disabled={loading || !ready}>{loading ? 'Updating…' : 'Update password'}</Button>
        </form>
      </Card>
    </div>
  );
}
