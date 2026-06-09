import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AppShell } from '../components/layout/AppShell';
import { GlassPanel } from '../components/ui/GlassPanel';
import { DataChip } from '../components/ui/DataChip';
import { TerminalInput } from '../components/ui/TerminalInput';
import { ExecuteButton } from '../components/ui/ExecuteButton';
import { cities, geoSynthNodes } from '../data/mockCities';
import { useSimulation } from '../hooks/useSimulation';

const markerIcon = L.divIcon({
  className: 'map-marker',
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

const allCities = [...cities, ...geoSynthNodes];

const codeLines = [
  { text: '# INIT SEQUENCE STARTED', type: 'comment' },
  { text: '# TARGET: {CITY} [LAT:{LAT}, LON:{LON}]', type: 'comment' },
  { text: 'simulation:', type: 'key' },
  { text: '  target_id: "{ID}"', type: 'string' },
  { text: '  type: "INFRA_STRESS"', type: 'string' },
  { text: '  parameters:', type: 'key' },
  { text: '    temporal_res: 75', type: 'number' },
  { text: '        variance_model: "AGGRESSIVE"', type: 'string' },
  { text: '  nodes: 14,204', type: 'number' },
  { text: '  constraints:', type: 'key' },
  { text: '    - "temperature > 45C"', type: 'string' },
  { text: '    - "grid_load = max"', type: 'string' },
  { text: '', type: 'blank' },
  { text: '# COMPILING VECTORS...', type: 'comment' },
  { text: '# AWAITING EXECUTION COMMAND...', type: 'comment' },
];

const colorMap: Record<string, string> = {
  comment: 'var(--color-text-dim)',
  key: 'var(--color-text-secondary)',
  string: 'var(--color-primary)',
  number: 'var(--color-warn)',
  blank: 'transparent',
};

const Simulate: React.FC = () => {
  const { cityId } = useParams<{ cityId: string }>();
  const city = allCities.find(c => c.id === cityId) || cities[0];
  const sim = useSimulation();

  // Countdown timer
  const [countdown, setCountdown] = useState(14 * 60 + 32); // 00:14:32
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `00:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const [directive, setDirective] = useState('');

  const processedCode = codeLines.map(line => ({
    ...line,
    text: line.text
      .replace('{CITY}', city.name.toUpperCase())
      .replace('{LAT}', city.coordinates.lat.toFixed(4))
      .replace('{LON}', city.coordinates.lng.toFixed(4))
      .replace('{ID}', city.id),
  }));

  return (
    <AppShell showInitiateButton onInitiate={() => sim.executeSimulation()}>
      <div style={{ display: 'flex', gap: 16, height: '100%' }}>
        {/* Left: Policy configuration - 60% */}
        <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
          {/* Header */}
          <div>
            <DataChip label="TARGET_LOCKED" variant="secure" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 }}>
              <div>
                <h1
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 48,
                    fontWeight: 400,
                    color: 'var(--color-text-primary)',
                    margin: 0,
                    lineHeight: 1.1,
                  }}
                >
                  {city.name.toUpperCase()}
                </h1>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 16,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                    marginTop: 8,
                    maxWidth: 500,
                  }}
                >
                  Configure simulation parameters for {city.zones[0]} infrastructure stress testing.
                  Adjust temporal resolution and vector inputs to initialize scenario parsing.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)', letterSpacing: '0.1em' }}>
                    EST_COMPUTE
                  </div>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: 14, color: 'var(--color-text-primary)', marginTop: 2 }}>
                    4.2 TFLOPS
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)', letterSpacing: '0.1em' }}>
                    TIME_TO_SYNC
                  </div>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: 14, color: 'var(--color-primary)', marginTop: 2 }}>
                    {formatCountdown(countdown)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Policy Directives */}
          <GlassPanel
            title="⊛ Policy Directives"
            variant="serif"
          >
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--color-text-secondary)',
                marginBottom: 12,
              }}
            >
              Input natural language constraints or load predefined matrices.
            </p>
            <TerminalInput
              multiline
              rows={5}
              value={directive}
              onChange={setDirective}
              placeholder="Initiate power grid stress test under anomalous temperature conditions..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 11,
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text-dim)',
                  padding: '6px 12px',
                  cursor: 'crosshair',
                  letterSpacing: '0.05em',
                }}
              >
                [LOAD_TEMPLATE]
              </button>
              <button
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 11,
                  border: '1px solid var(--color-primary)',
                  background: 'transparent',
                  color: 'var(--color-primary)',
                  padding: '6px 12px',
                  cursor: 'crosshair',
                  letterSpacing: '0.05em',
                }}
              >
                [PARSE_DIRECTIVE]
              </button>
            </div>
          </GlassPanel>

          {/* Config panels */}
          <div style={{ display: 'flex', gap: 16 }}>
            {/* Temporal Resolution */}
            <div style={{ flex: 1 }}>
              <GlassPanel>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-text-primary)' }}>
                    Temporal Resolution
                  </span>
                  <DataChip label="High" variant="secure" />
                </div>
                <div style={{ padding: '0 4px' }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sim.temporalResolution * 100}
                    onChange={e => sim.setTemporalResolution(Number(e.target.value) / 100)}
                    style={{
                      width: '100%',
                      height: 2,
                      appearance: 'none',
                      background: `linear-gradient(to right, var(--color-primary) ${sim.temporalResolution * 100}%, var(--color-border-dim) ${sim.temporalResolution * 100}%)`,
                      outline: 'none',
                      cursor: 'crosshair',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)' }}>
                    <span>0.1ms</span>
                    <span>1.0s</span>
                  </div>
                </div>
              </GlassPanel>
            </div>

            {/* Vector Variance */}
            <div style={{ flex: 1 }}>
              <GlassPanel>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--color-text-primary)' }}>
                    Vector Variance
                  </span>
                  <DataChip label="Aggressive" variant="warn" />
                </div>
                <div style={{ padding: '0 4px' }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sim.vectorVariance * 100}
                    onChange={e => sim.setVectorVariance(Number(e.target.value) / 100)}
                    style={{
                      width: '100%',
                      height: 2,
                      appearance: 'none',
                      background: `linear-gradient(to right, var(--color-primary) ${sim.vectorVariance * 100}%, var(--color-border-dim) ${sim.vectorVariance * 100}%)`,
                      outline: 'none',
                      cursor: 'crosshair',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-dim)' }}>
                    <span>Linear</span>
                    <span>Chaotic</span>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>

          {/* Map */}
          <GlassPanel>
            <div style={{ position: 'relative', margin: -12 }}>
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div style={{ width: 6, height: 6, background: 'var(--color-primary)' }} />
                <DataChip label="LIVE_FEED: SECTOR_9" variant="secure" />
              </div>
              <MapContainer
                center={[city.coordinates.lat, city.coordinates.lng]}
                zoom={13}
                style={{ height: 260, width: '100%' }}
                scrollWheelZoom={true}
                zoomControl={false}
                dragging={true}
                attributionControl={false}
                key={`sim-${city.id}`}
              >
                <TileLayer
                  url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                />
                <Marker
                  position={[city.coordinates.lat, city.coordinates.lng]}
                  icon={markerIcon}
                />
              </MapContainer>
            </div>
          </GlassPanel>
        </div>

        {/* Right: Parsing Engine - 40% */}
        <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              background: 'var(--color-surface-low)',
              border: '1px solid var(--color-primary-border)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                borderBottom: '1px solid var(--color-border-dim)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.1em',
                }}
              >
                PARSING_ENGINE_v4.2
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <div style={{ width: 8, height: 8, background: 'var(--color-primary)' }} />
                <div style={{ width: 8, height: 8, background: 'var(--color-warn)' }} />
                <div style={{ width: 8, height: 8, background: 'var(--color-alert)' }} />
              </div>
            </div>

            {/* Code content */}
            <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
              {processedCode.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: 13,
                    color: colorMap[line.type],
                    lineHeight: 1.8,
                    whiteSpace: 'pre',
                  }}
                >
                  {line.text}
                </div>
              ))}
              <span className="cursor-blink" style={{ fontFamily: 'var(--font-data)', fontSize: 13, color: 'var(--color-primary)' }}>
                █
              </span>
            </div>

            {/* Execute button */}
            <div style={{ padding: 12 }}>
              <ExecuteButton
                label="EXECUTE SIMULATION"
                icon={<span>↻</span>}
                loading={sim.status === 'executing'}
                onClick={() => sim.executeSimulation()}
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default Simulate;
