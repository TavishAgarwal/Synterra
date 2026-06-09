import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cityProfiles } from '../data/cityProfiles';
import { useSimulationContext } from '../context/SimulationContext';

export default function CitySelector() {
  const navigate = useNavigate();
  const { setSelectedCity, setStep } = useSimulationContext();
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  const handleCityClick = (cityId: string) => {
    const city = cityProfiles.find((item) => item.id === cityId);
    if (!city) return;
    setSelectedCity(city);
    setStep(1);
    navigate(`/policy/${city.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: 'calc(100vh - 40px)',
        background: '#0a0c10',
        display: 'flex',
        justifyContent: 'center',
        padding: '48px 24px 80px',
      }}
    >
      <div style={{ maxWidth: 960, width: '100%' }}>
        <div style={{ background: '#111318', borderLeft: '3px solid #00e5ff', padding: '16px 20px', marginBottom: 32 }}>
          <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Describe a policy. We simulate how 10,000 AI citizens react to it — each with their own personality, memory,
            and social network. You get a score, a verdict, and exact recommendations in about 3 minutes.
          </p>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 400, marginBottom: 10 }}>
            Choose a city to simulate
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 640 }}>
            Each city has its own demographic profile, transport network, and economic baseline.
            Pick the one most relevant to your policy.
          </p>
        </div>

        <div className="city-grid">
          {cityProfiles.map((city) => {
            const isHovered = hoveredCity === city.id;
            return (
              <button
                key={city.id}
                onClick={() => handleCityClick(city.id)}
                onMouseEnter={() => setHoveredCity(city.id)}
                onMouseLeave={() => setHoveredCity(null)}
                style={{
                  background: '#111318',
                  border: `1px solid ${isHovered ? '#00e5ff' : '#1e2d47'}`,
                  borderLeft: isHovered ? '3px solid #00e5ff' : '1px solid #1e2d47',
                  padding: 24,
                  textAlign: 'left',
                  transition: 'border-color 150ms ease-out, border-left-width 150ms ease-out',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--color-text-primary)' }}>
                    {city.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--color-text-dim)' }}>
                    {city.population}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 12 }}>{city.state}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {city.pills.map((pill) => (
                    <span
                      key={pill}
                      style={{ background: '#1a1c20', border: '1px solid #1e2d47', padding: '4px 10px', fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-secondary)' }}
                    >
                      {pill}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-dim)', lineHeight: 1.5, marginBottom: 14 }}>
                  {city.description}
                </p>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: '#00e5ff', textDecoration: isHovered ? 'underline' : 'none' }}>
                  Simulate this city →
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
