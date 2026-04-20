import { redirect } from 'next/navigation';

import { getDashboardContext } from '@/lib/auth/get-dashboard-context';

export default async function HomePage() {
  const context = await getDashboardContext();

  redirect(context ? '/dashboard' : '/login');
}
