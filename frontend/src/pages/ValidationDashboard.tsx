import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { API_BASE } from '../api/config';

interface ValidationCase {
  case_id: string;
  title: string;
  predicted: number;
  actual: number;
  absolute_percentage_error: number;
  reported_error: number;
  reported_error_unit: string;
  naive_baseline_absolute_error: number;
  absolute_error: number;
  source_note: string;
}

export default function ValidationDashboard() {
  const [cases, setCases] = useState<ValidationCase[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/validation-reproduction`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Validation service unavailable');
        return response.json() as Promise<{ cases: ValidationCase[] }>;
      })
      .then((data) => setCases(data.cases))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Validation service unavailable');
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '48px 24px 80px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontFamily: 'var(--font-data)', color: '#00e5ff', fontSize: 11, letterSpacing: '0.1em' }}>
          REPRODUCIBLE VALIDATION ARITHMETIC
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 400, margin: '10px 0' }}>
          Hindcast evidence, with limitations visible
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 28 }}>
          These calculations can be reproduced with <code>python -m backend.validation.reproduce</code>.
          The bundled rows verify the arithmetic and baseline comparison; independently licensed raw
          source series must still be added before scientific publication.
        </p>

        {error && <div style={{ border: '1px solid #ff0055', padding: 18, color: '#ff0055' }}>{error}</div>}
        <div style={{ display: 'grid', gap: 14 }}>
          {cases.map((item) => (
            <div key={item.case_id} style={{ background: '#111318', border: '1px solid #1e2d47', padding: 22 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: 14 }}>{item.title}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  ['PREDICTED', item.predicted],
                  ['OBSERVED', item.actual],
                  ['ERROR', `${item.reported_error.toFixed(1)} ${item.reported_error_unit}`],
                  ['BASELINE ERROR', item.naive_baseline_absolute_error],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: '#0a0c10', padding: 12 }}>
                    <div style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'var(--color-text-dim)' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginTop: 5 }}>{value}</div>
                  </div>
                ))}
              </div>
              <p style={{ color: 'var(--color-text-dim)', fontSize: 12 }}>{item.source_note}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
