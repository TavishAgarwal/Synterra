import type {
  AgentFeedEntry,
  RecommendationItem,
  ResultsImpactCard,
} from '../data/simulationData';
import { API_BASE } from './config';

export interface ZoneMetrics {
  zone_id: string;
  zone_name: string;
  centroid_lat: number;
  centroid_lng: number;
  metrics: {
    sentiment: number;
    protest_probability: number;
    modal_shift_pct: number;
  };
  total_agents: number;
  demographics?: Record<string, any>;
  income_profile?: Record<string, any>;
  commute_profile?: Record<string, any>;
}

export interface ZoneTimelineEntry {
  day: number;
  sentiment: number;
  protest_probability: number;
  modal_shift_pct: number;
}

export type ZoneTimeline = Record<string, ZoneTimelineEntry[]>;

export interface SimulationMetrics {
  day: number;
  protest_probability: number;
  modal_shift_pct: number;
  revenue_impact_pct: number;
  total_agents: number;
  action_distribution: Record<string, number>;
  modal_shift_by_archetype: Record<string, number>;
  zones?: ZoneMetrics[];
}

export interface SimulationSummary {
  score: number;
  verdict: string;
  impact_cards: ResultsImpactCard[];
  why_this_score: string[];
  validation_note: string;
  recommendations: {
    necessary: RecommendationItem[];
    improvements: RecommendationItem[];
    excellence: RecommendationItem[];
    revisedScore: number;
    goldScore: number;
  };
  zones?: ZoneMetrics[];
  zone_timeline?: ZoneTimeline;
}

export interface SimulationEvent {
  event: 'sim_start' | 'day_update' | 'sim_complete' | 'sim_error';
  simulation_id: string;
  computed: boolean;
  day?: number;
  metrics?: SimulationMetrics;
  alerts?: Array<{ message: string; severity: string }>;
  agent_feed?: AgentFeedEntry[];
  tier2_broadcast_count?: number;
  summary?: SimulationSummary;
  message?: string;
}

interface RunSimulationInput {
  cityId: string;
  policyText: string;
  seed?: number;
}

const CITY_API_IDS: Record<string, string> = {
  delhi: 'DEL',
  mumbai: 'MUM',
  bengaluru: 'BLR',
  bangalore: 'BLR',
  chennai: 'CHN',
  hyderabad: 'HYD',
  kolkata: 'KOL',
};

function toApiCityId(cityId: string): string {
  const normalized = cityId.trim().toLowerCase();
  return CITY_API_IDS[normalized] ?? cityId.trim().toUpperCase();
}

async function responseDetail(response: Response): Promise<string> {
  try {
    const body = await response.text();
    if (!body) return '';
    try {
      const parsed = JSON.parse(body) as { detail?: unknown; message?: unknown };
      const detail = parsed.detail ?? parsed.message;
      return typeof detail === 'string' ? detail : JSON.stringify(detail);
    } catch {
      return body.trim();
    }
  } catch {
    return '';
  }
}

function simulationErrorMessage(response: Response, detail: string): string {
  if (response.status === 429) {
    return 'Simulation rate limit reached. Please wait one minute.';
  }
  if (response.status === 404) {
    return 'The base simulation is no longer available.';
  }
  if (
    [500, 502, 503, 504].includes(response.status) &&
    /ECONNREFUSED|proxy|connect|fetch failed/i.test(detail)
  ) {
    return 'The simulation backend is not reachable. Start it with `python3 -m backend.api.main`, then retry.';
  }
  if (detail) {
    return `Simulation service returned ${response.status}: ${detail}`;
  }
  return 'The simulation service is unavailable.';
}

async function readSseResponse(
  response: Response,
  onEvent: (event: SimulationEvent) => void
): Promise<void> {
  if (!response.ok || !response.body) {
    throw new Error(simulationErrorMessage(response, await responseDetail(response)));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    for (const chunk of chunks) {
      const line = chunk.split('\n').find((candidate) => candidate.startsWith('data: '));
      if (line) onEvent(JSON.parse(line.slice(6)) as SimulationEvent);
    }
  }
}

export async function streamSimulation(
  input: RunSimulationInput,
  onEvent: (event: SimulationEvent) => void,
  signal: AbortSignal
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city_id: toApiCityId(input.cityId),
        policy_text: input.policyText,
        time_horizon_days: 30,
        population_size: 10000,
        seed: input.seed ?? 42,
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error(
      'The simulation backend is not reachable. Start it with `python3 -m backend.api.main`, then retry.',
      { cause: error }
    );
  }

  await readSseResponse(response, onEvent);
}

export async function streamCounterfactual(
  baseSimulationId: string,
  modifiedPolicyText: string,
  onEvent: (event: SimulationEvent) => void,
  signal: AbortSignal
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/counterfactual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_simulation_id: baseSimulationId,
        branch_point_day: 0,
        modified_policy_text: modifiedPolicyText,
        seed: 43,
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error(
      'The simulation backend is not reachable. Start it with `python3 -m backend.api.main`, then retry.',
      { cause: error }
    );
  }
  await readSseResponse(response, onEvent);
}
