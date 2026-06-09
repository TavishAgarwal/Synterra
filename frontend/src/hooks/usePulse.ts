import { useState, useEffect } from 'react';

export function usePulse(intervalMs: number = 2000) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      setPulse(true);
      timeout = setTimeout(() => setPulse(false), intervalMs / 2);
    }, intervalMs);
    return () => {
      clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [intervalMs]);

  return pulse;
}
