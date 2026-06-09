import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CityProfile } from '../data/cityProfiles';
import type { DemoPolicy } from '../data/demoPolicies';
import type { PolicyCategory } from '../data/demoPolicies';
import type { SimulationSummary } from '../api/simulation';

export interface SimulationState {
  selectedCity: CityProfile | null;
  selectedPolicy: DemoPolicy | null;
  policyCategory: PolicyCategory | null;
  customPolicyText: string;
  questionAnswers: Record<string, string>;
  sessionId: string;
  simulationId: string;
  simulationSummary: SimulationSummary | null;
  step: number; // 0=city, 1=policy, 2=simulate, 3=results, 4=recommendations
}

interface SimulationContextType extends SimulationState {
  setSelectedCity: (city: CityProfile) => void;
  setSelectedPolicy: (policy: DemoPolicy | null) => void;
  setPolicyCategory: (category: PolicyCategory | null) => void;
  setCustomPolicyText: (text: string) => void;
  setQuestionAnswer: (qId: string, answer: string) => void;
  setSimulationId: (simulationId: string) => void;
  setSimulationSummary: (summary: SimulationSummary | null) => void;
  setStep: (step: number) => void;
  reset: () => void;
}

const defaultState: SimulationState = {
  selectedCity: null,
  selectedPolicy: null,
  policyCategory: null,
  customPolicyText: '',
  questionAnswers: {},
  sessionId: '',
  simulationId: '',
  simulationSummary: null,
  step: 0,
};

function generateSessionId(): string {
  return `SN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

const SimulationContext = createContext<SimulationContextType | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SimulationState>(() => {
    try {
      const stored = sessionStorage.getItem('sn-simulation-state');
      if (stored) {
        return JSON.parse(stored) as SimulationState;
      }
    } catch {
      // ignore
    }
    return { ...defaultState, sessionId: generateSessionId() };
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('sn-simulation-state', JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const setSelectedCity = useCallback((city: CityProfile) => {
    setState((prev) => ({ ...prev, selectedCity: city, step: Math.max(prev.step, 0) }));
  }, []);

  const setSelectedPolicy = useCallback((policy: DemoPolicy | null) => {
    setState((prev) => ({ ...prev, selectedPolicy: policy, policyCategory: policy?.category ?? prev.policyCategory }));
  }, []);

  const setPolicyCategory = useCallback((policyCategory: PolicyCategory | null) => {
    setState((prev) => ({ ...prev, policyCategory }));
  }, []);

  const setCustomPolicyText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, customPolicyText: text }));
  }, []);

  const setQuestionAnswer = useCallback((qId: string, answer: string) => {
    setState((prev) => ({
      ...prev,
      questionAnswers: { ...prev.questionAnswers, [qId]: answer },
    }));
  }, []);

  const setSimulationSummary = useCallback((simulationSummary: SimulationSummary | null) => {
    setState((prev) => ({ ...prev, simulationSummary }));
  }, []);

  const setSimulationId = useCallback((simulationId: string) => {
    setState((prev) => ({ ...prev, simulationId }));
  }, []);

  const setStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const reset = useCallback(() => {
    setState({ ...defaultState, sessionId: generateSessionId() });
  }, []);

  return (
    <SimulationContext.Provider
      value={{
        ...state,
        setSelectedCity,
        setSelectedPolicy,
        setPolicyCategory,
        setCustomPolicyText,
        setQuestionAnswer,
        setSimulationId,
        setSimulationSummary,
        setStep,
        reset,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

// Context providers and their consumer hook intentionally share this module.
// eslint-disable-next-line react-refresh/only-export-components
export function useSimulationContext(): SimulationContextType {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulationContext must be used within SimulationProvider');
  return ctx;
}
