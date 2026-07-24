'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { authUserSchema, loginSchema } from '@heritage/shared-types';
import { ActionButton } from '@/components/ui/action-button';
import { Field, TextInput } from '@/components/ui/text-field';
import { memberFetch } from '@/lib/member-api';

type MemberLoginFormProps = {
  labels: {
    identifier: string;
    password: string;
    submit: string;
    error: string;
  };
  redirectTo?: string;
};

export function MemberLoginForm({ labels, redirectTo = '/' }: MemberLoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const input = loginSchema.parse({ identifier, password });
      const user = await memberFetch('/auth/login', authUserSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (user.role !== 'MEMBER') {
        setError(labels.error);
        return;
      }
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
      <Field label={labels.identifier}>
        <TextInput
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          autoComplete="username"
          dir="ltr"
        />
      </Field>
      <Field label={labels.password}>
        <TextInput
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
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
