import { useState, useCallback, useEffect, useRef } from 'react';

export type SimulationStatus = 'idle' | 'configuring' | 'executing' | 'complete';

export interface SimulationState {
  status: SimulationStatus;
  selectedCityId: string | null;
  temporalResolution: number;
  vectorVariance: number;
  executionProgress: number;
}

export function useSimulation() {
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<SimulationState>({
    status: 'idle',
    selectedCityId: null,
    temporalResolution: 0.5,
    vectorVariance: 0.5,
    executionProgress: 0,
  });

  const selectCity = useCallback((cityId: string) => {
    setState(prev => ({ ...prev, selectedCityId: cityId, status: 'configuring' }));
  }, []);

  const setTemporalResolution = useCallback((value: number) => {
    setState(prev => ({ ...prev, temporalResolution: value }));
  }, []);

  const setVectorVariance = useCallback((value: number) => {
    setState(prev => ({ ...prev, vectorVariance: value }));
  }, []);

  const executeSimulation = useCallback(() => {
    setState(prev => ({ ...prev, status: 'executing', executionProgress: 0 }));
    if (progressInterval.current) clearInterval(progressInterval.current);
    let progress = 0;
    progressInterval.current = setInterval(() => {
      progress += Math.random() * 8 + 2;
      if (progress >= 100) {
        progress = 100;
        if (progressInterval.current) clearInterval(progressInterval.current);
        progressInterval.current = null;
        setState(prev => ({ ...prev, status: 'complete', executionProgress: 100 }));
      } else {
        setState(prev => ({ ...prev, executionProgress: progress }));
      }
    }, 200);
  }, []);

  const reset = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = null;
    setState({
      status: 'idle',
      selectedCityId: null,
      temporalResolution: 0.5,
      vectorVariance: 0.5,
      executionProgress: 0,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  return { ...state, selectCity, setTemporalResolution, setVectorVariance, executeSimulation, reset };
}
