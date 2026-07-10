import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

// Returns false during SSR and the first client render, then true once
// hydrated. Lets data-dependent UI defer until after hydration so a warm
// client-side React Query cache can't mismatch the server's empty-cache
// first render. Uses useSyncExternalStore (not setState-in-effect) so it's
// a single, tear-free render with no cascading update.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
