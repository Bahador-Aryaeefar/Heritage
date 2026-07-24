'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminUserSchema,
  createUserSchema,
  paginatedResponseSchema,
  updateUserPasswordSchema,
  updateUserSchema,
  type AdminUser,
} from '@heritage/shared-types';
import { ActionButton } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { Field, TextInput } from '@/components/ui/text-field';
import { ListPagination } from '@/components/admin/list-pagination';
import { adminFetch, adminFetchVoid } from '@/lib/admin-api';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const usersSchema = paginatedResponseSchema(adminUserSchema);
const PAGE_SIZE = 10;

/** Parent defines tracks once; header + rows use `subgrid` so columns stay locked. */
const USERS_TABLE_COLS =
  'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_max-content_max-content_max-content] gap-x-4';
const USERS_ROW = 'col-span-5 grid grid-cols-subgrid items-center';

type UsersPanelProps = {
  currentUserId: string;
  labels: {
    phone: string;
    password: string;
    role: string;
    displayName: string;
    active: string;
    inactive: string;
    create: string;
    save: string;
    resetPassword: string;
    admin: string;
    superAdmin: string;
    edit: string;
    delete: string;
    deleteConfirm: string;
    deleteFailed: string;
    cancel: string;
    editUser: string;
    usersList: string;
    loading: string;
    empty: string;
    search: string;
    first: string;
    previous: string;
    next: string;
    last: string;
    createFailed: string;
    saveFailed: string;
    passwordFailed: string;
    actions: string;
  };
};

type RoleOption = { value: string; label: string };

export function UsersPanel({ currentUserId, labels }: UsersPanelProps) {
  const queryClient = useQueryClient();
  const [listError, setListError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      return adminFetch(`/admin/users?${params}`, usersSchema);
    },
  });

  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetchVoid(`/admin/users/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      setListError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => setListError(labels.deleteFailed),
  });

  const roleOptions: RoleOption[] = [
    { value: 'ADMIN', label: labels.admin },
    { value: 'SUPER_ADMIN', label: labels.superAdmin },
  ];

  const users = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[clamp(22px,2.4vw,30px)] font-black text-brown-950">
          {labels.usersList}
        </h1>
        <ActionButton type="button" onClick={() => setCreating(true)}>
          {labels.create}
        </ActionButton>
      </section>

      <TextInput
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder={labels.search}
        aria-label={labels.search}
      />

      {listError ? <p className="text-[15px] text-[#B44B3D]">{listError}</p> : null}

      <section className="overflow-hidden rounded-card border border-brown-800/15 bg-white">
        {isLoading ? (
          <p className="px-5 py-8 text-[15px] text-brown-600">{labels.loading}</p>
        ) : null}

        {!isLoading && users.length === 0 ? (
          <p className="px-5 py-8 text-[15px] text-brown-600">{labels.empty}</p>
        ) : null}

        {!isLoading && users.length > 0 ? (
          <div className="overflow-x-auto">
            <div
              className={`${USERS_TABLE_COLS} min-w-[42rem] px-5`}
              role="table"
              aria-label={labels.usersList}
            >
              <div
                role="row"
                className={`${USERS_ROW} border-b border-brown-800/10 py-3 text-xs font-bold tracking-wide text-brown-600`}
              >
                <div role="columnheader" className="min-w-0 truncate">
                  {labels.displayName}
                </div>
                <div role="columnheader" className="min-w-0 truncate">
                  {labels.phone}
                </div>
                <div role="columnheader">{labels.role}</div>
                <div role="columnheader">{labels.active}</div>
                <div role="columnheader" className="justify-self-end">
                  <span className="sr-only">{labels.actions}</span>
                </div>
              </div>

              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <div
                    key={user.id}
                    role="row"
                    className={`${USERS_ROW} border-b border-brown-800/10 py-3.5 last:border-b-0`}
                  >
                    <div role="cell" className="min-w-0 truncate text-[15px] font-bold text-brown-950">
                      {user.displayName?.trim() || '-'}
                    </div>
                    <div role="cell" className="min-w-0 truncate text-[13px] text-brown-600">
                      <span dir="ltr">{user.phone ?? user.email ?? '-'}</span>
                    </div>
                    <div role="cell">
                      <Badge>
                        {user.role === 'SUPER_ADMIN' ? labels.superAdmin : labels.admin}
                      </Badge>
                    </div>
                    <div role="cell">
                      <Badge tone={user.isActive ? 'default' : 'muted'}>
                        {user.isActive ? labels.active : labels.inactive}
                      </Badge>
                    </div>
                    <div role="cell" className="flex flex-wrap justify-end gap-2">
                      <ActionButton
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingUser(user)}
                      >
                        {labels.edit}
                      </ActionButton>
                      <ActionButton
                        type="button"
                        variant="ghost"
                        disabled={isSelf || deleteMutation.isPending}
                        onClick={() => {
                          if (isSelf) return;
                          if (!window.confirm(labels.deleteConfirm)) return;
                          deleteMutation.mutate(user.id);
                        }}
                      >
                        {labels.delete}
                      </ActionButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {meta ? (
        <ListPagination
          meta={meta}
          onPageChange={setPage}
          labels={{
            first: labels.first,
            previous: labels.previous,
            next: labels.next,
            last: labels.last,
          }}
        />
      ) : null}

      {creating ? (
        <UserCreateDialog
          labels={labels}
          roleOptions={roleOptions}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {editingUser ? (
        <UserEditDialog
          user={editingUser}
          labels={labels}
          roleOptions={roleOptions}
          onClose={() => setEditingUser(null)}
        />
      ) : null}
    </div>
  );
}

function DialogShell({
  titleId,
  title,
  subtitle,
  onClose,
  cancelLabel,
  children,
}: {
  titleId: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  cancelLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-brown-950/45 p-4 backdrop-blur-[2px] sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-container border border-brown-800/10 bg-sand-100 p-6 shadow-[0_16px_48px_rgba(42,29,20,0.22)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-black text-brown-950">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 truncate text-[13px] text-brown-600" dir="ltr">
                {subtitle}
              </p>
            ) : null}
          </div>
          <ActionButton type="button" variant="ghost" onClick={onClose}>
            {cancelLabel}
          </ActionButton>
        </div>
        {children}
      </div>
    </div>
  );
}

function UserCreateDialog({
  labels,
  roleOptions,
  onClose,
}: {
  labels: UsersPanelProps['labels'];
  roleOptions: RoleOption[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      adminFetch('/admin/users', adminUserSchema, {
        method: 'POST',
        body: JSON.stringify(
          createUserSchema.parse({
            phone,
            password,
            role,
            displayName: displayName || undefined,
          }),
        ),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      onClose();
    },
    onError: () => setError(labels.createFailed),
  });

  return (
    <DialogShell
      titleId="create-user-title"
      title={labels.create}
      onClose={onClose}
      cancelLabel={labels.cancel}
    >
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label={labels.phone}>
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
        </Field>
        <Field label={labels.password}>
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
          />
        </Field>
        <Field label={labels.displayName}>
          <TextInput value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <Field label={labels.role}>
          <Select
            value={role}
            onChange={(value) => setRole(value as 'ADMIN' | 'SUPER_ADMIN')}
            options={roleOptions}
          />
        </Field>
      </div>

      {error ? <p className="mt-3 text-[15px] text-[#B44B3D]">{error}</p> : null}

      <div className="mt-6">
        <ActionButton
          type="button"
          disabled={createMutation.isPending}
          onClick={() => {
            setError(null);
            createMutation.mutate();
          }}
        >
          {labels.create}
        </ActionButton>
      </div>
    </DialogShell>
  );
}

function UserEditDialog({
  user,
  labels,
  roleOptions,
  onClose,
}: {
  user: AdminUser;
  labels: UsersPanelProps['labels'];
  roleOptions: RoleOption[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: () =>
      adminFetch(`/admin/users/${user.id}`, adminUserSchema, {
        method: 'PATCH',
        body: JSON.stringify(updateUserSchema.parse({ displayName, role, isActive })),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      onClose();
    },
    onError: () => setError(labels.saveFailed),
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      adminFetchVoid(`/admin/users/${user.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify(updateUserPasswordSchema.parse({ password: newPassword })),
      }),
    onSuccess: () => setNewPassword(''),
    onError: () => setError(labels.passwordFailed),
  });

  return (
    <DialogShell
      titleId="edit-user-title"
      title={labels.editUser}
      subtitle={user.phone ?? user.email ?? '-'}
      onClose={onClose}
      cancelLabel={labels.cancel}
    >
      <div className="mt-5 space-y-4">
        <Field label={labels.displayName}>
          <TextInput value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <Field label={labels.role}>
          <Select
            value={role}
            onChange={(value) => setRole(value as AdminUser['role'])}
            options={roleOptions}
          />
        </Field>
        <Checkbox checked={isActive} onChange={setIsActive} label={labels.active} />
        <Field label={labels.password}>
          <TextInput
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            dir="ltr"
          />
        </Field>
      </div>

      {error ? <p className="mt-3 text-[15px] text-[#B44B3D]">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <ActionButton
          type="button"
          disabled={updateMutation.isPending}
          onClick={() => {
            setError(null);
            updateMutation.mutate();
          }}
        >
          {labels.save}
        </ActionButton>
        <ActionButton
          type="button"
          variant="secondary"
          disabled={!newPassword || passwordMutation.isPending}
          onClick={() => {
            setError(null);
            passwordMutation.mutate();
          }}
        >
          {labels.resetPassword}
        </ActionButton>
      </div>
    </DialogShell>
  );
}
