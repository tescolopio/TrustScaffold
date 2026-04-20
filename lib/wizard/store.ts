'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { defaultWizardValues, type WizardData } from '@/lib/wizard/schema';

function mergeWizardData(data: Partial<WizardData> | undefined): WizardData {
  const defaultSubservice = defaultWizardValues.subservices[0];

  return {
    ...defaultWizardValues,
    ...data,
    company: {
      ...defaultWizardValues.company,
      ...data?.company,
    },
    governance: {
      ...defaultWizardValues.governance,
      ...data?.governance,
    },
    training: {
      ...defaultWizardValues.training,
      ...data?.training,
    },
    scope: {
      ...defaultWizardValues.scope,
      ...data?.scope,
    },
    tscSelections: {
      ...defaultWizardValues.tscSelections,
      ...data?.tscSelections,
    },
    infrastructure: {
      ...defaultWizardValues.infrastructure,
      ...data?.infrastructure,
    },
    subservices: Array.isArray(data?.subservices) && data.subservices.length > 0
      ? data.subservices.map((subservice) => ({
          ...defaultSubservice,
          ...subservice,
        }))
      : defaultWizardValues.subservices,
    securityTooling: {
      ...defaultWizardValues.securityTooling,
      ...data?.securityTooling,
    },
    operations: {
      ...defaultWizardValues.operations,
      ...data?.operations,
    },
    securityAssessment: {
      documentReview: {
        ...defaultWizardValues.securityAssessment.documentReview,
        ...data?.securityAssessment?.documentReview,
      },
      logReview: {
        ...defaultWizardValues.securityAssessment.logReview,
        ...data?.securityAssessment?.logReview,
      },
      rulesetReview: {
        ...defaultWizardValues.securityAssessment.rulesetReview,
        ...data?.securityAssessment?.rulesetReview,
      },
      configReview: {
        ...defaultWizardValues.securityAssessment.configReview,
        ...data?.securityAssessment?.configReview,
      },
      networkAnalysis: {
        ...defaultWizardValues.securityAssessment.networkAnalysis,
        ...data?.securityAssessment?.networkAnalysis,
      },
      fileIntegrity: {
        ...defaultWizardValues.securityAssessment.fileIntegrity,
        ...data?.securityAssessment?.fileIntegrity,
      },
    },
  };
}

type WizardStore = {
  organizationId: string | null;
  currentStep: number;
  data: WizardData;
  lastGeneratedAt: string | null;
  hasHydrated: boolean;
  setHydrated: (value: boolean) => void;
  setOrganization: (organizationId: string) => void;
  setCurrentStep: (step: number) => void;
  setData: (data: WizardData) => void;
  reset: (organizationId?: string) => void;
  markGenerated: () => void;
};

export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      organizationId: null,
      currentStep: 0,
      data: defaultWizardValues,
      lastGeneratedAt: null,
      hasHydrated: false,
      setHydrated: (value) => set({ hasHydrated: value }),
      setOrganization: (organizationId) => {
        if (get().organizationId && get().organizationId !== organizationId) {
          set({ organizationId, currentStep: 0, data: defaultWizardValues, lastGeneratedAt: null });
          return;
        }

        set({ organizationId });
      },
      setCurrentStep: (currentStep) => set({ currentStep }),
      setData: (data) => set({ data: mergeWizardData(data) }),
      reset: (organizationId) =>
        set({
          organizationId: organizationId ?? get().organizationId,
          currentStep: 0,
          data: defaultWizardValues,
          lastGeneratedAt: null,
        }),
      markGenerated: () => set({ lastGeneratedAt: new Date().toISOString() }),
    }),
    {
      name: 'trustscaffold-wizard',
      version: 5,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        organizationId: state.organizationId,
        currentStep: state.currentStep,
        data: state.data,
        lastGeneratedAt: state.lastGeneratedAt,
      }),
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<WizardStore>;

        return {
          organizationId: state.organizationId ?? null,
          currentStep: state.currentStep ?? 0,
          data: mergeWizardData(state.data),
          lastGeneratedAt: state.lastGeneratedAt ?? null,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
