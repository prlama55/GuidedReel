import { createContext, useContext } from 'react';
import type { EditorHost } from './types';

const HostContext = createContext<EditorHost | null>(null);

export const HostProvider: React.FC<{ host: EditorHost; children: React.ReactNode }> = ({
  host,
  children,
}) => <HostContext.Provider value={host}>{children}</HostContext.Provider>;

export function useHost(): EditorHost {
  const host = useContext(HostContext);
  if (!host) throw new Error('useHost must be used inside <HostProvider>');
  return host;
}
