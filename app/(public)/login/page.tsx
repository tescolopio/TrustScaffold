import Link from 'next/link';

import { loginAction, loginWithGithubAction } from '@/app/(public)/login/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; next?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const nextPath = params.next ?? '/dashboard';

  return (
    <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden rounded-[2rem] border border-white/60 bg-page-grid bg-grid bg-[size:24px_24px] p-10 lg:block">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">TrustScaffold</p>
        <h1 className="mt-6 max-w-lg text-5xl font-semibold leading-tight text-foreground">
          Secure-by-default policy generation for early-stage compliance teams.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Sign in to continue into your organization workspace, review generated artifacts, and prepare the 7-stage compliance wizard.
        </p>
      </section>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Authenticate with Supabase Auth and land in your protected organization dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {params.error ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{params.error}</p> : null}
          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
          <form action={loginWithGithubAction}>
            <Button type="submit" variant="outline" className="w-full">Continue with GitHub</Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Need an account?{' '}
            <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Create one now
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
