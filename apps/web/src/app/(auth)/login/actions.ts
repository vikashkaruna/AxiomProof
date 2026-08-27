'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@axiom/supabase';
import { createSupabaseAdmin } from '@axiom/supabase';

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirect') ?? '/workbench');

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent('Email and password are required.')}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    const admin = createSupabaseAdmin();
    const { data: membership } = await admin
      .from('tenant_users')
      .select('id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (!membership) {
      const { data: defaultTenant } = await admin
        .from('tenants')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (defaultTenant) {
        await admin.from('tenant_users').insert({
          tenant_id: defaultTenant.id,
          user_id: data.user.id,
          role: 'owner',
        });
      }
    }
  }

  revalidatePath('/', 'layout');
  redirect(redirectTo);
}

export async function signupAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();

  if (!email || !password) {
    redirect(`/login?mode=signup&error=${encodeURIComponent('Email and password are required.')}`);
  }
  if (password.length < 12) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent('Password must be at least 12 characters.')}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/login`,
    },
  });

  if (error) {
    redirect(`/login?mode=signup&error=${encodeURIComponent(error.message)}`);
  }

  // Mirror to public.users and ensure membership in default tenant
  if (data.user) {
    const admin = createSupabaseAdmin();
    await admin.from('users').upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      is_axiom_internal: false,
    });

    const { data: membership } = await admin
      .from('tenant_users')
      .select('id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (!membership) {
      const { data: defaultTenant } = await admin
        .from('tenants')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (defaultTenant) {
        await admin.from('tenant_users').insert({
          tenant_id: defaultTenant.id,
          user_id: data.user.id,
          role: 'owner',
        });
      }
    }
  }

  revalidatePath('/', 'layout');

  if (data.session) {
    redirect('/workbench');
  }

  redirect(
    `/login?message=${encodeURIComponent(
      'Account created successfully. Please sign in with your credentials.',
    )}`,
  );
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
