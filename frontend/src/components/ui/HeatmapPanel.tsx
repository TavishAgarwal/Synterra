import { useState, useEffect, useRef, useMemo } from 'react';
import type { ZoneMetrics, ZoneTimeline } from '../../api/simulation';

interface HeatmapPanelProps {
  zones: ZoneMetrics[] | undefined;
  zoneTimeline: ZoneTimeline | undefined;
  cityId: string;
}

type MetricType = 'sentiment' | 'protest_probability' | 'modal_shift_pct';

export default function HeatmapPanel({ zones, zoneTimeline, cityId }: HeatmapPanelProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('protest_probability');
  const [currentDay, setCurrentDay] = useState<number>(30);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<{ zoneId: string; x: number; y: number } | null>(null);
  const [showValues, setShowValues] = useState<boolean>(true);
  const [showDebug, setShowDebug] = useState<boolean>(true);
  
  const playTimer = useRef<number | null>(null);

  // Auto-play timeline animation
  useEffect(() => {
    if (isPlaying) {
      playTimer.current = window.setInterval(() => {
        setCurrentDay((prev) => {
          if (prev >= 30) {
            return 1;
          }
          return prev + 1;
        });
      }, 300);
    } else {
      if (playTimer.current) {
        window.clearInterval(playTimer.current);
        playTimer.current = null;
      }
    }

    return () => {
      if (playTimer.current) {
        window.clearInterval(playTimer.current);
      }
    };
  }, [isPlaying]);

  // Bounding box, grid geometry, and projection coordinates
  const svgWidth = 480;
  const svgHeight = 360;
  const margin = 40;
  
  const hexRadius = 38;
  const spacingX = hexRadius * Math.sqrt(3) * 1.05;
  const spacingY = hexRadius * 1.5 * 1.05;

  const projectedZones: Array<ZoneMetrics & { x: number; y: number }> = useMemo(() => {
    if (!zones || zones.length === 0) return [];

    const lats = zones.map((z) => z.centroid_lat);
    const lngs = zones.map((z) => z.centroid_lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;

    return zones.map((z) => {
      // Simple projection: invert lat because SVG y runs top-to-bottom
      const x = margin + ((z.centroid_lng - minLng) / lngRange) * (svgWidth - 2 * margin);
      const y = margin + ((maxLat - z.centroid_lat) / latRange) * (svgHeight - 2 * margin);
      return {
        ...z,
        x,
        y,
      };
    });
  }, [zones]);

  // Clean hex-grid layout assignment (non-overlapping)
  const gridMappedZones = useMemo(() => {
    if (projectedZones.length === 0) return [];

    // 1. Generate interlocking hex grid candidate positions
    const candidates: { cx: number; cy: number }[] = [];
    const rows = 5;
    const cols = 6;
    
    const totalWidth = (cols - 1) * spacingX + spacingX / 2;
    const totalHeight = (rows - 1) * spacingY;
    const startX = (480 - totalWidth) / 2 + spacingX / 4;
    const startY = (360 - totalHeight) / 2 + 10;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = startX + c * spacingX + (r % 2 === 1 ? spacingX / 2 : 0);
        const cy = startY + r * spacingY;
        candidates.push({ cx, cy });
      }
    }

    // 2. Greedy match each projected zone to the closest unused candidate
    const assigned: { [zoneId: string]: { cx: number; cy: number } } = {};
    const available = [...candidates];

    // Sort zones to match central ones first
    const sortedZones = [...projectedZones].sort((a, b) => {
      return (a.x - 240) ** 2 + (a.y - 180) ** 2 - ((b.x - 240) ** 2 + (b.y - 180) ** 2);
    });

    for (const z of sortedZones) {
      let bestIdx = -1;
      let minDistance = Infinity;

      for (let i = 0; i < available.length; i++) {
        const dist = (z.x - available[i].cx) ** 2 + (z.y - available[i].cy) ** 2;
        if (dist < minDistance) {
          minDistance = dist;
          bestIdx = i;
        }
      }

      if (bestIdx !== -1) {
        assigned[z.zone_id] = available[bestIdx];
        available.splice(bestIdx, 1);
      } else {
        assigned[z.zone_id] = { cx: z.x, cy: z.y };
      }
    }

    return projectedZones.map((z) => {
      const pos = assigned[z.zone_id] || { cx: z.x, cy: z.y };
      return {
        ...z,
        gridX: pos.cx,
        gridY: pos.cy,
      };
    });
  }, [projectedZones]);

  // Selected zone drill-down detail
  const selectedZone = useMemo(() => {
    const found = gridMappedZones.find((z) => z.zone_id === selectedZoneId);
    return found || gridMappedZones[0] || {
      zone_id: 'default',
      zone_name: 'Default',
      centroid_lat: 0,
      centroid_lng: 0,
      metrics: { sentiment: 0, protest_probability: 0, modal_shift_pct: 0 },
      total_agents: 0,
      gridX: 0,
      gridY: 0,
      x: 0,
      y: 0,
      demographics: { population: 0, population_density_per_sqkm: 0 },
      income_profile: { median_monthly_income: 0 },
      commute_profile: { primary_mode: '' }
    };
  }, [gridMappedZones, selectedZoneId]);

  // Helper to extract metric for a zone at the current timeline day
  const getZoneMetricValue = (zoneId: string, metric: MetricType, day: number): number => {
    if (zoneTimeline && zoneTimeline[zoneId]) {
      const entry = zoneTimeline[zoneId].find((t) => t.day === day);
      if (entry) {
        return entry[metric];
      }
    }
    const z = zones?.find((item) => item.zone_id === zoneId);
    if (z) {
      if (metric === 'sentiment') return z.metrics.sentiment;
      if (metric === 'protest_probability') return z.metrics.protest_probability;
      return z.metrics.modal_shift_pct;
    }
    return 0;
  };

  // Dynamic color, percentage score, and rating mapping
  const getDayRangeForMetric = (metric: MetricType, day: number) => {
    if (!zones || zones.length === 0) return { min: 0, max: 100 };

    const pcts = zones.map((z) => {
      const val = getZoneMetricValue(z.zone_id, metric, day);
      if (metric === 'sentiment') {
        return Math.max(0, Math.min(100, Math.round((val + 1) * 50)));
      } else {
        return Math.max(0, Math.min(100, Math.round(val * 100)));
      }
    });

    const minVal = Math.min(...pcts);
    const maxVal = Math.max(...pcts);
    
    let currentMin = minVal;
    let currentMax = maxVal;
    const diff = currentMax - currentMin;
    if (diff < 5) {
      const mid = (currentMin + currentMax) / 2;
      currentMin = Math.max(0, mid - 2.5);
      currentMax = Math.min(100, mid + 2.5);
    }
    
    return { min: currentMin, max: currentMax };
  };

  const getZoneColorAndScore = (zoneId: string, metric: MetricType, day: number) => {
    const sentiment = getZoneMetricValue(zoneId, 'sentiment', day);
    const protestProb = getZoneMetricValue(zoneId, 'protest_probability', day);
    const modalShift = getZoneMetricValue(zoneId, 'modal_shift_pct', day);

    // Approval %: map sentiment -1 to 1 into 0 to 100
    const approvalPct = Math.max(0, Math.min(100, Math.round((sentiment + 1) * 50)));
    const protestPct = Math.max(0, Math.min(100, Math.round(protestProb * 100)));
    const shiftPct = Math.max(0, Math.min(100, Math.round(modalShift * 100)));

    let pct = 0;
    if (metric === 'sentiment') {
      pct = approvalPct;
    } else if (metric === 'protest_probability') {
      pct = protestPct;
    } else {
      pct = shiftPct;
    }

    const { min: currentMin, max: currentMax } = getDayRangeForMetric(metric, day);
    const diff = currentMax - currentMin;
    const scoreNorm = diff > 0.001 ? (pct - currentMin) / diff : 0.5;

    let color = '#d32f2f';
    let label = '';

    if (metric === 'sentiment') {
      // High values = green, low values = red
      if (scoreNorm >= 0.8) { color = '#1b5e20'; label = 'Strongest Positive'; }
      else if (scoreNorm >= 0.6) { color = '#4caf50'; label = 'Above Average'; }
      else if (scoreNorm >= 0.4) { color = '#fdd835'; label = 'Neutral/Average'; }
      else if (scoreNorm >= 0.2) { color = '#ff9800'; label = 'Below Average'; }
      else { color = '#d32f2f'; label = 'Weakest/Lowest'; }
    } else {
      // Protests and Modal Shift: Low values = green, high values = red
      if (scoreNorm < 0.2) { color = '#1b5e20'; label = 'Strongest/Lowest'; }
      else if (scoreNorm < 0.4) { color = '#4caf50'; label = 'Below Average'; }
      else if (scoreNorm < 0.6) { color = '#fdd835'; label = 'Neutral/Average'; }
      else if (scoreNorm < 0.8) { color = '#ff9800'; label = 'Above Average'; }
      else { color = '#d32f2f'; label = 'Critical/Highest'; }
    }

    return { color, pct, label, score: `${pct}%`, scoreNorm };
  };

  const dynamicLegendItems = useMemo(() => {
    if (!zones || zones.length === 0) return [];
    
    const { min: currentMin, max: currentMax } = getDayRangeForMetric(selectedMetric, currentDay);
    const diff = currentMax - currentMin;

    const getVal = (fraction: number) => {
      return Math.round(currentMin + fraction * diff);
    };

    if (selectedMetric === 'sentiment') {
      return [
        { color: '#1b5e20', score: `${getVal(1.0)}%`, label: 'Strongest (Max)', border: '#1b5e20' },
        { color: '#4caf50', score: `${getVal(0.75)}%`, label: 'Above Avg', border: '#4caf50' },
        { color: '#fdd835', score: `${getVal(0.5)}%`, label: 'Average', border: '#fdd835' },
        { color: '#ff9800', score: `${getVal(0.25)}%`, label: 'Below Avg', border: '#ff9800' },
        { color: '#d32f2f', score: `${getVal(0.0)}%`, label: 'Weakest (Min)', border: '#d32f2f' }
      ];
    } else {
      const isProtest = selectedMetric === 'protest_probability';
      return [
        { color: '#1b5e20', score: `${getVal(0.0)}%`, label: isProtest ? 'Peaceful (Min)' : 'Stable (Min)', border: '#1b5e20' },
        { color: '#4caf50', score: `${getVal(0.25)}%`, label: 'Below Avg', border: '#4caf50' },
        { color: '#fdd835', score: `${getVal(0.5)}%`, label: 'Average', border: '#fdd835' },
        { color: '#ff9800', score: `${getVal(0.75)}%`, label: 'Above Avg', border: '#ff9800' },
        { color: '#d32f2f', score: `${getVal(1.0)}%`, label: 'Critical (Max)', border: '#d32f2f' }
      ];
    }
  }, [zones, selectedMetric, currentDay, zoneTimeline]);

  // Generate trend line points for drill-down SVG
  const getTrendLinePath = (zoneId: string, metric: MetricType, width: number, height: number): string => {
    if (!zoneTimeline || !zoneTimeline[zoneId]) return '';
    const entries = zoneTimeline[zoneId];
    if (entries.length === 0) return '';

    const points = entries.map((entry) => {
      const x = ((entry.day - 1) / 29) * width;
      let val = entry[metric];
      // Normalize value to y-axis:
      let y = height;
      if (metric === 'sentiment') {
        // Sentiment runs from -1 to +1
        const norm = (val + 1) / 2; // 0 to 1
        y = height - norm * height;
      } else {
        // Protest and modal shift run from 0 to 1
        y = height - val * height;
      }
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const currentMetricLabel = {
    sentiment: 'Average Sentiment',
    protest_probability: 'Protest Participation',
    modal_shift_pct: 'Modal Shift Rate',
  }[selectedMetric];



  const getZoneStatusDetails = (zoneId: string, day: number) => {
    const sentiment = getZoneMetricValue(zoneId, 'sentiment', day);
    const protestProb = getZoneMetricValue(zoneId, 'protest_probability', day);
    const modalShift = getZoneMetricValue(zoneId, 'modal_shift_pct', day);

    // Approval %: map sentiment -1 to 1 into 0 to 100
    const approvalPct = Math.max(0, Math.min(100, Math.round((sentiment + 1) * 50)));
    // Impact %: modal shift percentage
    const impactPct = Math.max(0, Math.min(100, Math.round(modalShift * 100)));
    // Stress %: protest probability percentage
    const stressPct = Math.max(0, Math.min(100, Math.round(protestProb * 100)));
    
    // Employment %: proxy based on sentiment and modal shift
    const employmentPct = (sentiment * 8 - modalShift * 4).toFixed(1);
    
    // Top concern
    let topConcern = 'Cost of Living';
    if (protestProb > 0.35) {
      topConcern = 'Public Protest / Commuter Action';
    } else if (modalShift > 0.4) {
      topConcern = 'Travel Fares / Mode Switch';
    } else if (sentiment > 0.1) {
      topConcern = 'Infrastructure Efficiency';
    }

    // Trend calculation (compare day with day - 5)
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (zoneTimeline && zoneTimeline[zoneId] && day > 1) {
      const prevDay = Math.max(1, day - 5);
      const currVal = getZoneMetricValue(zoneId, 'protest_probability', day);
      const prevVal = getZoneMetricValue(zoneId, 'protest_probability', prevDay);
      const diff = currVal - prevVal;
      if (Math.abs(diff) > 0.01) {
        trend = diff > 0 ? 'declining' : 'improving'; // more protest = declining
      }
    }

    return {
      approvalPct,
      impactPct,
      stressPct,
      employmentPct: parseFloat(employmentPct) >= 0 ? `+${employmentPct}%` : `${employmentPct}%`,
      topConcern,
      trend,
    };
  };

  return (
    <div className="sn-card animate-in" style={{ marginBottom: 56, padding: '24px' }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 16, 
          marginBottom: 24 
        }}
      >
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--sn-text-primary)', fontWeight: 500 }}>
            Administrative Zone Heatmap
          </h2>
          <p style={{ fontSize: 13, color: 'var(--sn-text-secondary)', marginTop: 4 }}>
            Visualizing spatial distribution and network diffusion of policy responses across administrative zones.
          </p>
        </div>

        {/* Controls Layout: Toggle + Metric buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Show Values Toggle Switch */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--sn-text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={showValues} 
              onChange={(e) => setShowValues(e.target.checked)} 
              style={{ accentColor: 'var(--sn-accent-cyan)', cursor: 'pointer' }}
            />
            SHOW VALUES
          </label>

          {/* Debug Mode Toggle Switch */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--sn-text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={showDebug} 
              onChange={(e) => setShowDebug(e.target.checked)} 
              style={{ accentColor: 'var(--sn-accent-cyan)', cursor: 'pointer' }}
            />
            DEBUG MODE
          </label>

          {/* Metric Selector Buttons */}
          <div style={{ display: 'flex', background: 'var(--sn-bg-primary)', border: '1px solid var(--sn-border)', borderRadius: '8px', padding: 3 }}>
            {(['protest_probability', 'sentiment', 'modal_shift_pct'] as MetricType[]).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMetric(m)}
                style={{
                  background: selectedMetric === m ? 'var(--sn-bg-hover)' : 'transparent',
                  color: selectedMetric === m ? 'var(--sn-accent-cyan)' : 'var(--sn-text-secondary)',
                  border: 0,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {m === 'protest_probability' ? 'PROTESTS' : m === 'sentiment' ? 'SENTIMENT' : 'MODAL SHIFT'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, minHeight: 400 }}>
        {/* SVG Map Container */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--sn-bg-primary)', border: '1px solid var(--sn-border)', borderRadius: '10px', padding: 16, position: 'relative' }}>
          
          {/* Timeline Day HUD Overlay */}
          <div style={{ position: 'absolute', top: 16, left: 16, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--sn-accent-cyan)', background: 'rgba(10,15,30,0.85)', padding: '6px 12px', border: '1px solid var(--sn-border)', borderRadius: '6px', zIndex: 5 }}>
            {cityId} · DAY {currentDay} / 30
          </div>

          {/* Render SVG Hex Grid */}
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', background: 'transparent' }}>
            {/* Dotted neighbors network links */}
            {gridMappedZones.map((z, i) => (
              gridMappedZones.slice(i + 1).map((other) => {
                const dist = Math.sqrt((z.gridX - other.gridX) ** 2 + (z.gridY - other.gridY) ** 2);
                const isNeighbor = dist < spacingX * 1.3;
                if (!isNeighbor) return null;
                return (
                  <line
                    key={`link-${z.zone_id}-${other.zone_id}`}
                    x1={z.gridX}
                    y1={z.gridY}
                    x2={other.gridX}
                    y2={other.gridY}
                    stroke="var(--sn-border)"
                    strokeWidth={1.5}
                    strokeDasharray="3,3"
                    opacity={0.3}
                  />
                );
              })
            ))}

            {/* Hexagonal Zones */}
            {gridMappedZones.map((z) => {
              const isSelected = selectedZoneId === z.zone_id;
              const { color } = getZoneColorAndScore(z.zone_id, selectedMetric, currentDay);
              return (
                <g 
                  key={z.zone_id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedZoneId(z.zone_id)}
                  onMouseEnter={(e) => setHoveredZone({ zoneId: z.zone_id, x: e.clientX, y: e.clientY })}
                  onMouseMove={(e) => setHoveredZone({ zoneId: z.zone_id, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoveredZone(null)}
                >
                  <polygon
                    points={(() => {
                      const points = [];
                      for (let i = 0; i < 6; i++) {
                        const angleRad = (Math.PI / 180) * (i * 60 - 30);
                        const px = z.gridX + hexRadius * Math.cos(angleRad);
                        const py = z.gridY + hexRadius * Math.sin(angleRad);
                        points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
                      }
                      return points.join(' ');
                    })()}
                    fill={color}
                    stroke={isSelected ? 'var(--sn-accent-cyan)' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={isSelected ? 3 : 1.5}
                    style={{ transition: 'fill 300ms ease, stroke 150ms ease' }}
                  />
                </g>
              );
            })}

            {/* Labels overlay drawn on top */}
            {gridMappedZones.map((z) => {
              const isSelected = selectedZoneId === z.zone_id;
              const { score } = getZoneColorAndScore(z.zone_id, selectedMetric, currentDay);
              return (
                <g key={`label-${z.zone_id}`} style={{ pointerEvents: 'none' }}>
                  <text
                    x={z.gridX}
                    y={showValues ? z.gridY - 4 : z.gridY + 3}
                    textAnchor="middle"
                    fill={isSelected ? '#ffffff' : 'rgba(255,255,255,0.95)'}
                    fontSize="10px"
                    fontWeight="bold"
                    fontFamily="var(--font-mono)"
                    style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.95))' }}
                  >
                    {z.zone_name}
                  </text>
                  {showValues && (
                    <text
                      x={z.gridX}
                      y={z.gridY + 8}
                      textAnchor="middle"
                      fill={isSelected ? '#00e5ff' : 'rgba(255,255,255,0.85)'}
                      fontSize="9px"
                      fontWeight="bold"
                      fontFamily="var(--font-mono)"
                      style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.95))' }}
                    >
                      {score}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Timeline playback controls */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 12, marginTop: 16, borderTop: '1px solid var(--sn-border)', paddingTop: 16 }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: 'var(--sn-bg-card)',
                border: '1px solid var(--sn-border)',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--sn-text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--sn-accent-cyan)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--sn-border)')}
            >
              {isPlaying ? (
                // Pause Icon
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="4" height="16" /><rect x="16" y="4" width="4" height="16" /></svg>
              ) : (
                // Play Icon
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>

            {/* Slider */}
            <input
              type="range"
              min="1"
              max="30"
              value={currentDay}
              onChange={(e) => {
                setCurrentDay(parseInt(e.target.value, 10));
                setIsPlaying(false);
              }}
              style={{
                flex: 1,
                accentColor: 'var(--sn-accent-cyan)',
                background: 'var(--sn-border)',
                height: 6,
                borderRadius: 3,
                cursor: 'pointer',
              }}
            />
          </div>

          {/* DYNAMIC HEATMAP LEGEND */}
          <div 
            style={{ 
              width: '100%', 
              marginTop: 16, 
              borderTop: '1px solid var(--sn-border)', 
              paddingTop: 16 
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--sn-accent-cyan)', letterSpacing: '0.05em', marginBottom: 12 }}>
              HEATMAP LEGEND (COLOR SCORE KEY)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {dynamicLegendItems.map((item) => (
                <div 
                  key={item.label} 
                  style={{ 
                    background: 'var(--sn-bg-primary)', 
                    border: `1.5px solid ${item.border}`, 
                    padding: '8px 4px', 
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}
                >
                  <span style={{ fontSize: 9, color: 'var(--sn-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {item.score}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, background: item.color, borderRadius: '2px', display: 'inline-block' }} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={item.label}>
                      {item.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Debug Overlay */}
          {showDebug && (
            <div 
              style={{ 
                marginTop: 16, 
                background: 'rgba(255, 0, 85, 0.05)', 
                border: '1px solid rgba(255, 0, 85, 0.25)', 
                padding: 12, 
                fontSize: 11, 
                fontFamily: 'var(--font-mono)',
                width: '100%'
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#ff3b30', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>⚙ DATA VALIDATION OVERLAY (DEBUG MODE)</span>
                <span style={{ fontSize: 9, color: 'var(--sn-text-muted)' }}>ACTIVE METRIC: {selectedMetric.toUpperCase()}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                {gridMappedZones.map((z) => {
                  const { color, pct, label } = getZoneColorAndScore(z.zone_id, selectedMetric, currentDay);
                  const rawVal = getZoneMetricValue(z.zone_id, selectedMetric, currentDay);
                  return (
                    <div 
                      key={z.zone_id} 
                      style={{ 
                        background: '#0a0f1e', 
                        padding: '8px 12px', 
                        border: '1px solid var(--sn-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 4 }}>
                        <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{z.zone_name}</span>
                        <span style={{ color: 'var(--sn-accent-cyan)', fontSize: 10 }}>ID: {z.zone_id}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--sn-text-secondary)' }}>Raw Score:</span>
                          <span style={{ color: '#ffffff' }}>{rawVal.toFixed(4)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--sn-text-secondary)' }}>Pct Score:</span>
                          <span style={{ color: '#ffffff' }}>{pct}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--sn-text-secondary)' }}>Bucket:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 8, height: 8, background: color, display: 'inline-block', borderRadius: '1px' }} />
                            <span style={{ color, fontWeight: 'bold' }}>{label}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Zone drill-down detail panel */}
        <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--sn-border)', borderRadius: '10px', background: 'var(--sn-bg-primary)', padding: 20 }}>
          <div style={{ borderBottom: '1px solid var(--sn-border)', paddingBottom: 16, marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--sn-accent-cyan)', letterSpacing: '0.1em', marginBottom: 4 }}>
              ZONE DETAILED PROFILE
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: 'var(--sn-text-primary)' }}>
              {selectedZone.zone_name}
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sn-text-muted)' }}>
              ID: {selectedZone.zone_id}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            {/* Quick Metrics Grid */}
            {(() => {
              const status = getZoneStatusDetails(selectedZone.zone_id, currentDay);
              const approvalColorInfo = getZoneColorAndScore(selectedZone.zone_id, 'sentiment', currentDay);
              const impactColorInfo = getZoneColorAndScore(selectedZone.zone_id, 'modal_shift_pct', currentDay);
              const stressColorInfo = getZoneColorAndScore(selectedZone.zone_id, 'protest_probability', currentDay);
              const trendColors = {
                improving: '#00c853',
                declining: '#ff3b30',
                stable: '#1e90ff'
              };
              const trendSymbols = {
                improving: '▲ Improving',
                declining: '▼ Declining',
                stable: '▬ Stable'
              };
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    <div style={{ background: 'var(--sn-bg-card)', padding: 12, border: '1px solid var(--sn-border)', borderRadius: '6px' }}>
                      <span style={{ fontSize: 9, color: 'var(--sn-text-muted)', display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>APPROVAL</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: approvalColorInfo.color }}>
                        {status.approvalPct}%
                      </span>
                    </div>
                    <div style={{ background: 'var(--sn-bg-card)', padding: 12, border: '1px solid var(--sn-border)', borderRadius: '6px' }}>
                      <span style={{ fontSize: 9, color: 'var(--sn-text-muted)', display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>IMPACT</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: impactColorInfo.color }}>
                        {status.impactPct}%
                      </span>
                    </div>
                    <div style={{ background: 'var(--sn-bg-card)', padding: 12, border: '1px solid var(--sn-border)', borderRadius: '6px' }}>
                      <span style={{ fontSize: 9, color: 'var(--sn-text-muted)', display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>STRESS INDEX</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: stressColorInfo.color }}>
                        {status.stressPct}%
                      </span>
                    </div>
                    <div style={{ background: 'var(--sn-bg-card)', padding: 12, border: '1px solid var(--sn-border)', borderRadius: '6px' }}>
                      <span style={{ fontSize: 9, color: 'var(--sn-text-muted)', display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>TREND</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: trendColors[status.trend] }}>
                        {trendSymbols[status.trend]}
                      </span>
                    </div>
                  </div>

                  {/* Demographics / General Characteristics */}
                  <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(0,0,0,0.15)', padding: 12, borderRadius: '8px', border: '1px solid var(--sn-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--sn-text-secondary)' }}>Agents:</span>
                      <span style={{ color: 'var(--sn-text-primary)', fontWeight: 600 }}>{selectedZone.total_agents}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--sn-text-secondary)' }}>Employment Change:</span>
                      <span style={{ color: parseFloat(status.employmentPct) >= 0 ? '#00c853' : '#ff3b30', fontWeight: 600 }}>{status.employmentPct}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--sn-text-secondary)' }}>Top Concern:</span>
                      <span style={{ color: '#ffffff', fontWeight: 600, fontSize: 12 }}>{status.topConcern}</span>
                    </div>
                    {selectedZone.demographics && selectedZone.demographics.population_density_per_sqkm && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--sn-text-secondary)' }}>Density:</span>
                        <span style={{ color: 'var(--sn-text-primary)' }}>{selectedZone.demographics.population_density_per_sqkm.toLocaleString()} / km²</span>
                      </div>
                    )}
                    {selectedZone.income_profile && selectedZone.income_profile.median_monthly_income && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--sn-text-secondary)' }}>Median Income:</span>
                        <span style={{ color: 'var(--sn-text-primary)' }}>₹{selectedZone.income_profile.median_monthly_income.toLocaleString()} / mo</span>
                      </div>
                    )}
                    {selectedZone.commute_profile && selectedZone.commute_profile.primary_mode && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--sn-text-secondary)' }}>Primary Mode:</span>
                        <span style={{ color: 'var(--sn-text-primary)', textTransform: 'capitalize' }}>{selectedZone.commute_profile.primary_mode}</span>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Trend Chart (SVG Line Chart) */}
            {zoneTimeline && zoneTimeline[selectedZone.zone_id] ? (
              <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--sn-border)' }}>
                <span style={{ fontSize: 11, color: 'var(--sn-text-secondary)', display: 'block', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
                  {currentMetricLabel.toUpperCase()} TREND (30 DAYS)
                </span>
                <div style={{ position: 'relative', height: 100, borderLeft: '1px solid var(--sn-border)', borderBottom: '1px solid var(--sn-border)' }}>
                  {/* Grid Lines */}
                  <div style={{ position: 'absolute', top: '25%', left: 0, right: 0, height: 1, borderTop: '1px dashed rgba(255,255,255,0.08)' }} />
                  <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, borderTop: '1px dashed rgba(255,255,255,0.08)' }} />
                  <div style={{ position: 'absolute', top: '75%', left: 0, right: 0, height: 1, borderTop: '1px dashed rgba(255,255,255,0.08)' }} />
                  
                  {/* Trend Path */}
                  <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                    <path
                      d={getTrendLinePath(selectedZone.zone_id, selectedMetric, 180, 100)}
                      fill="none"
                      stroke="var(--sn-accent-cyan)"
                      strokeWidth={2}
                    />
                    {/* Pulsing indicator for current day */}
                    {(() => {
                      const entries = zoneTimeline[selectedZone.zone_id];
                      const entry = entries.find((e) => e.day === currentDay);
                      if (entry) {
                        const cx = ((currentDay - 1) / 29) * 180;
                        let val = entry[selectedMetric];
                        let cy = 100;
                        if (selectedMetric === 'sentiment') {
                          cy = 100 - ((val + 1) / 2) * 100;
                        } else {
                          cy = 100 - val * 100;
                        }
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill="var(--sn-accent-cyan)"
                            style={{ filter: 'drop-shadow(0px 0px 4px var(--sn-accent-cyan))' }}
                          />
                        );
                      }
                      return null;
                    })()}
                  </svg>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--sn-text-muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                  <span>DAY 1</span>
                  <span>DAY 15</span>
                  <span>DAY 30</span>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--sn-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, background: 'rgba(0,0,0,0.15)', borderRadius: '6px', color: 'var(--sn-text-muted)', fontSize: 12 }}>
                Timeline trends unavailable.
              </div>
            )}
          </div>
        </div>
      </div>

      {hoveredZone && (() => {
        const zone = projectedZones.find(z => z.zone_id === hoveredZone.zoneId);
        if (!zone) return null;
        const status = getZoneStatusDetails(zone.zone_id, currentDay);
        const approvalColorInfo = getZoneColorAndScore(zone.zone_id, 'sentiment', currentDay);
        const impactColorInfo = getZoneColorAndScore(zone.zone_id, 'modal_shift_pct', currentDay);
        const stressColorInfo = getZoneColorAndScore(zone.zone_id, 'protest_probability', currentDay);
        return (
          <div
            style={{
              position: 'fixed',
              left: hoveredZone.x + 12,
              top: hoveredZone.y + 12,
              background: 'rgba(10, 16, 30, 0.95)',
              border: '1px solid var(--sn-border)',
              padding: '12px 16px',
              pointerEvents: 'none',
              zIndex: 9999,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              minWidth: '180px',
              fontFamily: 'var(--font-mono)'
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: 13, color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6, marginBottom: 8 }}>
              {zone.zone_name}
            </div>
            <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--sn-text-secondary)' }}>Approval:</span>
                <span style={{ color: approvalColorInfo.color, fontWeight: 'bold' }}>{status.approvalPct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--sn-text-secondary)' }}>Impact:</span>
                <span style={{ color: impactColorInfo.color, fontWeight: 'bold' }}>{status.impactPct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--sn-text-secondary)' }}>Stress:</span>
                <span style={{ color: stressColorInfo.color, fontWeight: 'bold' }}>{status.stressPct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--sn-text-secondary)' }}>Employment:</span>
                <span style={{ color: parseFloat(status.employmentPct) >= 0 ? '#00c853' : '#ff3b30', fontWeight: 'bold' }}>{status.employmentPct}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--sn-text-secondary)', fontSize: 9 }}>TOP CONCERN:</span>
                <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 10 }}>{status.topConcern}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ color: 'var(--sn-text-secondary)' }}>Trend:</span>
                <span style={{
                  color: status.trend === 'improving' ? '#00c853' : status.trend === 'declining' ? '#ff3b30' : '#1e90ff',
                  fontWeight: 'bold'
                }}>
                  {status.trend === 'improving' ? '▲ Improving' : status.trend === 'declining' ? '▼ Declining' : '▬ Stable'}
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
