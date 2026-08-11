import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@axiom/supabase';
import { BRAND } from '@axiom/config';
import { Button, Card, Input, Label } from '@axiom/ui';
import { loginAction, signupAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { mode?: 'signup' | 'login'; error?: string; redirect?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(searchParams.redirect || '/workbench');
  }

  const isSignup = searchParams.mode === 'signup';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mist-100 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="font-heading text-xl font-semibold text-indigo-500">
          {BRAND.name}
        </span>
      </Link>

      <Card className="w-full max-w-md">
        <div className="p-6">
          <h1 className="font-heading text-2xl font-semibold text-indigo-500">
            {isSignup ? 'Create your account' : 'Sign in'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isSignup
              ? 'Welcome to Axiom Proof. Set up your founder / partner access.'
              : 'Welcome back. Sign in to continue.'}
          </p>

          {searchParams.error && (
            <div className="mt-4 rounded-md border border-ember-500 bg-ember-50 p-3 text-sm text-ember-700">
              {searchParams.error}
            </div>
          )}

          <form action={isSignup ? signupAction : loginAction} className="mt-6 flex flex-col gap-4">
            {isSignup && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="full_name" required>Full name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Vikash Karuna"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" required>Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" required>Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={12}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder="At least 12 characters"
              />
            </div>
            <Button type="submit" variant="primary" fullWidth size="lg">
              {isSignup ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Link
              href={isSignup ? '/login' : '/login?mode=signup'}
              className="font-medium text-teal-600 hover:underline"
            >
              {isSignup ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
        </div>
      </Card>

      <p className="mt-6 max-w-md text-center text-xs text-slate-500">
        By signing in you agree to our{' '}
        <Link href="https://axiomminds.ai/terms" className="underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="https://axiomminds.ai/privacy" className="underline">
          Privacy Policy
        </Link>
        . Data residency: {BRAND.dataResidencyRegion}.
      </p>
    </div>
  );
}
