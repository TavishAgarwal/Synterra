import React from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { TopNav } from './TopNav';
import { SideNav } from './SideNav';
import { StatusBar } from './StatusBar';

interface AppShellProps {
  children: React.ReactNode;
  showInitiateButton?: boolean;
  onInitiate?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  showInitiateButton = false,
  onInitiate,
}) => {
  const location = useLocation();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--color-void)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <TopNav />
      <SideNav showInitiateButton={showInitiateButton} onInitiate={onInitiate} />
      <StatusBar />

      {/* Main content area */}
      <main
        style={{
          marginLeft: 240,
          marginTop: 48,
          marginBottom: 32,
          height: 'calc(100vh - 48px - 32px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 16,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ height: '100%' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
