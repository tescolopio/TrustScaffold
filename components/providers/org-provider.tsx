'use client';

import { createContext, useContext } from 'react';

import type { DashboardContext } from '@/lib/types';

const OrgContext = createContext<DashboardContext | null>(null);

type OrgProviderProps = {
  value: DashboardContext;
  children: React.ReactNode;
};

export function OrgProvider({ value, children }: OrgProviderProps) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const context = useContext(OrgContext);

  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }

  return context;
}
