'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { authUserSchema, updateMemberProfileSchema } from '@heritage/shared-types';
import { ActionButton } from '@/components/ui/action-button';
import { Field, TextInput } from '@/components/ui/text-field';
import { memberFetch, memberFetchVoid } from '@/lib/member-api';
import type { AuthUser } from '@heritage/shared-types';

type MemberProfileFormProps = {
  user: AuthUser;
  labels: {
    name: string;
    email: string;
    phone: string;
    password: string;
    passwordHint: string;
    contactHint: string;
    submit: string;
    saved: string;
    error: string;
    logout: string;
  };
};

export function MemberProfileForm({ user, labels }: MemberProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const input = updateMemberProfileSchema.parse({
        displayName,
        email,
        phone,
        password,
      });
      await memberFetch('/auth/me', authUserSchema, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
      setPassword('');
      setMessage(labels.saved);
      router.refresh();
    } catch {
      setError(labels.error);
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    await memberFetchVoid('/auth/logout', { method: 'POST' });
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="rounded-card border border-brown-800/15 bg-white px-5 py-6 md:px-6">
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        <Field label={labels.name}>
          <TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </Field>
        <Field label={labels.email} hint={labels.contactHint}>
          <TextInput
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            dir="ltr"
          />
        </Field>
        <Field label={labels.phone}>
          <TextInput
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            dir="ltr"
          />
        </Field>
        <Field label={labels.password} hint={labels.passwordHint}>
          <TextInput
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            dir="ltr"
          />
        </Field>
        {message ? <p className="text-[15px] text-teal-700">{message}</p> : null}
        {error ? <p className="text-[15px] text-[#B44B3D]">{error}</p> : null}
        <div className="flex flex-wrap gap-2 pt-2">
          <ActionButton type="submit" disabled={pending}>
            {labels.submit}
          </ActionButton>
          <ActionButton type="button" variant="secondary" disabled={pending} onClick={() => void logout()}>
            {labels.logout}
          </ActionButton>
        </div>
      </form>
    </div>
  );
}
