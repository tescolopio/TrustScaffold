import type { Metadata } from 'next';

import { THEME_STORAGE_KEY, ThemeProvider } from '@/components/providers/theme-provider';
import { AppToaster } from '@/components/ui/toaster';

import './globals.css';

export const metadata: Metadata = {
  title: 'TrustScaffold',
  description: 'Open-source compliance automation platform — starting with SOC 2. Self-hostable, multi-tenant, and auditor-ready.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var storedTheme=window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var theme=storedTheme==='dark'||storedTheme==='light'?storedTheme:'light';var root=document.documentElement;root.classList.toggle('dark',theme==='dark');root.style.colorScheme=theme;}catch(e){document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
