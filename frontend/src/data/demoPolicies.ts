export type PolicyCategory = 'TRANSPORT' | 'EXAMINATION' | 'ECONOMIC' | 'EMPLOYMENT';

export interface DemoPolicy {
  id: string;
  label: string;
  fullText: string;
  category: PolicyCategory;
  score: number;
  verdict: string;
  verdictClass: 'success' | 'warn' | 'alert';
}

export const demoPolicies: DemoPolicy[] = [
  {
    id: 'railway-fare-20',
    label: 'Railway Fare +20%',
    fullText:
      'Indian Railways increases all suburban fares by 20% effective from next month across all classes.',
    category: 'TRANSPORT',
    score: 41,
    verdict: 'Redesign Recommended',
    verdictClass: 'alert',
  },
  {
    id: 'metro-free-women',
    label: 'Metro Free for Women',
    fullText:
      'Delhi Metro Rail Corporation makes all metro rides free for women commuters starting next quarter.',
    category: 'TRANSPORT',
    score: 82,
    verdict: 'Apply as-is',
    verdictClass: 'success',
  },
  {
    id: 'neet-online',
    label: 'NEET Goes Online',
    fullText:
      'NTA shifts NEET examination to fully online mode with biometric verification at certified centres.',
    category: 'EXAMINATION',
    score: 63,
    verdict: 'Apply with changes',
    verdictClass: 'warn',
  },
  {
    id: 'fuel-price-15',
    label: 'Fuel Price +₹15/L',
    fullText:
      'Central government increases petrol and diesel prices by ₹15 per litre effective immediately.',
    category: 'ECONOMIC',
    score: 28,
    verdict: 'Redesign Recommended',
    verdictClass: 'alert',
  },
  {
    id: 'wfh-mandate-removed',
    label: 'WFH Mandate Removed',
    fullText:
      'Government directs all central government employees to return to office 5 days per week immediately.',
    category: 'EMPLOYMENT',
    score: 55,
    verdict: 'Apply with changes',
    verdictClass: 'warn',
  },
  {
    id: 'odd-even',
    label: 'Odd-Even Reintroduced',
    fullText:
      'Delhi government reintroduces odd-even vehicle restriction on all roads, 8am-8pm, Monday to Saturday.',
    category: 'TRANSPORT',
    score: 47,
    verdict: 'Redesign Recommended',
    verdictClass: 'alert',
  },
  {
    id: 'exam-fee-waived-bpl',
    label: 'Exam Fee Waived for BPL',
    fullText:
      'NTA waives examination fees for all BPL certificate holders across NEET, JEE, and CUET.',
    category: 'EXAMINATION',
    score: 88,
    verdict: 'Apply as-is',
    verdictClass: 'success',
  },
  {
    id: 'mgnrega-wage-100',
    label: 'MGNREGA Wage +₹100',
    fullText:
      'Central government increases MGNREGA daily wage by ₹100, effective from next financial year.',
    category: 'ECONOMIC',
    score: 79,
    verdict: 'Apply with changes',
    verdictClass: 'warn',
  },
];

export interface SmartQuestion {
  id: string;
  question: string;
  options: string[];
  defaultIndex: number;
}

export const questionsByCategory: Record<PolicyCategory, SmartQuestion[]> = {
  TRANSPORT: [
    {
      id: 'transport-1',
      question: 'Who is this policy primarily affecting?',
      options: [
        'All commuters',
        'Only public transit users',
        'Vehicle owners',
        'Specific income groups',
      ],
      defaultIndex: 0,
    },
    {
      id: 'transport-2',
      question: 'When does this take effect?',
      options: ['Immediately', '1 month notice', '3 months notice', 'Phased over 6 months'],
      defaultIndex: 0,
    },
    {
      id: 'transport-3',
      question: 'Is there any relief or exemption for low-income groups?',
      options: ['No exemptions', 'Partial subsidy', 'Full exemption', 'Not decided yet'],
      defaultIndex: 0,
    },
    {
      id: 'transport-4',
      question: 'What is the primary goal of this policy?',
      options: ['Revenue generation', 'Reduce congestion', 'Environmental', 'Public welfare'],
      defaultIndex: 0,
    },
  ],
  EXAMINATION: [
    {
      id: 'exam-1',
      question: 'Which student population is primarily affected?',
      options: [
        'All students',
        'Only competitive exam aspirants',
        'School students',
        'University students',
      ],
      defaultIndex: 1,
    },
    {
      id: 'exam-2',
      question: 'Is the change to the examination format, fees, or security?',
      options: ['Format change', 'Fee change', 'Security change', 'Multiple changes'],
      defaultIndex: 0,
    },
    {
      id: 'exam-3',
      question: 'How much notice are students being given?',
      options: ['Immediate', '3 months', '6 months', 'Next academic year'],
      defaultIndex: 1,
    },
    {
      id: 'exam-4',
      question: 'Are coaching centres and preparation materials being adjusted accordingly?',
      options: ['Yes, formal adjustment', 'No, students adapt', 'Partially', 'Unknown'],
      defaultIndex: 2,
    },
  ],
  ECONOMIC: [
    {
      id: 'econ-1',
      question: 'Which income group is most directly impacted?',
      options: ['All income groups', 'Low income only', 'Middle income', 'High income'],
      defaultIndex: 0,
    },
    {
      id: 'econ-2',
      question: 'Is this a permanent change or temporary measure?',
      options: ['Permanent', 'Temporary (under 6 months)', 'Conditional', 'Unknown'],
      defaultIndex: 0,
    },
    {
      id: 'econ-3',
      question: 'Are there compensatory measures announced alongside?',
      options: ['Yes', 'No', 'Partially', 'Being planned'],
      defaultIndex: 1,
    },
  ],
  EMPLOYMENT: [
    {
      id: 'emp-1',
      question: 'Which sector of workers does this affect?',
      options: ['Government employees', 'Private sector', 'Informal sector', 'All sectors'],
      defaultIndex: 0,
    },
    {
      id: 'emp-2',
      question: 'What is the notice period given to employees?',
      options: ['Immediate', '2 weeks', '1 month', '3 months'],
      defaultIndex: 0,
    },
    {
      id: 'emp-3',
      question: 'Are there any flexibility provisions in the policy?',
      options: ['None', 'Some flexibility', 'Full flexibility', 'Case-by-case basis'],
      defaultIndex: 0,
    },
  ],
};

export function getPolicyById(id: string): DemoPolicy | undefined {
  return demoPolicies.find((p) => p.id === id);
}
