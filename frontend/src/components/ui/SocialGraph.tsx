import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';

export interface GraphNode {
  id: string;
  archetype: string;
  sentiment: number;
  tier: number;
  action: string;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

interface SocialGraphProps {
  nodes: GraphNode[];
  width?: number;
  height?: number;
}

const actionColors: Record<string, string> = {
  no_change: '#1aad6e',     // Stable adaptation
  mode_switch: '#ffb347',   // Adaptation stress
  trip_consolidation: '#ffb347',
  protest_join: '#ff0055',  // Resistance
  broadcast: '#00e5ff',     // Amplification
};

export default function SocialGraph({ nodes: inputNodes, width = 500, height = 300 }: SocialGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoveredNodeRef = useRef<any>(null);

  // Generate stable links based on node archetypes and index
  const links = useMemo(() => {
    const generatedLinks: GraphLink[] = [];
    if (inputNodes.length < 2) return generatedLinks;

    for (let i = 0; i < inputNodes.length; i++) {
      const source = inputNodes[i];
      
      // Connect to next node
      if (i < inputNodes.length - 1) {
        generatedLinks.push({ source: source.id, target: inputNodes[i + 1].id });
      }
      
      // Connect nodes of same archetype or tier with some probability
      for (let j = i + 2; j < inputNodes.length; j++) {
        const target = inputNodes[j];
        const sameArch = source.archetype === target.archetype;
        const sameTier = source.tier === target.tier;
        const rand = Math.random();
        
        if ((sameArch && rand < 0.25) || (sameTier && rand < 0.15 && source.tier > 1)) {
          generatedLinks.push({ source: source.id, target: target.id });
        }
      }
    }
    return generatedLinks;
  }, [inputNodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Deep copy input nodes to keep D3 properties stable
    const d3Nodes = inputNodes.map((n) => ({ ...n })) as d3.SimulationNodeDatum[];
    const d3Links = links.map((l) => ({
      source: d3Nodes.find((n) => (n as any).id === l.source) || l.source,
      target: d3Nodes.find((n) => (n as any).id === l.target) || l.target,
    })) as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[];

    // Configure simulation forces
    const simulation = d3.forceSimulation(d3Nodes)
      .force('link', d3.forceLink(d3Links).distance(50).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-80))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(14));

    // Handle updates and drawing inside simulation ticks
    simulation.on('tick', () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw links (edges)
      d3Links.forEach((link) => {
        const source = link.source as any;
        const target = link.target as any;
        if (!source || !target) return;

        const isHighlighted = hoveredNodeRef.current && 
          (source.id === hoveredNodeRef.current.id || target.id === hoveredNodeRef.current.id);

        // Color based on source agent state
        ctx.strokeStyle = isHighlighted ? 'var(--color-primary)' : (actionColors[source.action] || 'rgba(59, 73, 76, 0.2)');
        ctx.lineWidth = isHighlighted ? 2 : 1;
        ctx.globalAlpha = isHighlighted ? 0.8 : (source.action === 'protest_join' || source.action === 'broadcast' ? 0.45 : 0.15);
        
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      });

      ctx.globalAlpha = 1.0;
      ctx.lineWidth = 1;

      // 2. Draw nodes
      d3Nodes.forEach((node: any) => {
        const color = actionColors[node.action] || '#849396';
        const isTriggered = node.action === 'protest_join' || node.action === 'broadcast';
        const isHovered = hoveredNodeRef.current && node.id === hoveredNodeRef.current.id;

        ctx.save();
        ctx.translate(node.x, node.y);

        // Draw pulsing rings for active or hovered nodes
        if (isTriggered || isHovered) {
          ctx.beginPath();
          ctx.arc(0, 0, (isHovered ? 12 : 10) + Math.sin(Date.now() * 0.01) * 3, 0, 2 * Math.PI);
          ctx.strokeStyle = isHovered ? 'var(--color-primary)' : color;
          ctx.lineWidth = isHovered ? 2 : 1.5;
          ctx.globalAlpha = isHovered ? 0.6 : 0.4;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }

        // Draw node center circle
        ctx.beginPath();
        ctx.arc(0, 0, node.tier === 3 ? 7 : (node.tier === 2 ? 6 : 4.5), 0, 2 * Math.PI);
        ctx.fillStyle = color;
        
        // Add drop shadow or inner glow for active or hovered nodes
        if (isTriggered || isHovered) {
          ctx.shadowBlur = isHovered ? 15 : 10;
          ctx.shadowColor = isHovered ? 'var(--color-primary)' : color;
        }
        ctx.fill();
        ctx.restore();
      });
    });

    // Mouse move tracking inside the canvas element
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let closest: any = null;
      let minDistance = 16;

      d3Nodes.forEach((node: any) => {
        if (node.x === undefined || node.y === undefined) return;
        const dx = node.x - mouseX;
        const dy = node.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) {
          closest = node;
          minDistance = dist;
        }
      });

      if (closest !== hoveredNodeRef.current) {
        hoveredNodeRef.current = closest;
        if (closest) {
          setHoveredAgent({
            id: closest.id,
            archetype: closest.archetype,
            sentiment: closest.sentiment,
            tier: closest.tier,
            action: closest.action
          });
          setTooltipPos({ x: closest.x, y: closest.y });
        } else {
          setHoveredAgent(null);
        }
      } else if (closest) {
        // Smooth tooltip tracking while physics are settling
        setTooltipPos({ x: closest.x, y: closest.y });
      }
    };

    const onMouseLeave = () => {
      hoveredNodeRef.current = null;
      setHoveredAgent(null);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);

    // Run animation frames for pulsing triggers
    let animId: number;
    const animateRings = () => {
      simulation.alphaTarget(0.01).restart();
      animId = requestAnimationFrame(animateRings);
    };
    animId = requestAnimationFrame(animateRings);

    return () => {
      simulation.stop();
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [inputNodes, links, width, height]);

  return (
    <div style={{ position: 'relative', width, height, background: 'rgba(10,12,16,0.5)', border: '1px solid #1e2d47' }}>
      <canvas ref={canvasRef} width={width} height={height} />
      
      {/* Floating Tooltip Div */}
      {hoveredAgent && (
        <div style={{
          position: 'absolute',
          left: Math.max(10, Math.min(width - 175, tooltipPos.x + 10)),
          top: Math.max(10, Math.min(height - 115, tooltipPos.y - 95)),
          background: '#0b0f19',
          border: '1px solid var(--color-primary-border)',
          borderRadius: 6,
          padding: '8px 12px',
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
          zIndex: 10,
          width: 165,
          fontFamily: 'var(--font-data)',
          fontSize: 9,
          lineHeight: 1.4
        }}>
          <div style={{ color: 'var(--color-primary)', fontWeight: 'bold', borderBottom: '1px solid var(--color-border)', paddingBottom: 4, marginBottom: 4 }}>
            {hoveredAgent.id.split('_')[0] || 'Agent'}
          </div>
          <div>Archetype: <span style={{ color: 'var(--color-text-primary)' }}>{hoveredAgent.archetype}</span></div>
          <div>Tier: <span style={{ color: 'var(--color-text-primary)' }}>{hoveredAgent.tier}</span></div>
          <div>Sentiment: <span style={{ color: hoveredAgent.sentiment < -0.3 ? 'var(--color-alert)' : 'var(--color-success)' }}>
            {hoveredAgent.sentiment.toFixed(2)}
          </span></div>
          <div>Action: <span style={{ color: actionColors[hoveredAgent.action] || 'var(--color-text-primary)', textTransform: 'capitalize' }}>
            {hoveredAgent.action.replace('_', ' ')}
          </span></div>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 10, fontFamily: 'var(--font-data)', fontSize: 9, color: 'var(--color-text-dim)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, background: '#1aad6e', borderRadius: '50%' }} /> Adaptation</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, background: '#ffb347', borderRadius: '50%' }} /> Stress</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, background: '#ff0055', borderRadius: '50%' }} /> Protest</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, background: '#00e5ff', borderRadius: '50%' }} /> Broadcast</div>
      </div>
    </div>
  );
}
