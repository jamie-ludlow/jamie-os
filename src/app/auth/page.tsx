'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('Jamie Ludlow');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const title = useMemo(() => (mode === 'signin' ? 'Sign in to Jamie OS' : 'Create a Jamie OS account'), [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Signed in');
        router.replace('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, name },
          },
        });
        if (error) throw error;
        toast.success('Account created');
        router.replace('/');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Auth failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md p-6 border-border/20 bg-card/90 backdrop-blur">
        <div className="mb-6">
          <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Jamie OS</div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Use your Jamie OS login to access tasks. Creating an account adds you to the assignee list.
          </p>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'signin' | 'signup')} className="w-full">
          <TabsList className="grid grid-cols-2 mb-5">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <label className="text-[13px] text-muted-foreground">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" required />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] text-muted-foreground">Password</label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" required />
              </div>
              <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <label className="text-[13px] text-muted-foreground">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] text-muted-foreground">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" required />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] text-muted-foreground">Password</label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" type="password" required />
              </div>
              <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
