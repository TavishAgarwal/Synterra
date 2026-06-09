import { useState, useEffect, useRef, useCallback } from 'react';
import type { DecisionEntry } from '../data/mockAgents';
import { generateDecisionFeed } from '../data/mockAgents';

export function useTerminalStream(maxEntries: number = 50) {
  const [initialEntries] = useState(generateDecisionFeed);
  const allEntries = useRef(initialEntries);
  const [entries, setEntries] = useState<DecisionEntry[]>(() => initialEntries.slice(0, 6));
  const indexRef = useRef(6);

  useEffect(() => {
    const addEntry = () => {
      const idx = indexRef.current % allEntries.current.length;
      const now = new Date();
      const entry: DecisionEntry = {
        ...allEntries.current[idx],
        id: `stream-${Date.now()}-${idx}`,
        timestamp: now.toLocaleTimeString('en-US', { hour12: false }),
      };
      indexRef.current++;
      setEntries(prev => [entry, ...prev].slice(0, maxEntries));
    };

    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay = 3000 + Math.random() * 5000;
      timer = setTimeout(() => {
        addEntry();
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => clearTimeout(timer);
  }, [maxEntries]);

  const addManualEntry = useCallback((message: string) => {
    const entry: DecisionEntry = {
      id: `manual-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      archetype: 'OFFICIAL',
      zone: 'SECTOR_CMD',
      decision: message.toUpperCase(),
      type: 'EXEC',
    };
    setEntries(prev => [entry, ...prev].slice(0, maxEntries));
  }, [maxEntries]);

  return { entries, addManualEntry };
}
