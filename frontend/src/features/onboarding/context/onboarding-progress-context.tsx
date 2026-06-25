"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type OnboardingWizardStep =
  | "sign-in"
  | "profile"
  | "documents"
  | "bank"
  | "review";

export type OnboardingProfileSubStep =
  | "profile"
  | "documents"
  | "bank"
  | "review";

export interface OnboardingProgressState {
  profileComplete: boolean;
  documentsReady: boolean;
  bankComplete: boolean;
  profileSubStep: OnboardingProfileSubStep;
}

interface OnboardingProgressContextValue extends OnboardingProgressState {
  setProgress: (patch: Partial<OnboardingProgressState>) => void;
  resetProgress: () => void;
}

const defaultState: OnboardingProgressState = {
  profileComplete: false,
  documentsReady: false,
  bankComplete: false,
  profileSubStep: "profile",
};

const OnboardingProgressContext =
  createContext<OnboardingProgressContextValue | null>(null);

export function OnboardingProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingProgressState>(defaultState);

  const setProgress = useCallback((patch: Partial<OnboardingProgressState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetProgress = useCallback(() => {
    setState(defaultState);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setProgress,
      resetProgress,
    }),
    [state, setProgress, resetProgress],
  );

  return (
    <OnboardingProgressContext.Provider value={value}>
      {children}
    </OnboardingProgressContext.Provider>
  );
}

export function useOnboardingProgress() {
  const ctx = useContext(OnboardingProgressContext);
  if (!ctx) {
    throw new Error(
      "useOnboardingProgress must be used within OnboardingProgressProvider",
    );
  }
  return ctx;
}
