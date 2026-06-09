import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SimulationProvider } from './context/SimulationContext';
import { Breadcrumb } from './components/layout/Breadcrumb';
import Landing from './pages/Landing';
import CitySelector from './pages/CitySelector';
import PolicyInput from './pages/PolicyInput';
import PolicyQuestions from './pages/PolicyQuestions';
import SimulationRunner from './pages/SimulationRunner';
import ResultsDashboard from './pages/ResultsDashboard';
import Recommendations from './pages/Recommendations';
import './styles/globals.css';

export default function App() {
  return (
    <BrowserRouter>
      <SimulationProvider>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Breadcrumb />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/cities" element={<CitySelector />} />
              <Route path="/policy/:cityId" element={<PolicyInput />} />
              <Route path="/questions/:cityId/:policyId" element={<PolicyQuestions />} />
              <Route path="/simulate/:cityId/:policyId" element={<SimulationRunner />} />
              <Route path="/results/:sessionId" element={<ResultsDashboard />} />
              <Route path="/recommendations/:sessionId" element={<Recommendations />} />
              <Route path="*" element={<Landing />} />
            </Routes>
          </main>
        </div>
      </SimulationProvider>
    </BrowserRouter>
  );
}
