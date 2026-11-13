import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Admin status is lifted above the shell so the sidebar can show it without
 * statically importing the Firebase-backed auth module. AuthProvider publishes
 * the current claim through `useSetAdminStatus`; the value persists after the
 * provider unmounts so the badge survives navigation away from community pages.
 */
const AdminStatusContext = createContext(false);
const SetAdminStatusContext = createContext<(value: boolean) => void>(
  () => undefined,
);

export function AdminStatusRoot({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  return (
    <AdminStatusContext.Provider value={isAdmin}>
      <SetAdminStatusContext.Provider value={setIsAdmin}>
        {children}
      </SetAdminStatusContext.Provider>
    </AdminStatusContext.Provider>
  );
}

export function useAdminStatus(): boolean {
  return useContext(AdminStatusContext);
}

export function useSetAdminStatus(): (value: boolean) => void {
  return useContext(SetAdminStatusContext);
}
