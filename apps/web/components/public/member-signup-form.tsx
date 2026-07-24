'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { authUserSchema, registerSchema } from '@heritage/shared-types';
import { ActionButton } from '@/components/ui/action-button';
import { Field, TextInput } from '@/components/ui/text-field';
import { memberFetch } from '@/lib/member-api';

type MemberSignupFormProps = {
  labels: {
    name: string;
    email: string;
    phone: string;
    password: string;
    contactHint: string;
    submit: string;
    error: string;
  };
  redirectTo?: string;
};

export function MemberSignupForm({ labels, redirectTo = '/' }: MemberSignupFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const input = registerSchema.parse({
        displayName,
        password,
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      await memberFetch('/auth/register', authUserSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError(labels.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mx-auto w-full max-w-md space-y-4">
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
      <Field label={labels.password}>
        <TextInput
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          dir="ltr"
        />
      </Field>
      {error ? <p className="text-[15px] text-[#B44B3D]">{error}</p> : null}
      <ActionButton type="submit" disabled={pending} className="w-full">
        {labels.submit}
      </ActionButton>
    </form>
  );
}
