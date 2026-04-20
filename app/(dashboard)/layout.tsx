import { redirect } from 'next/navigation';

import { DashboardHeader } from '@/components/layout/dashboard-header';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { OrgProvider } from '@/components/providers/org-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardContext } from '@/lib/auth/get-dashboard-context';

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await getDashboardContext();

  if (!context) {
    redirect('/login');
  }

  if (!context.organization) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Organization unavailable</CardTitle>
            <CardDescription>
              Your account is authenticated, but no organization membership was found. This usually means the bootstrap trigger failed or the membership was removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Contact support or run a manual organization initialization before continuing.</p>
            <p>User: {context.email ?? context.userId}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <OrgProvider value={context}>
      <main className="flex min-h-screen">
        <DashboardSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <DashboardHeader />
          <section className="flex-1 px-4 py-6 sm:px-8">{children}</section>
        </div>
      </main>
    </OrgProvider>
  );
}
