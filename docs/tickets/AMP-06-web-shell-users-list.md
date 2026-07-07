# AMP-6: Web shell + users list (search, filter, pagination)

| Field | Value |
|---|---|
| Type | Story |
| Epic | [AMP CSR Portal](../epic-csr-portal.md) |
| Priority | High |
| Story Points | 5 |
| Depends on | AMP-4 (users API) |
| Blocks | AMP-7 |

## Description

Stand up the frontend foundation — MUI theming for the App Router, React Query, a typed API client — and build the first screen: the users list with server-side pagination/sorting, debounced search across name/email/phone/plate, a status filter, and URL-persisted state.

## Scope

**In scope**
- Root layout: `AppRouterCacheProvider`, client `providers.tsx` (theme + `CssBaseline` + `QueryClientProvider` + snackbar context), AppBar shell ("AMP CSR Portal").
- `src/lib/api-client.ts` typed fetch wrapper.
- `/users` page: `UsersTable` (MUI DataGrid, server mode) + `UserSearchBar` (debounced search + status Select).
- Hooks: `useUsers`, `useDebouncedValue`.
- `/` redirects to `/users`.

**Out of scope**
- User detail page (AMP-7). Mutations (AMP-7/8).

## Acceptance Criteria

- [ ] `/` redirects to `/users`; AppBar shows the portal name on every page.
- [ ] Typing in search narrows results after ~300 ms without a request per keystroke; searching a license plate fragment finds the owning user.
- [ ] Status filter (All / Active / Overdue / Cancelled) combines with search.
- [ ] Columns: Name, Email, Phone, Status (colored chip), Active subs count, Joined date. Sorting by name/joined/status hits the API (`sortingMode="server"`).
- [ ] Pagination is server-side; page size selector 10/25/50; total row count correct.
- [ ] Search/filter/page/sort state round-trips through the URL — refresh and back-button preserve it; the URL is shareable.
- [ ] Row click navigates to `/users/[id]` (page may 404 until AMP-7 — that's fine).
- [ ] Loading and error states visible (DataGrid `loading` prop; error → MUI Alert with retry).

## Tech Notes / Implementation Guide

**MUI + Next App Router wiring (verified versions: @mui/material 9.x, adapter subpath `v16-appRouter`):**

```tsx
// src/app/layout.tsx (server component)
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
// wrap: <AppRouterCacheProvider><Providers>{children}</Providers></AppRouterCacheProvider>
```

```tsx
// src/app/providers.tsx  ('use client')
// ThemeProvider(theme) + CssBaseline + QueryClientProvider(new QueryClient in useState)
// + a simple SnackbarProvider built on MUI <Snackbar>/<Alert> exposed via context hook useSnackbar()
```

Create the `QueryClient` inside `useState(() => new QueryClient(...))` — never at module scope (leaks between SSR requests). Sensible defaults: `staleTime: 30_000, retry: 1, refetchOnWindowFocus: false`.

Theme: `createTheme({ palette: { primary: { main: '#0B63C5' } } })` (car-wash blue) — keep it minimal.

**API client (`src/lib/api-client.ts`):**

```ts
export class ApiError extends Error {
  constructor(message: string, public status: number, public code: string,
              public fieldErrors?: Record<string, string>) { super(message); }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(err?.message ?? 'Request failed', res.status, err?.code ?? 'UNKNOWN', err?.fieldErrors);
  }
  return body.data as T;
}
```

**URL state pattern (`/users/page.tsx`):** the page is a client component reading `useSearchParams()`; parse with the same `userListQuerySchema` from `src/lib/schemas` (safeParse; fall back to defaults). Update state with `router.replace(\`/users?\${qs}\`, { scroll: false })` — replace, not push, for keystrokes; push for page changes is optional. Wrap the component using `useSearchParams` in `<Suspense>` (Next requires it during prerender — otherwise build fails).

**Debounce:** `useDebouncedValue(value, 300)` — debounce the *search text input* → write the debounced value into the URL; the query key derives from URL params, so the fetch naturally follows. Keep the raw input in local state so typing feels instant.

**useUsers hook:**

```ts
const { data, isFetching } = useQuery({
  queryKey: ['users', params],           // params = parsed URL object
  queryFn: () => api<UserListResult>(`/api/users?${toQueryString(params)}`),
  placeholderData: keepPreviousData,     // from '@tanstack/react-query'
});
```

**DataGrid server mode (@mui/x-data-grid v9):**

```tsx
<DataGrid
  rows={data?.items ?? []}
  rowCount={data?.total ?? 0}
  loading={isFetching}
  paginationMode="server"
  sortingMode="server"
  paginationModel={{ page: params.page - 1, pageSize: params.pageSize }}  // DataGrid is 0-based; API is 1-based
  onPaginationModelChange={(m) => setUrl({ page: m.page + 1, pageSize: m.pageSize })}
  onSortModelChange={(m) => setUrl({ sort: m[0] ? `${m[0].field}:${m[0].sort}` : undefined })}
  onRowClick={(p) => router.push(`/users/${p.id}`)}
  pageSizeOptions={[10, 25, 50]}
  disableColumnFilter
  disableRowSelectionOnClick
/>
```

**StatusChip (`src/components/common/StatusChip.tsx`)** — build it here (AMP-7/8 reuse it): map `ACTIVE→success`, `OVERDUE→warning`, `CANCELLED→default`, `PAUSED→info`, `PAID→success`, `FAILED→error`, `REFUNDED→default` → `<Chip size="small" color={...} label={...}/>`. One component, one mapping table.

**Placeholder page cleanup:** `src/app/page.tsx` → `import { redirect } from 'next/navigation'; export default function Home() { redirect('/users'); }`.

## Definition of Done

All ACs demoed in the browser against seeded data; lint/typecheck/build green; committed as `feat: web shell and users list with search, filters, and URL state`.
