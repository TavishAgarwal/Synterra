import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CausalNodeData {
  label: string;
  agent_count: number;
  decision?: string;
  children?: CausalNodeData[];
}

interface CausalTreeNodeProps {
  node: CausalNodeData;
  depth: number;
}

function CausalTreeNode({ node, depth }: CausalTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0, position: 'relative' }}>
      {/* Visual connector lines */}
      {depth > 0 && (
        <div
          style={{
            position: 'absolute',
            left: -14,
            top: 0,
            bottom: 0,
            width: 1,
            background: 'var(--color-border-dim)',
          }}
        />
      )}
      {depth > 0 && (
        <div
          style={{
            position: 'absolute',
            left: -14,
            top: 22,
            width: 14,
            height: 1,
            background: 'var(--color-border-dim)',
          }}
        />
      )}

      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: depth === 0 ? 'rgba(0, 229, 255, 0.04)' : '#111318',
          border: `1px solid ${depth === 0 ? '#00e5ff' : '#1e2d47'}`,
          padding: '12px 16px',
          marginBottom: 10,
          cursor: hasChildren ? 'pointer' : 'default',
          userSelect: 'none',
          boxShadow: depth === 0 ? '0 0 10px rgba(0, 229, 255, 0.05)' : 'none',
          transition: 'border-color 150ms',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: depth === 0 ? 16 : 14,
              color: depth === 0 ? '#00e5ff' : 'var(--color-text-primary)',
            }}
          >
            {node.label}
          </span>
          {node.agent_count > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: 10,
                background: '#1a1c20',
                border: '1px solid #1e2d47',
                padding: '2px 8px',
                color: 'var(--color-text-secondary)',
              }}
            >
              {node.agent_count.toLocaleString()} agents
            </span>
          )}
        </div>
        {node.decision && (
          <div
            style={{
              fontFamily: 'var(--font-data)',
              fontSize: 11,
              color: 'var(--color-text-dim)',
              marginTop: 6,
              letterSpacing: '0.02em',
            }}
          >
            Action: {node.decision}
          </div>
        )}
      </div>

      {hasChildren && (
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              {node.children!.map((child, idx) => (
                <CausalTreeNode key={`${child.label}-${idx}`} node={child} depth={depth + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

interface CausalTreeProps {
  rootNode: CausalNodeData;
}

export default function CausalTree({ rootNode }: CausalTreeProps) {
  return (
    <div style={{ padding: '10px 0' }}>
      <CausalTreeNode node={rootNode} depth={0} />
    </div>
  );
}
