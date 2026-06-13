import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSimulationContext } from '../../context/SimulationContext';
import logoImg from '../../assets/synterra-logo.jpg';

const steps = ['City', 'Policy', 'Questions', 'Simulate', 'Results'];

function stepFromPath(pathname: string): number {
  if (pathname.startsWith('/cities')) return 0;
  if (pathname.startsWith('/policy')) return 1;
  if (pathname.startsWith('/questions')) return 1;
  if (pathname.startsWith('/simulate')) return 3;
  if (pathname.startsWith('/results')) return 4;
  if (pathname.startsWith('/recommendations')) return 4;
  return -1;
}

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedCity, selectedPolicy, sessionId } = useSimulationContext();
  const activeStep = stepFromPath(location.pathname);

  if (activeStep < 0) return null;

  const handleStepClick = (index: number) => {
    if (index > activeStep) return;
    if (index === 0) navigate('/cities');
    if (index === 1) navigate(selectedCity ? `/policy/${selectedCity.id}` : '/cities');
    if (index === 2 && selectedCity && selectedPolicy) navigate(`/questions/${selectedCity.id}/${selectedPolicy.id}`);
    if (index === 3 && selectedCity && selectedPolicy) navigate(`/simulate/${selectedCity.id}/${selectedPolicy.id}`);
    if (index === 4) navigate(sessionId ? `/results/${sessionId}` : '/cities');
  };

  return (
    <div
      className="no-print"
      style={{
        height: 52,
        background: '#0d0f14',
        borderBottom: '1px solid #1e2d47',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Clickable Logo redirects to main page */}
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'transparent',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <img
          src={logoImg}
          alt="Synterra Logo"
          style={{
            height: 32,
            width: 'auto',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 14,
            fontWeight: 'bold',
            color: '#00e5ff',
            letterSpacing: '0.15em',
          }}
        >
          SYNTERRA
        </span>
      </button>

      {/* Centered Steps */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {steps.map((label, index) => {
          const isActive = index === activeStep;
          const isCompleted = index < activeStep;
          return (
            <React.Fragment key={label}>
              {index > 0 && <div style={{ width: 40, height: 1, background: '#1e2d47', margin: '0 8px' }} />}
              <button
                onClick={() => handleStepClick(index)}
                style={{
                  background: 'transparent',
                  border: 0,
                  color: isActive ? '#00e5ff' : isCompleted ? 'var(--color-text-secondary)' : 'var(--color-text-ghost)',
                  fontFamily: 'var(--font-data)',
                  fontSize: 10,
                  display: 'grid',
                  justifyItems: 'center',
                  gap: 3,
                  cursor: index <= activeStep ? 'pointer' : 'default',
                  minWidth: 54,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    border: `1px solid ${isActive || isCompleted ? '#00e5ff' : 'var(--color-text-ghost)'}`,
                    background: isActive || isCompleted ? '#00e5ff' : 'transparent',
                    display: 'block',
                  }}
                />
                {label}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Spacer to keep center elements centered in flexbox */}
      <div style={{ width: 140 }} />
    </div>
  );
};
