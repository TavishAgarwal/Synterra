export interface CityProfile {
  id: string;
  name: string;
  population: string;
  state: string;
  confidence: 'A' | 'B' | 'C';
  pills: [string, string, string];
  description: string;
  archetypes: { name: string; percent: number; color: string }[];
  sensitivities: string[];
  confidenceNote: string;
  pastPolicies: {
    name: string;
    outcome: string;
    year: number;
  }[];
}

export const cityProfiles: CityProfile[] = [
  {
    id: 'delhi',
    name: 'Delhi',
    population: '32.9M',
    state: 'Delhi, NCT',
    confidence: 'A',
    pills: ['Formal Sector', 'Railway', 'Grade A'],
    description:
      "India's capital and competitive exam hub. High railway and metro dependency across all income groups.",
    archetypes: [
      { name: 'Formal Workers', percent: 28, color: '#1aad6e' },
      { name: 'Daily Wage', percent: 18, color: '#1aad6e' },
      { name: 'Students & Aspirants', percent: 16, color: '#00e5ff' },
      { name: 'Traders & Vendors', percent: 14, color: '#ffb347' },
      { name: 'Government Employees', percent: 12, color: '#bdc2ff' },
      { name: 'Others', percent: 12, color: '#4a607a' },
    ],
    sensitivities: [
      'High examination sensitivity (north zone aspirant belt)',
      'Railway-dependent low-income commuter majority',
      'Strong trader association network in Shahdara',
      'Government employee cluster in central zones',
    ],
    confidenceNote: 'Grade A: Historical data available for hindcast validation',
    pastPolicies: [
      {
        name: 'Railway Fare Revision 2019',
        outcome: '12% ridership drop, recovered in 4 months',
        year: 2019,
      },
      {
        name: 'Odd-Even Rule 2016',
        outcome: '17% traffic reduction, limited air quality impact',
        year: 2016,
      },
    ],
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    population: '21.3M',
    state: 'Maharashtra',
    confidence: 'A',
    pills: ['Mixed Economy', 'Local Train', 'Grade A'],
    description:
      "Financial capital with the world's busiest suburban railway. Extreme commuter dependency across zones.",
    archetypes: [
      { name: 'Formal Workers', percent: 30, color: '#1aad6e' },
      { name: 'Daily Wage', percent: 15, color: '#1aad6e' },
      { name: 'Traders & Vendors', percent: 18, color: '#ffb347' },
      { name: 'Students & Aspirants', percent: 12, color: '#00e5ff' },
      { name: 'Tech Workers', percent: 14, color: '#bdc2ff' },
      { name: 'Others', percent: 11, color: '#4a607a' },
    ],
    sensitivities: [
      'Extreme dependence on suburban local train network',
      'High cost-of-living pressure on middle income groups',
      'Dense informal economy in transit-adjacent areas',
      'Strong dabba trading network sensitive to transport disruption',
    ],
    confidenceNote: 'Grade A: Historical data available for hindcast validation',
    pastPolicies: [
      {
        name: 'Local Train Fare Hike 2018',
        outcome: '8% ridership shift to buses within 2 months',
        year: 2018,
      },
      {
        name: 'COVID Lockdown Response 2020',
        outcome: 'Mass reverse migration of 2.1M informal workers',
        year: 2020,
      },
    ],
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    population: '13.2M',
    state: 'Karnataka',
    confidence: 'B',
    pills: ['Tech Workforce', 'Road', 'Grade B'],
    description:
      'IT corridor dominance. Low public transit penetration. High cab aggregator dependency.',
    archetypes: [
      { name: 'Tech Workers', percent: 32, color: '#bdc2ff' },
      { name: 'Formal Workers', percent: 20, color: '#1aad6e' },
      { name: 'Daily Wage', percent: 14, color: '#1aad6e' },
      { name: 'Students & Aspirants', percent: 12, color: '#00e5ff' },
      { name: 'Traders & Vendors', percent: 12, color: '#ffb347' },
      { name: 'Others', percent: 10, color: '#4a607a' },
    ],
    sensitivities: [
      'IT corridor employment sensitive to WFH policy changes',
      'Severe traffic congestion amplifies any transport policy',
      'Low public transit means high auto/cab dependency',
      'Growing startup ecosystem sensitive to economic policy',
    ],
    confidenceNote: 'Grade B: Limited historical policy data for validation',
    pastPolicies: [
      {
        name: 'IT Corridor Infrastructure Cess 2021',
        outcome: 'Mixed reception, 6% office relocation to suburbs',
        year: 2021,
      },
      {
        name: 'Fuel Price Surge 2022',
        outcome: '22% increase in ride-pooling adoption',
        year: 2022,
      },
    ],
  },
  {
    id: 'chennai',
    name: 'Chennai',
    population: '11.2M',
    state: 'Tamil Nadu',
    confidence: 'B',
    pills: ['Formal Sector', 'Bus', 'Grade B'],
    description:
      'Strong bus network. High examination sensitivity in southern academic belt zones.',
    archetypes: [
      { name: 'Formal Workers', percent: 26, color: '#1aad6e' },
      { name: 'Students & Aspirants', percent: 20, color: '#00e5ff' },
      { name: 'Daily Wage', percent: 16, color: '#1aad6e' },
      { name: 'Traders & Vendors', percent: 14, color: '#ffb347' },
      { name: 'Government Employees', percent: 14, color: '#bdc2ff' },
      { name: 'Others', percent: 10, color: '#4a607a' },
    ],
    sensitivities: [
      'Highest NEET aspirant density in southern India',
      'Strong MTC bus dependency across income groups',
      'Academic coaching industry concentrated in T. Nagar belt',
      'High sensitivity to examination format changes',
    ],
    confidenceNote: 'Grade B: Limited historical policy data for validation',
    pastPolicies: [
      {
        name: 'NEET Implementation Resistance 2017',
        outcome: 'State-wide protests, temporary exemption sought',
        year: 2017,
      },
      {
        name: 'Bus Fare Rationalization 2019',
        outcome: '5% ridership impact, stabilized in 2 months',
        year: 2019,
      },
    ],
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    population: '10.5M',
    state: 'Telangana',
    confidence: 'B',
    pills: ['Mixed', 'Metro', 'Grade B'],
    description:
      'Rapid IT expansion in HITEC corridor. Growing metro network with high aspirant population.',
    archetypes: [
      { name: 'Tech Workers', percent: 24, color: '#bdc2ff' },
      { name: 'Formal Workers', percent: 22, color: '#1aad6e' },
      { name: 'Students & Aspirants', percent: 16, color: '#00e5ff' },
      { name: 'Traders & Vendors', percent: 14, color: '#ffb347' },
      { name: 'Daily Wage', percent: 14, color: '#1aad6e' },
      { name: 'Others', percent: 10, color: '#4a607a' },
    ],
    sensitivities: [
      'HITEC City corridor sensitive to employment policy',
      'Growing metro ridership — still building adoption',
      'Large aspirant population in competitive exam belt',
      'Pharmaceutical sector adds unique economic sensitivity',
    ],
    confidenceNote: 'Grade B: Limited historical policy data for validation',
    pastPolicies: [
      {
        name: 'Metro Phase 2 Extension 2022',
        outcome: '18% ridership increase in HITEC corridor',
        year: 2022,
      },
      {
        name: 'IT Policy Incentives 2020',
        outcome: '14% growth in tech employment over 18 months',
        year: 2020,
      },
    ],
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    population: '15.1M',
    state: 'West Bengal',
    confidence: 'C',
    pills: ['Formal Sector', 'Metro', 'Grade C'],
    description:
      "India's oldest metro. High informal economy share. Strong trade union influence on policy response.",
    archetypes: [
      { name: 'Formal Workers', percent: 22, color: '#1aad6e' },
      { name: 'Daily Wage', percent: 20, color: '#1aad6e' },
      { name: 'Traders & Vendors', percent: 18, color: '#ffb347' },
      { name: 'Students & Aspirants', percent: 14, color: '#00e5ff' },
      { name: 'Government Employees', percent: 14, color: '#bdc2ff' },
      { name: 'Others', percent: 12, color: '#4a607a' },
    ],
    sensitivities: [
      'Strong trade union influence amplifies policy resistance',
      'High informal economy share makes economic policy volatile',
      'India\u2019s oldest metro — aging infrastructure sensitivity',
      'Cultural hub with unique response to social policy',
    ],
    confidenceNote: 'Grade C: Limited data, wider confidence intervals apply',
    pastPolicies: [
      {
        name: 'Metro Fare Revision 2020',
        outcome: '15% ridership drop, union-led resistance for 3 months',
        year: 2020,
      },
      {
        name: 'Street Vendor Regulation 2019',
        outcome: 'Significant informal economy disruption, partially rolled back',
        year: 2019,
      },
    ],
  },
];

export function getCityById(id: string): CityProfile | undefined {
  return cityProfiles.find((c) => c.id === id);
}
