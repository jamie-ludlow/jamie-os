import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'jamie-os',
  description: 'Task-first, premium command center',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full bg-[var(--color-bg-canvas)] text-[var(--color-fg-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
