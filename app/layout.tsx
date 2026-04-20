import type { Metadata } from 'next';

import { AppToaster } from '@/components/ui/toaster';

import './globals.css';

export const metadata: Metadata = {
  title: 'TrustScaffold',
  description: 'Open-source compliance automation platform — starting with SOC 2. Self-hostable, multi-tenant, and auditor-ready.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
