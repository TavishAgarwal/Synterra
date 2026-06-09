import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AppShell } from '../components/layout/AppShell';
import { GlassPanel } from '../components/ui/GlassPanel';
import { DataChip } from '../components/ui/DataChip';
import { CityCard } from '../components/ui/CityCard';
import { useTypewriter } from '../hooks/useTypewriter';
import { geoSynthNodes } from '../data/mockCities';
import type { TelemetryEntry } from '../data/mockAgents';
import { generateTelemetryFeed } from '../data/mockAgents';

const markerIcon = L.divIcon({
  className: 'map-marker',
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

const GeoSynthesis: React.FC = () => {
  const navigate = useNavigate();
  const terminalText = '> ACCESSING GEO-SYNTHESIS DIRECTORY...';
  const headlineText = 'BEFORE GOVERNMENTS CHANGE REALITY...';

  const { displayText: terminalDisplay, isComplete: terminalDone } = useTypewriter(terminalText, 40);
  const { displayText: headlineDisplay } = useTypewriter(
    headlineText,
    40,
    terminalDone ? 0 : terminalText.length * 40 + 200
  );

  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Telemetry feed
  const allTelemetry = useRef(generateTelemetryFeed());
  const [telemetryLines, setTelemetryLines] = useState<TelemetryEntry[]>(() =>
    allTelemetry.current.slice(0, 4)
  );
  const telemetryIdx = useRef(4);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const addLine = () => {
      const idx = telemetryIdx.current % allTelemetry.current.length;
      const entry = {
        ...allTelemetry.current[idx],
        id: `tel-live-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      };
      telemetryIdx.current++;
      setTelemetryLines(prev => [...prev, entry].slice(-8));
      timer = setTimeout(addLine, 3000 + Math.random() * 2000);
    };
    timer = setTimeout(addLine, 4000);
    return () => clearTimeout(timer);
  }, []);

  const selectedCity = geoSynthNodes.find(n => n.id === selectedNode) || geoSynthNodes[0];

  return (
    <AppShell showInitiateButton onInitiate={() => navigate(`/simulate/${selectedCity.id}`)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Top bar - typewriter */}
        <div>
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 14,
              color: 'var(--color-primary)',
              marginBottom: 8,
              minHeight: 20,
            }}
          >
            {terminalDisplay}
            <span className="cursor-blink" style={{ color: 'var(--color-primary)' }}>█</span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 48,
              fontWeight: 400,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              minHeight: 56,
            }}
          >
            {headlineDisplay}
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Left: Map panel - 70% */}
          <div style={{ flex: '0 0 70%' }}>
            <GlassPanel
              title="TARGET_NODE_VIEW"
              variant="mono"
              headerRight={<DataChip label="LIVE_FEED_STABLE" variant="stable" />}
            >
              <div style={{ margin: -12, marginBottom: 0 }}>
                <MapContainer
                  center={[selectedCity.coordinates.lat, selectedCity.coordinates.lng]}
                  zoom={12}
                  style={{ height: 400, width: '100%' }}
                  scrollWheelZoom={true}
                  zoomControl={false}
                  dragging={true}
                  attributionControl={false}
                  key={selectedCity.id}
                >
                  <TileLayer
                    url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                  />
                  <Marker
                    position={[selectedCity.coordinates.lat, selectedCity.coordinates.lng]}
                    icon={markerIcon}
                  />
                </MapContainer>
              </div>

              {/* Map footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  height: 32,
                  borderTop: '1px solid var(--color-border-dim)',
                  fontFamily: 'var(--font-data)',
                  fontSize: 10,
                  color: 'var(--color-text-dim)',
                  letterSpacing: '0.05em',
                  padding: '0 4px',
                }}
              >
                <span>
                  LOC: {selectedCity.coordinates.lat.toFixed(4)}° N,{' '}
                  {selectedCity.coordinates.lng.toFixed(4)}° E
                </span>
                <span>ZOOM_LEVEL: 0x4A</span>
              </div>

              {/* Telemetry */}
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    color: 'var(--color-text-dim)',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                  }}
                >
                  REAL-TIME_TELEMETRY
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {telemetryLines.slice(-4).map((line) => (
                    <div
                      key={line.id}
                      className="terminal-entry"
                      style={{
                        fontFamily: 'var(--font-data)',
                        fontSize: 12,
                        color: line.isAlert ? 'var(--color-alert)' : 'var(--color-text-secondary)',
                      }}
                    >
                      <span style={{ color: 'var(--color-text-dim)' }}>[{line.timestamp}]</span>{' '}
                      {line.message}
                    </div>
                  ))}
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* Right: Available nodes - 30% */}
          <div style={{ flex: '0 0 30%', minWidth: 0 }}>
            <GlassPanel
              title="AVAILABLE_NODES"
              variant="mono"
              headerRight={
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--color-text-dim)' }}>
                  FOUND: {String(geoSynthNodes.length).padStart(2, '0')}
                </span>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {geoSynthNodes.map((node) => (
                  <CityCard
                    key={node.id}
                    name={node.name}
                    description={node.description}
                    population={node.populationDisplay}
                    threatLevel={node.threatLevel}
                    status={node.status}
                    isActive={selectedNode === node.id}
                    onClick={() => {
                      setSelectedNode(node.id);
                    }}
                  />
                ))}
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default GeoSynthesis;
