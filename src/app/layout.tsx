import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
import { AuthGate } from '@/components/auth/auth-gate';
import { Sidebar } from '@/components/layout/sidebar';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { MobileSidebarProvider } from '@/components/layout/mobile-sidebar-context';
import { KeyboardShortcutsProvider } from '@/components/layout/keyboard-shortcuts-provider';
import { ThemePaletteProvider } from '@/components/theme-palette-provider';
import { LayoutContent } from '@/components/layout/layout-content';
import { Toaster } from '@/components/ui/sonner';
export const metadata: Metadata = {
  title: {
    default: 'Jamie OS',
    template: '%s · Jamie OS',
  },
  description: 'Task-first personal command center',
  openGraph: {
    title: 'Jamie OS',
    description: 'Task-first personal command center',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="dns-prefetch" href="https://mvqdrzlzviofizostibh.supabase.co" />
        <link rel="preconnect" href="https://mvqdrzlzviofizostibh.supabase.co" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.classList.add(localStorage.getItem('theme')||'dark')}catch(e){}` }} />
        <script dangerouslySetInnerHTML={{ __html: `try{if(['/login','/reset-password','/auth','/auth/reset'].includes(window.location.pathname)){document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light'}}catch(e){}` }} />
        <script dangerouslySetInnerHTML={{ __html: `
          // Auto-refresh on stale chunk errors (happens after deploys)
          window.addEventListener('error', function(e) {
            if (e.message && (e.message.includes('Loading chunk') || e.message.includes('Failed to fetch dynamically imported module') || e.message.includes('Importing a module script failed'))) {
              var key = 'chunk_reload_' + window.location.pathname;
              if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, '1');
                window.location.reload();
              }
            }
          });
          window.addEventListener('unhandledrejection', function(e) {
            if (e.reason && e.reason.message && (e.reason.message.includes('Loading chunk') || e.reason.message.includes('Failed to fetch dynamically imported module'))) {
              var key = 'chunk_reload_' + window.location.pathname;
              if (!sessionStorage.getItem(key)) {
                sessionStorage.setItem(key, '1');
                window.location.reload();
              }
            }
          });
        ` }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ThemePaletteProvider>
          <MobileSidebarProvider>
            <KeyboardShortcutsProvider>
              <AuthGate>
                <div className="flex h-screen overflow-hidden">
                  <Sidebar />
                  <LayoutContent>{children}</LayoutContent>
                </div>
              </AuthGate>
            </KeyboardShortcutsProvider>
          </MobileSidebarProvider>
          </ThemePaletteProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
