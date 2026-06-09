export type AgentDecisionType = 'adaptation' | 'stress' | 'resistance' | 'broadcast';

export interface AgentFeedEntry {
  name: string;
  zone: string;
  decision: string;
  type: AgentDecisionType;
}

export interface InsightCard {
  day: number;
  color: string;
  label: string;
  metric: string;
  explanation: string;
}

export interface GovAgentState {
  normalText: string;
  alertText: string;
  alertDetail: string;
  alertSuggestion: string;
}

export interface ResultsImpactCard {
  category: string;
  value: string;
  color: string;
  explanation: string;
}

export interface RecommendationItem {
  title: string;
  scoreDelta: number;
  explanation: string;
  affects: string;
}

export interface PolicySimulationData {
  agentFeed: AgentFeedEntry[];
  insights: InsightCard[];
  govAgent: GovAgentState;
  results: {
    impactCards: ResultsImpactCard[];
    whyThisScore: string[];
    validationNote: string;
  };
  recommendations: {
    necessary: RecommendationItem[];
    improvements: RecommendationItem[];
    excellence: RecommendationItem[];
    revisedScore: number;
    goldScore: number;
  };
}

// Default simulation data keyed by policy ID
const simulationDataMap: Record<string, PolicySimulationData> = {
  'railway-fare-20': {
    agentFeed: [
      { name: 'Ramesh', zone: 'Dwarka', decision: 'Recalculating monthly transport budget', type: 'adaptation' },
      { name: 'Sunita', zone: 'Shahdara', decision: 'EMI + new fare exceeds 18% of income', type: 'stress' },
      { name: 'Vikram', zone: 'Rohini', decision: 'Switched to DTC bus for short leg', type: 'adaptation' },
      { name: 'Priya', zone: 'Pitampura', decision: 'Broadcasting switch decision to 34 contacts', type: 'broadcast' },
      { name: 'Abdul', zone: 'Mustafabad', decision: 'Flagging transport cost as unsustainable', type: 'resistance' },
      { name: 'Meena', zone: 'Janakpuri', decision: 'Consolidated 3 market trips into 1', type: 'adaptation' },
      { name: 'Rajesh', zone: 'Seelampur', decision: 'Street vendor viability threshold triggered', type: 'stress' },
      { name: 'Kavita', zone: 'Shahdara', decision: 'Joined local resistance signal cluster', type: 'resistance' },
      { name: 'Amit', zone: 'Rohini', decision: 'Tier 2 journalist filing coverage report', type: 'broadcast' },
      { name: 'Lakshmi', zone: 'Dwarka', decision: 'Switched to cycling for 2km last mile', type: 'adaptation' },
      { name: 'Suresh', zone: 'Mustafabad', decision: 'Return migration evaluation triggered', type: 'resistance' },
      { name: 'Geeta', zone: 'Pitampura', decision: 'Reduced coaching centre trips (2→1/day)', type: 'stress' },
      { name: 'Harpreet', zone: 'GTB Nagar', decision: 'Coalition signal broadcast to 47 agents', type: 'broadcast' },
      { name: 'Deepak', zone: 'Janakpuri', decision: 'WFH request filed with employer', type: 'adaptation' },
      { name: 'Salma', zone: 'Seelampur', decision: 'Vendor bandh coordination signal sent', type: 'resistance' },
    ],
    insights: [
      {
        day: 5,
        color: '#1aad6e',
        label: 'MODAL SHIFT DETECTED',
        metric: '14% of commuters',
        explanation: 'have already switched from rail to alternative modes',
      },
      {
        day: 12,
        color: '#ffb347',
        label: 'ECONOMIC STRESS SIGNAL',
        metric: '₹340 Cr',
        explanation: 'estimated monthly revenue reduction in transit-adjacent informal economy',
      },
      {
        day: 20,
        color: '#ff0055',
        label: 'RESISTANCE THRESHOLD',
        metric: '38% protest probability',
        explanation: 'in Shahdara and Northeast zones — Government Agent has flagged this',
      },
    ],
    govAgent: {
      normalText:
        'No alerts. Monitoring protest probability, modal shift rate, and economic stress signals across all zones.',
      alertText:
        'Protest probability in Shahdara has exceeded 35% threshold. Autonomous recommendation generated without user request.',
      alertDetail:
        'Suggested alternative: Phase the increase at 10% over 60 days. Projected resistance reduction: 58%.',
      alertSuggestion: 'Generated at Day 18 · No human instruction',
    },
    results: {
      impactCards: [
        { category: 'RIDERSHIP IMPACT', value: '-19%', color: '#ff0055', explanation: '1 in 5 regular commuters switches to alternative modes within 30 days. Informal economy near stations bears the brunt.' },
        { category: 'REVENUE GENERATED', value: '+₹180 Cr/mo', color: '#1aad6e', explanation: 'Projected monthly revenue increase for Indian Railways, partially offset by ridership loss.' },
        { category: 'ECONOMIC IMPACT', value: '-₹340 Cr/mo', color: '#ff0055', explanation: 'Estimated loss to transit-adjacent informal economy — street vendors, auto drivers, and market traders.' },
        { category: 'CITIZEN RESISTANCE', value: '38%', color: '#ffb347', explanation: 'Protest probability in affected zones. Threshold for public agitation is typically 30-35%.' },
        { category: 'MOST AFFECTED GROUP', value: 'Daily Wage Workers', color: '#e2e2e8', explanation: 'Transport cost rises to 18% of income for this group — above the 12% threshold where behavioural change becomes forced.' },
        { category: 'RECOVERY TIME', value: '4-6 months', color: '#e2e2e8', explanation: 'Estimated time for modal shift to stabilise and informal economy to adapt to new footfall levels.' },
      ],
      whyThisScore: [
        'The policy generates meaningful railway revenue but imposes disproportionate costs on the city\'s most transit-dependent citizens. Daily wage workers, street vendors, and migrant workers — who have no alternative to public transit — see their transport costs rise above the threshold where behavioural change becomes forced, not chosen.',
        'The informal economy impact is the most significant finding. When low-income commuters reduce transit usage, footfall at transit-adjacent markets collapses within 7-10 days. The resulting economic stress cascades through 847 micro-businesses in the affected zones, ultimately costing the urban economy more than the railway revenue gain.',
        'The 38% protest probability flag from the Government Agent is consistent with historical patterns: policies crossing the 35% threshold have faced organised resistance in 7 of the last 9 comparable Indian policy implementations.',
      ],
      validationNote:
        'This analysis is based on a hindcast-validated simulation model. In a comparable scenario (Delhi Metro fare revision, 2019), the model predicted ridership change within 8% of the actual outcome.',
    },
    recommendations: {
      necessary: [
        { title: 'Exempt BPL cardholders', scoreDelta: 12, explanation: 'Full fare exemption for below-poverty-line commuters prevents the forced behavioural change in the most vulnerable group. This change alone removes the primary driver of economic cascade.', affects: 'Daily Wage Workers, Street Vendors, Migrant Workers' },
        { title: 'Phase implementation over 60 days', scoreDelta: 8, explanation: 'A phased increase gives agents time to adjust budgets and find alternatives without a shock response. Protest probability drops from 38% to 21% under a 60-day phase schedule.', affects: 'All commuter archetypes, Trader associations' },
        { title: 'Announce compensatory bus augmentation', scoreDelta: 6, explanation: 'Adding 15% bus frequency on routes parallel to high-fare rail corridors provides a credible alternative that reduces forced switching to walking, which damages informal economy footfall.', affects: 'Daily Wage Workers, Homemakers, Street Vendors' },
      ],
      improvements: [
        { title: 'Cap fare increase for second class at 10%', scoreDelta: 9, explanation: 'Applying the full 20% only to first and AC class protects the income groups with no alternative while still achieving 70% of the revenue target.', affects: 'Formal Sector Employees, Government Employees' },
        { title: 'Monthly pass discount for regular commuters', scoreDelta: 5, explanation: 'A 15% discount on monthly passes rewards consistent ridership, reduces revenue volatility, and keeps the formal sector commuter base from switching to cab aggregators.', affects: 'Formal Sector Employees, Tech Workers' },
      ],
      excellence: [
        { title: 'Link fare revision to inflation index', scoreDelta: 4, explanation: 'Automatic annual adjustments tied to CPI removes the political shock of sudden large increases. Citizens build expectation of gradual change into their financial planning.', affects: 'All archetypes' },
        { title: 'Transparent revenue allocation', scoreDelta: 3, explanation: 'Announcing that 40% of incremental revenue goes to network improvement increases institutional trust by 8-12 points in simulation. Citizen agents with visible benefit rationale show lower resistance.', affects: 'Government Employees, Tech Workers, Journalists' },
      ],
      revisedScore: 77,
      goldScore: 89,
    },
  },
};

// Generate generic simulation data for policies without custom data
function generateGenericData(_policyLabel: string, score: number): PolicySimulationData {
  const isGood = score >= 70;
  const isMid = score >= 50 && score < 70;

  return {
    agentFeed: [
      { name: 'Priya', zone: 'Andheri', decision: 'Evaluating impact on monthly budget', type: 'adaptation' },
      { name: 'Rahul', zone: 'Shahdara', decision: 'Sharing policy news with local network', type: 'broadcast' },
      { name: 'Sunita', zone: 'Rohini', decision: 'Adjusting daily routine in response', type: 'adaptation' },
      { name: 'Mohammed', zone: 'Kurla', decision: isGood ? 'Positive reception noted' : 'Flagged financial concern', type: isGood ? 'adaptation' : 'stress' },
      { name: 'Kavita', zone: 'Koramangala', decision: 'Discussed with family members', type: 'adaptation' },
      { name: 'Arjun', zone: 'GTB Nagar', decision: isMid ? 'Moderate concern expressed' : (isGood ? 'Policy welcomed' : 'Strong opposition signal'), type: isGood ? 'adaptation' : (isMid ? 'stress' : 'resistance') },
      { name: 'Lakshmi', zone: 'T. Nagar', decision: 'Calculating alternative options', type: 'adaptation' },
      { name: 'Deepak', zone: 'Bandra', decision: 'Filing workplace accommodation request', type: 'adaptation' },
      { name: 'Meena', zone: 'Dwarka', decision: isGood ? 'Enrolling in new programme' : 'Cost impact assessment', type: isGood ? 'adaptation' : 'stress' },
      { name: 'Vikram', zone: 'Whitefield', decision: 'Broadcasting analysis to 28 contacts', type: 'broadcast' },
      { name: 'Salma', zone: 'Seelampur', decision: isGood ? 'Community benefit noted' : 'Community concern raised', type: isGood ? 'broadcast' : 'resistance' },
      { name: 'Harpreet', zone: 'HITEC City', decision: 'Updated financial planning model', type: 'adaptation' },
      { name: 'Geeta', zone: 'Pitampura', decision: isMid ? 'Seeking clarification on terms' : 'Processing policy change', type: 'adaptation' },
      { name: 'Suresh', zone: 'Salt Lake', decision: isGood ? 'Benefit calculation complete' : 'Hardship flag raised', type: isGood ? 'adaptation' : 'resistance' },
      { name: 'Amit', zone: 'Rohini', decision: 'Media coverage analysis shared', type: 'broadcast' },
    ],
    insights: [
      {
        day: 5,
        color: isGood ? '#1aad6e' : '#ffb347',
        label: isGood ? 'POSITIVE ADOPTION SIGNAL' : 'ADJUSTMENT PATTERN DETECTED',
        metric: isGood ? '72% acceptance' : '34% adjusting',
        explanation: isGood ? 'of affected citizens show positive response in first week' : 'of affected citizens have begun modifying daily routines',
      },
      {
        day: 12,
        color: isMid ? '#ffb347' : (isGood ? '#1aad6e' : '#ff0055'),
        label: isMid ? 'MIXED SIGNAL' : (isGood ? 'ECONOMIC BENEFIT' : 'ECONOMIC STRESS'),
        metric: isGood ? '+₹120 Cr' : (isMid ? '₹85 Cr impact' : '-₹280 Cr'),
        explanation: isGood ? 'estimated positive economic impact across affected sectors' : 'estimated economic disruption in affected sectors',
      },
      {
        day: 20,
        color: isGood ? '#1aad6e' : (isMid ? '#ffb347' : '#ff0055'),
        label: isGood ? 'STABILITY CONFIRMED' : 'RESISTANCE LEVEL',
        metric: isGood ? '8% resistance' : (isMid ? '24% concern' : '42% resistance'),
        explanation: isGood ? 'well below protest threshold — policy is stable' : (isMid ? 'approaching threshold — monitor closely' : 'exceeding protest threshold in multiple zones'),
      },
    ],
    govAgent: {
      normalText: 'No alerts. Monitoring all impact vectors across affected zones.',
      alertText: isGood
        ? 'Policy implementation proceeding within expected parameters. No autonomous intervention required.'
        : 'Stress indicators approaching threshold in 2 zones. Autonomous monitoring intensified.',
      alertDetail: isGood
        ? 'All zones showing stable adaptation patterns. Continue monitoring.'
        : 'Recommended: Consider phased rollout to reduce shock factor by 40%.',
      alertSuggestion: 'Generated at Day 18 · No human instruction',
    },
    results: {
      impactCards: [
        { category: 'PRIMARY IMPACT', value: isGood ? 'Positive' : (isMid ? 'Mixed' : 'Negative'), color: isGood ? '#1aad6e' : (isMid ? '#ffb347' : '#ff0055'), explanation: `Overall impact assessment based on 10,000 agent responses over 30 simulated days.` },
        { category: 'AFFECTED POPULATION', value: isGood ? '45%' : '67%', color: '#e2e2e8', explanation: 'Percentage of simulated population directly affected by this policy change.' },
        { category: 'ECONOMIC EFFECT', value: isGood ? 'Net positive' : 'Net negative', color: isGood ? '#1aad6e' : '#ff0055', explanation: 'Aggregate economic impact across all affected sectors and income groups.' },
        { category: 'CITIZEN SENTIMENT', value: isGood ? 'Supportive' : (isMid ? 'Divided' : 'Opposed'), color: isGood ? '#1aad6e' : (isMid ? '#ffb347' : '#ff0055'), explanation: 'Aggregate sentiment from citizen agent responses and social network signals.' },
        { category: 'ADAPTATION TIME', value: isGood ? '2-3 weeks' : '3-5 months', color: '#e2e2e8', explanation: 'Estimated time for the affected population to fully adapt to the new policy.' },
        { category: 'RISK LEVEL', value: isGood ? 'Low' : (isMid ? 'Moderate' : 'High'), color: isGood ? '#1aad6e' : (isMid ? '#ffb347' : '#ff0055'), explanation: 'Overall risk assessment including protest probability and economic disruption.' },
      ],
      whyThisScore: [
        `This policy scores ${score}/100 based on a comprehensive simulation of 10,000 AI citizens across all demographic segments.`,
        isGood
          ? 'The simulation shows strong positive adoption patterns with minimal resistance. Economic impact is net positive, and the affected populations have sufficient alternatives and adaptation mechanisms.'
          : 'The simulation reveals significant concerns about disproportionate impact on vulnerable populations. The absence of adequate alternatives forces behavioural changes that cascade through the informal economy.',
        isGood
          ? 'Historical validation suggests policies with similar profiles have been successfully implemented in comparable Indian cities.'
          : 'Historical patterns suggest that policies with similar impact profiles face organised resistance and may require substantial modification before implementation.',
      ],
      validationNote: 'This analysis is based on a simulation model validated against historical Indian policy implementations.',
    },
    recommendations: {
      necessary: isGood ? [] : [
        { title: 'Add exemption for vulnerable groups', scoreDelta: 10, explanation: 'Protecting the most affected demographic prevents cascade effects in the informal economy.', affects: 'Low-income groups, Daily Wage Workers' },
        { title: 'Phase the implementation', scoreDelta: 8, explanation: 'Gradual rollout reduces shock and allows natural adaptation to occur.', affects: 'All affected groups' },
      ],
      improvements: [
        { title: 'Improve communication strategy', scoreDelta: 5, explanation: 'Clear, advance communication reduces uncertainty and builds institutional trust.', affects: 'All archetypes' },
        { title: 'Add feedback mechanism', scoreDelta: 4, explanation: 'A formal feedback channel allows real-time adjustment based on ground-level impact data.', affects: 'All archetypes' },
      ],
      excellence: [
        { title: 'Link to outcome metrics', scoreDelta: 3, explanation: 'Tying the policy to measurable outcomes increases accountability and public trust.', affects: 'All archetypes' },
      ],
      revisedScore: Math.min(score + 22, 95),
      goldScore: Math.min(score + 32, 98),
    },
  };
}

export function getSimulationData(policyId: string, policyLabel: string, score: number): PolicySimulationData {
  return simulationDataMap[policyId] || generateGenericData(policyLabel, score);
}
