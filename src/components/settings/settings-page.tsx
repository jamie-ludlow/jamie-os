'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronDown, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScheduleSection } from './schedule-section';
import { StatusesSection } from './statuses-section';

const STORAGE_KEY = 'mc-settings';

const timezones = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Singapore',
  'Asia/Tokyo',
];

const modelOptions = [
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
];

const accentOptions = ['#6366f1', '#22c55e', '#3b82f6', '#f97316', '#ef4444'];

const defaultSettings = {
  profile: {
    name: 'Jamie Ludlow',
    email: '',
    timezone: 'Europe/London',
    avatar: '', // Base64 image data or empty
  },
  appearance: {
    darkMode: true,
    accentColor: '#6366f1',
  },
  notifications: {
    email: true,
    browser: false,
    digest: true,
  },
  agents: {
    defaultModel: 'claude-opus-4-6',
    autoDeploy: true,
    tokenBudget: 50000,
  },
  integrations: {
    supabase: true,
    vercel: true,
    github: false,
  },
};

type SettingsState = typeof defaultSettings;

type TabId = 'profile' | 'appearance' | 'notifications' | 'agents' | 'integrations' | 'schedule' | 'statuses';

const TABS: { id: TabId; label: string }[] = [
  { id: 'profile', label: 'My Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'agents', label: 'Agents' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'statuses', label: 'Statuses' },
];

function TimezonePopover({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-9 px-3 text-[13px] bg-card border border-border/20 rounded-lg hover:bg-muted/40 transition-colors duration-150 flex items-center justify-between gap-2 w-full">
          <span className="truncate">{value}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/60 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search timezone..." className="h-8" />
          <CommandList>
            <CommandEmpty>No timezone found</CommandEmpty>
            <CommandGroup>
              {timezones.map((zone) => (
                <CommandItem
                  key={zone}
                  onSelect={() => {
                    onChange(zone);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === zone ? "opacity-100" : "opacity-0")} />
                  <span className="text-[13px]">{zone}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ModelPopover({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const currentLabel = modelOptions.find(m => m.value === value)?.label || value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-9 px-3 text-[13px] bg-card border border-border/20 rounded-lg hover:bg-muted/40 transition-colors duration-150 flex items-center justify-between gap-2 w-full">
          <span>{currentLabel}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-1" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {modelOptions.map((model) => (
                <CommandItem
                  key={model.value}
                  onSelect={() => {
                    onChange(model.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === model.value ? "opacity-100" : "opacity-0")} />
                  <span className="text-[13px]">{model.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<SettingsState>;
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          profile: { ...prev.profile, ...parsed.profile },
          appearance: { ...prev.appearance, ...parsed.appearance },
          notifications: { ...prev.notifications, ...parsed.notifications },
          agents: { ...prev.agents, ...parsed.agents },
          integrations: { ...prev.integrations, ...parsed.integrations },
        }));
      } catch {}
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Notify sidebar and other components
    window.dispatchEvent(new Event('settings-updated'));
  }, [hydrated, settings]);

  const accentPreviewStyle = useMemo(() => ({
    backgroundColor: settings.appearance.accentColor,
  }), [settings.appearance.accentColor]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for resize
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw resized image
        ctx.drawImage(img, 0, 0, 128, 128);

        // Convert to JPEG base64
        const base64 = canvas.toDataURL('image/jpeg', 0.8);

        // Update settings
        setSettings((prev) => ({
          ...prev,
          profile: { ...prev.profile, avatar: base64 },
        }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="text-foreground">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-[20px] font-bold tracking-tight">Settings</h1>
        <p className="text-[13px] text-muted-foreground max-w-2xl">
          Manage your preferences and configuration
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border/20 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors duration-150 ${
              activeTab === tab.id
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'profile' && (
          <div className="max-w-2xl space-y-6">
            <Card className="rounded-lg border border-border/20 bg-card p-5 shadow-none">
              <h2 className="text-[15px] font-semibold mb-4">Personal information</h2>
              
              <div className="space-y-4">
                {/* Avatar upload */}
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-[20px] font-bold text-primary-foreground shadow-lg shadow-primary/20 overflow-hidden hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                    >
                      {settings.profile.avatar ? (
                        <img
                          src={settings.profile.avatar}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{getInitials(settings.profile.name)}</span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[13px] font-medium">Profile photo</p>
                    <p className="text-[12px] text-muted-foreground/60">Click the avatar to upload a new photo. Images are resized to 128×128.</p>
                    {settings.profile.avatar && (
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, profile: { ...prev.profile, avatar: '' } }))}
                        className="text-[12px] text-destructive hover:text-destructive/80 transition-colors"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-[13px] text-muted-foreground">Name</Label>
                  <Input
                    id="name"
                    value={settings.profile.name}
                    onChange={(e) => setSettings((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, name: e.target.value },
                    }))}
                    className="h-9 bg-card border-border/20 text-[13px] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/50"
                  />
                </div>

                {/* Email */}
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-[13px] text-muted-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="optional"
                    value={settings.profile.email}
                    onChange={(e) => setSettings((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, email: e.target.value },
                    }))}
                    className="h-9 bg-card border-border/20 text-[13px] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/50"
                  />
                </div>

                {/* Timezone */}
                <div className="grid gap-2">
                  <Label htmlFor="timezone" className="text-[13px] text-muted-foreground">Timezone</Label>
                  <TimezonePopover
                    value={settings.profile.timezone}
                    onChange={(value) => setSettings((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, timezone: value },
                    }))}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/20 mt-6">
                <Button className="h-9 text-[13px] transition-colors duration-150">
                  Save changes
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="max-w-2xl space-y-6">
            <Card className="rounded-lg border border-border/20 bg-card p-5 shadow-none">
              <h2 className="text-[15px] font-semibold mb-4">Theme preferences</h2>
              
              <div className="space-y-4">
                {/* Dark mode */}
                <div className="flex items-center justify-between rounded-lg border border-border/20 bg-muted/40 px-4 py-3 hover:bg-muted/40 transition-colors duration-150">
                  <div>
                    <p className="text-[13px] font-medium">Dark mode</p>
                    <p className="text-[13px] text-muted-foreground/60">Dark theme is enforced for now</p>
                  </div>
                  <Switch checked={settings.appearance.darkMode} disabled />
                </div>

                {/* Accent colour */}
                <div className="grid gap-2">
                  <Label className="text-[13px] text-muted-foreground">Accent colour</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      value={settings.appearance.accentColor}
                      onChange={(e) => setSettings((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, accentColor: e.target.value },
                      }))}
                      className="h-9 w-14 cursor-pointer border-border/20 bg-card p-1 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/50"
                    />
                    <Input
                      value={settings.appearance.accentColor}
                      onChange={(e) => setSettings((prev) => ({
                        ...prev,
                        appearance: { ...prev.appearance, accentColor: e.target.value },
                      }))}
                      className="h-9 bg-card border-border/20 text-[13px] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/50"
                    />
                    <div className="h-9 w-9 rounded-full border border-border/20" style={accentPreviewStyle} />
                  </div>
                  <div className="flex items-center gap-2">
                    {accentOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSettings((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, accentColor: color },
                        }))}
                        className={cn(
                          'h-6 w-6 rounded-full border border-border/20 transition-all duration-150',
                          color === settings.appearance.accentColor ? 'ring-2 ring-primary/50' : 'hover:opacity-80'
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={`Set accent to ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="max-w-2xl space-y-6">
            <Card className="rounded-lg border border-border/20 bg-card p-5 shadow-none">
              <h2 className="text-[15px] font-semibold mb-4">Notification preferences</h2>
              
              <div className="space-y-3">
                <ToggleRow
                  title="Email notifications"
                  description="Weekly mission updates and task reminders"
                  checked={settings.notifications.email}
                  onCheckedChange={(value) => setSettings((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, email: value },
                  }))}
                />
                <ToggleRow
                  title="Browser notifications"
                  description="Real-time alerts for agent updates"
                  checked={settings.notifications.browser}
                  onCheckedChange={(value) => setSettings((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, browser: value },
                  }))}
                />
                <ToggleRow
                  title="Daily digest"
                  description="Summary email every morning"
                  checked={settings.notifications.digest}
                  onCheckedChange={(value) => setSettings((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, digest: value },
                  }))}
                />
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="max-w-2xl space-y-6">
            <Card className="rounded-lg border border-border/20 bg-card p-5 shadow-none">
              <h2 className="text-[15px] font-semibold mb-4">Agent configuration</h2>
              
              <div className="space-y-4">
                {/* Default model */}
                <div className="grid gap-2">
                  <Label className="text-[13px] text-muted-foreground">Default model</Label>
                  <ModelPopover
                    value={settings.agents.defaultModel}
                    onChange={(value) => setSettings((prev) => ({
                      ...prev,
                      agents: { ...prev.agents, defaultModel: value },
                    }))}
                  />
                </div>

                {/* Token budget */}
                <div className="grid gap-2">
                  <Label className="text-[13px] text-muted-foreground">Token budget limit</Label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={settings.agents.tokenBudget}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setSettings((prev) => ({
                        ...prev,
                        agents: { ...prev.agents, tokenBudget: Number(value) || 0 },
                      }));
                    }}
                    className="h-9 px-3 bg-card border border-border/20 rounded-lg text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  />
                  <p className="text-[13px] text-muted-foreground/60">Monthly cap for newly created agents.</p>
                </div>

                {/* Auto-deploy */}
                <ToggleRow
                  title="Auto-deploy"
                  description="Automatically deploy approved agents"
                  checked={settings.agents.autoDeploy}
                  onCheckedChange={(value) => setSettings((prev) => ({
                    ...prev,
                    agents: { ...prev.agents, autoDeploy: value },
                  }))}
                />
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="max-w-2xl space-y-6">
            <Card className="rounded-lg border border-border/20 bg-card p-5 shadow-none">
              <h2 className="text-[15px] font-semibold mb-4">Connected services</h2>
              
              <div className="grid gap-3">
                <IntegrationRow
                  name="Supabase"
                  status={settings.integrations.supabase ? 'Connected' : 'Disconnected'}
                  active={settings.integrations.supabase}
                  onToggle={() => setSettings((prev) => ({
                    ...prev,
                    integrations: { ...prev.integrations, supabase: !prev.integrations.supabase },
                  }))}
                />
                <IntegrationRow
                  name="Vercel"
                  status={settings.integrations.vercel ? 'Connected' : 'Disconnected'}
                  active={settings.integrations.vercel}
                  onToggle={() => setSettings((prev) => ({
                    ...prev,
                    integrations: { ...prev.integrations, vercel: !prev.integrations.vercel },
                  }))}
                />
                <IntegrationRow
                  name="GitHub"
                  status={settings.integrations.github ? 'Connected' : 'Disconnected'}
                  active={settings.integrations.github}
                  onToggle={() => setSettings((prev) => ({
                    ...prev,
                    integrations: { ...prev.integrations, github: !prev.integrations.github },
                  }))}
                />
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="max-w-2xl">
            <ScheduleSection />
          </div>
        )}

        {activeTab === 'statuses' && (
          <StatusesSection />
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  className,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between rounded-lg border border-border/20 bg-muted/40 px-4 py-3 hover:bg-muted/40 transition-colors duration-150',
      className
    )}>
      <div>
        <p className="text-[13px] font-medium">{title}</p>
        <p className="text-[13px] text-muted-foreground/60">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function IntegrationRow({
  name,
  status,
  active,
  onToggle,
}: {
  name: string;
  status: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/20 bg-muted/40 px-4 py-3 hover:bg-muted/40 transition-colors duration-150">
      <div className="flex items-center gap-3">
        <span className={cn('h-2 w-2 rounded-full', active ? 'bg-status-success' : 'bg-muted-foreground/60')} />
        <div>
          <p className="text-[13px] font-medium">{name}</p>
          <p className="text-[13px] text-muted-foreground/60">{status}</p>
        </div>
      </div>
      <Button variant="outline" className="h-9 border-border/20 text-[13px] transition-colors duration-150" onClick={onToggle}>
        {active ? 'Disconnect' : 'Connect'}
      </Button>
    </div>
  );
}
