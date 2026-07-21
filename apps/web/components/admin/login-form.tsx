'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { authUserSchema, loginSchema } from '@heritage/shared-types';
import { ActionButton } from '@/components/ui/action-button';
import { Field, TextInput } from '@/components/ui/text-field';
import { adminFetch } from '@/lib/admin-api';

type LoginFormProps = {
  labels: {
    phone: string;
    password: string;
    submit: string;
    error: string;
  };
};

export function LoginForm({ labels }: LoginFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const input = loginSchema.parse({ phone, password });
      await adminFetch('/auth/login', authUserSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      router.replace('/admin/sites');
      router.refresh();
    } catch {
      setError(labels.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mx-auto w-full max-w-md space-y-4">
      <Field label={labels.phone}>
        <TextInput
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
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
