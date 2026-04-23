'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type UserRow = {
  id: string;
  email: string | null;
  name: string;
  created_at: string;
  last_sign_in_at: string | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'create' | 'invite'>('create');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      const data = await res.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save user');
      toast.success(mode === 'invite' ? `Invited ${data.user.email}` : `Created ${data.user.name}`);
      setName('');
      setEmail('');
      setPassword('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async (targetEmail: string | null) => {
    if (!targetEmail) {
      toast.error('No email address for this user');
      return;
    }
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://jamie-os.vercel.app';
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${appUrl}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Reset email sent to ${targetEmail}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-[13px] text-muted-foreground">These are the Supabase Auth users that can be assigned to tasks.</p>
      </div>

      <Card className="p-5 border-border/20 bg-card/80">
        <h2 className="text-[14px] font-medium mb-4">Add users</h2>
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'create' | 'invite')} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4 w-full max-w-sm">
            <TabsTrigger value="create">Create user</TabsTrigger>
            <TabsTrigger value="invite">Invite user</TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <form className="grid gap-3 sm:grid-cols-4" onSubmit={submit}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" type="password" required />
              <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create user'}</Button>
            </form>
          </TabsContent>
          <TabsContent value="invite">
            <form className="grid gap-3 sm:grid-cols-3" onSubmit={submit}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
              <Button type="submit" disabled={saving}>{saving ? 'Inviting…' : 'Send invite'}</Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-5 border-border/20 bg-card/80">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-medium">Current users</h2>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>
        </div>
        <div className="divide-y divide-border/20 rounded-lg border border-border/20 overflow-hidden">
          {users.length === 0 ? (
            <div className="p-4 text-[13px] text-muted-foreground">No users found yet.</div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-[12px] text-muted-foreground">{user.email || 'No email'}</div>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <div className="text-right hidden sm:block">
                    <div>Last sign-in: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => sendReset(user.email)} disabled={!user.email}>
                    Reset password
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
