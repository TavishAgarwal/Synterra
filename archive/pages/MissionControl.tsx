import React from 'react';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AppShell } from '../components/layout/AppShell';
import { GlassPanel } from '../components/ui/GlassPanel';
import { DataChip } from '../components/ui/DataChip';
import { TerminalInput } from '../components/ui/TerminalInput';
import { TerminalLog } from '../components/ui/TerminalLog';
import { SegmentBar } from '../components/ui/SegmentBar';
import { useTerminalStream } from '../hooks/useTerminalStream';
import { useCountUp } from '../hooks/useCountUp';
import { cities } from '../data/mockCities';

const markerIcon = L.divIcon({
  className: 'map-marker',
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

const MissionControl: React.FC = () => {
  const { entries, addManualEntry } = useTerminalStream(50);
  const activeAgents = useCountUp(14208, 1200, 0);

  return (
    <AppShell>
      <div style={{ display: 'flex', gap: 16, height: '100%' }}>
        {/* Center Column - 65% */}
        <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Global View Grid */}
          <GlassPanel
            title="GLOBAL VIEW GRID"
            variant="serif"
            headerRight={<DataChip label="LIVE SENSOR FEED" variant="online" />}
          >
            <div style={{ margin: -12, marginBottom: 0 }}>
              <MapContainer
                center={[22.0, 78.5]}
                zoom={5}
                style={{ height: 320, width: '100%' }}
                scrollWheelZoom={true}
                zoomControl={false}
                dragging={true}
                attributionControl={false}
              >
                <TileLayer
                  url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                />
                {cities.map((city, i) => (
                  <Marker key={city.id} position={[city.coordinates.lat, city.coordinates.lng]} icon={markerIcon}>
                    <Tooltip
                      permanent={i < 2}
                      direction="bottom"
                      offset={[0, 8]}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-data)',
                          fontSize: 10,
                          color: 'var(--color-text-dim)',
                          background: 'rgba(10, 12, 16, 0.9)',
                          padding: '2px 6px',
                          border: 'none',
                          letterSpacing: '0.05em',
                        }}
                      >
                        N{city.coordinates.lat.toFixed(4)}° E{city.coordinates.lng.toFixed(4)}°
                      </div>
                    </Tooltip>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: 32,
                borderTop: '1px solid var(--color-border-dim)',
                marginTop: 0,
                fontFamily: 'var(--font-data)',
                fontSize: 10,
                color: 'var(--color-text-dim)',
                letterSpacing: '0.05em',
                padding: '0 4px',
              }}
            >
              <span>RESOLUTION: 0.5M/PX</span>
              <span>SYNC: NOMINAL</span>
            </div>
          </GlassPanel>

          {/* Bottom panels */}
          <div style={{ display: 'flex', gap: 16 }}>
            {/* Active Agents */}
            <div style={{ flex: 1 }}>
              <GlassPanel title="ACTIVE AGENTS" variant="mono">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-data)',
                        fontSize: 48,
                        color: 'var(--color-primary)',
                        lineHeight: 1,
                      }}
                    >
                      {activeAgents.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-data)',
                          fontSize: 10,
                          color: 'var(--color-text-dim)',
                          letterSpacing: '0.1em',
                        }}
                      >
                        TOTAL DEPLOYED
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-data)',
                          fontSize: 10,
                          color: 'var(--color-success)',
                        }}
                      >
                        +19% YTD
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-data)',
                      fontSize: 36,
                      color: 'var(--color-alert)',
                      lineHeight: 1,
                    }}
                  >
                    -₹4.2Cr
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-data)',
                        fontSize: 10,
                        color: 'var(--color-text-dim)',
                        letterSpacing: '0.1em',
                      }}
                    >
                      CAPITAL FLOW
                    </span>
                    <DataChip label="DEFICIT DETECTED" variant="critical" />
                  </div>
                </div>
              </GlassPanel>
            </div>

            {/* System Load */}
            <div style={{ flex: 1 }}>
              <GlassPanel
                title="SYSTEM LOAD"
                variant="mono"
                headerRight={<DataChip label="OPT" variant="stable" />}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <SegmentBar value={78} variant="primary" label="CORE PROCESSING" />
                  <SegmentBar value={42} variant="primary" label="MEMORY BANK ALPHA" />
                </div>
              </GlassPanel>
            </div>
          </div>
        </div>

        {/* Right Column - 35% */}
        <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* Decision Log */}
          <div style={{ flex: '0 0 60%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <GlassPanel
              title="DECISION LOG"
              variant="serif"
              headerRight={
                <div
                  style={{
                    cursor: 'crosshair',
                    color: 'var(--color-text-dim)',
                    fontSize: 16,
                    padding: 4,
                  }}
                >
                  ☰
                </div>
              }
              className="flex-1"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <TerminalInput
                  placeholder=""
                  onSubmit={(val) => addManualEntry(val)}
                />
                <TerminalLog entries={entries} maxHeight={280} />
              </div>
            </GlassPanel>
          </div>

          {/* Threat Level */}
          <div style={{ flex: '0 0 40%' }}>
            <GlassPanel title="THREAT LEVEL" variant="serif">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                <DataChip label="ONLINE" variant="online" large icon="●" />
                <DataChip label="STABLE" variant="stable" large />
                <DataChip label="ELEVATED" variant="elevated" large icon="△" />
                <DataChip label="DORMANT" variant="dormant" large />
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default MissionControl;
