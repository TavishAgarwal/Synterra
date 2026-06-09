export interface City {
  id: string;
  name: string;
  state: string;
  population: string;
  dominantArchetype: string;
  primaryTransport: string;
  confidenceGrade: 'A' | 'B' | 'C';
  description: string;
  keySensitivities: string[];
  coordinates: { lat: number; lng: number };
  similarPastPolicies: {
    name: string;
    outcome: string;
    year: number;
  }[];
}

export interface DemoPolicy {
  id: string;
  label: string;
  category: 'TRANSPORT' | 'EXAMINATION' | 'ECONOMIC' | 'EMPLOYMENT';
  fullText: string;
  score: number;
  verdict: 'Apply as-is' | 'Apply with changes' | 'Redesign Recommended';
}

export interface QuestionOption {
  label: string;
  value: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
}

export interface SimulationSession {
  sessionId: string;
  cityId: string;
  policyId: string;
  policyText: string;
  answers: Record<string, string>;
  startedAt: number;
}

export interface AgentDecision {
  timestamp: string;
  agentName: string;
  zone: string;
  decision: string;
  type: 'adaptation' | 'stress' | 'resistance' | 'broadcast';
}

export interface InsightCard {
  day: number;
  label: string;
  metric: string;
  explanation: string;
  type: 'positive' | 'warning' | 'critical';
}

export interface SimulationResult {
  sessionId: string;
  score: number;
  verdict: string;
  verdictExplanation: string;
  impacts: {
    category: string;
    value: string;
    explanation: string;
    type: 'positive' | 'negative' | 'neutral';
  }[];
  scoreExplanation: string;
  validationNote: string;
}

export interface Recommendation {
  title: string;
  scoreDelta: number;
  explanation: string;
  affects: string[];
  tier: 'necessary' | 'improvement' | 'excellence';
}
