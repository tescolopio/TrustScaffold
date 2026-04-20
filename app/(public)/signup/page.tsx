import Link from 'next/link';

import { signupAction } from '@/app/(public)/signup/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = (await searchParams) ?? {};

  return (
    <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create your workspace</CardTitle>
          <CardDescription>
            A successful signup triggers the database bootstrap path that creates the organization and your initial admin membership.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {params.error ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{params.error}</p> : null}
          <form action={signupAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization_name">Organization name</Label>
              <Input id="organization_name" name="organization_name" placeholder="Acme Compliance" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
            </div>
            <Button type="submit" className="w-full">Create account</Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Already have access?{' '}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Login
            </Link>
            .
          </p>
        </CardContent>
      </Card>
      <section className="rounded-[2rem] border border-white/60 bg-white/70 p-10 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">Phase 2 MVP</p>
        <h1 className="mt-6 max-w-lg text-5xl font-semibold leading-tight text-foreground">Start with a secure organization boundary.</h1>
        <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
          <li>Every signup creates an organization automatically through the validated auth trigger.</li>
          <li>The protected dashboard resolves your organization and role server-side before rendering.</li>
          <li>Middleware refreshes cookies and blocks direct access to private routes when no session exists.</li>
        </ul>
      </section>
    </div>
  );
}
