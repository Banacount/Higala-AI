import type { Language, ToolId } from '@/shared/types';

export interface CrisisLine {
  name: string;
  number: string;
  tel: string;
  detail: string;
  highlight?: boolean;
}

export const CRISIS_LINES: CrisisLine[] = [
  {
    name: 'NCMH Crisis Hotline',
    number: '1553',
    tel: '1553',
    detail: 'National Center for Mental Health · 24/7 · toll-free',
    highlight: true,
  },
  {
    name: 'NCMH mobile',
    number: '0919 057 1553',
    tel: '+639190571553',
    detail: 'Smart / TNT · 24/7',
  },
  {
    name: 'Hopeline Philippines',
    number: '(02) 8804 4673',
    tel: '+63288044673',
    detail: '24/7 · also 0917 558 4673',
  },
  {
    name: 'Tawag Paglaum – Centro Bisaya',
    number: '0939 937 5433',
    tel: '+639399375433',
    detail: '24/7 · Cebuano-speaking support',
  },
  {
    name: 'Emergency',
    number: '911',
    tel: '911',
    detail: 'Police, fire, and medical response',
  },
];

export const CRISIS_NOTE =
  'These numbers can change. If a line does not answer, call 911 or go to the nearest emergency room. Higala is peer support, not a crisis service.';

export const LANGUAGE_OPTIONS: Array<{
  value: Language;
  label: string;
  short: string;
  description: string;
}> = [
  {
    value: 'ceb',
    label: 'Bisaya',
    short: 'Bis',
    description: 'Kagay-anon Cebuano',
  },
  {
    value: 'fil',
    label: 'Tagalog',
    short: 'Tag',
    description: 'Filipino / Tagalog',
  },
  {
    value: 'en',
    label: 'English',
    short: 'Eng',
    description: 'English',
  },
];

export const MOOD_LEVELS = {
  1: {
    label: 'Gihilakan',
    sublabel: 'Very low',
    color: '#6F8B7C',
    soft: '#E5ECE8',
  },
  2: {
    label: 'Naguol',
    sublabel: 'Low',
    color: '#6EA488',
    soft: '#E1F0E7',
  },
  3: {
    label: 'Okay-okay',
    sublabel: 'Neutral',
    color: '#9AC3A9',
    soft: '#EBF5EF',
  },
  4: {
    label: 'Maayo',
    sublabel: 'Good',
    color: '#2FA476',
    soft: '#DDF4E9',
  },
  5: {
    label: 'Nalipay',
    sublabel: 'Great',
    color: '#0C7A56',
    soft: '#D3F0E3',
  },
} as const;

export const MOOD_TAGS = [
  'Pamilya',
  'Trabaho',
  'Eskwela',
  'Kwarta',
  'Relasyon',
  'Lawas',
  'Katulog',
  'Kaon',
  'Barkada',
  'Walay klaro',
];

export const DAILY_PROMPTS: Array<{ ceb: string; en: string }> = [
  {
    ceb: 'Unsa ang usa ka butang nga imong gipamakak sa imong kaugalingon karong semanaha?',
    en: 'What is one thing you have been lying to yourself about this week?',
  },
  {
    ceb: 'Kinsa ang imong gipasakitan, ug unsa ang imong buhaton para maayo?',
    en: 'Who did you hurt, and what will you do to make it right?',
  },
  {
    ceb: 'Unsa ang imong gihimo nga murag kaharuhay karon pero mopasakit ugma?',
    en: 'What are you doing that feels good now but will hurt you tomorrow?',
  },
  {
    ceb: 'Unsa ang tinuod nimong kontrolado karon?',
    en: 'What is actually within your control right now?',
  },
  {
    ceb: 'Kung ang imong suod nga higala naa sa imong sitwasyon, unsa ang isulti nimo?',
    en: 'If your closest friend were in your situation, what would you tell them?',
  },
  {
    ceb: 'Unsa ang imong gikalagotan nga wala nimo gisulti?',
    en: 'What anger are you carrying without naming it?',
  },
  {
    ceb: 'Unsa ang gamay nga butang nga pwede nimo buhaton karon nga dili nimo pagbasulan ugma?',
    en: 'What small thing can you do today that you won’t regret tomorrow?',
  },
];

export const TOOL_DETAILS: Record<
  Exclude<ToolId, 'none'>,
  {
    title: string;
    english: string;
    duration: string;
    description: string;
    tone: 'pine' | 'mint' | 'sun' | 'clay' | 'deep';
  }
> = {
  breathing: {
    title: 'Ginhawa',
    english: 'Box breathing',
    duration: '2 min',
    description:
      'Slow the body down first. Four counts in, hold, four counts out, hold.',
    tone: 'pine',
  },
  grounding: {
    title: 'Balik sa Karon',
    english: '5-4-3-2-1 grounding',
    duration: '3 min',
    description:
      'When your mind is spinning, come back through your five senses.',
    tone: 'mint',
  },
  'thought-record': {
    title: 'Hunahuna Check',
    english: 'Thought record',
    duration: '6 min',
    description:
      'Catch the story, test the evidence, and write a truer thought.',
    tone: 'sun',
  },
  'anger-pause': {
    title: 'Hunong sa 90',
    english: 'Anger pause',
    duration: '2 min',
    description:
      'Let the first wave pass before you choose your next move.',
    tone: 'clay',
  },
  'safety-plan': {
    title: 'Plano sa Kaluwasan',
    english: 'Safety plan',
    duration: '10 min',
    description:
      'A simple plan for the moments when you cannot think clearly.',
    tone: 'deep',
  },
  'mood-check': {
    title: 'Gibati',
    english: 'Mood check-in',
    duration: '1 min',
    description: 'Name what is here. Honesty is the first step.',
    tone: 'mint',
  },
};

export const GROUNDING_STEPS = [
  {
    count: 5,
    title: '5 ka butang nga makita nimo',
    english: 'Five things you can see',
    hint: 'Look around slowly. Name them—even the boring ones.',
    placeholder: 'e.g. blue mug, cracked wall, yellow jeepney',
  },
  {
    count: 4,
    title: '4 ka butang nga matandog nimo',
    english: 'Four things you can touch',
    hint: 'Press your feet into the floor. Notice texture and temperature.',
    placeholder: 'e.g. cold chair, soft shirt, rough table',
  },
  {
    count: 3,
    title: '3 ka tingog nga madungog nimo',
    english: 'Three things you can hear',
    hint: 'Near or far. Do not judge them; just notice.',
    placeholder: 'e.g. fan hum, distant tricycle, my breathing',
  },
  {
    count: 2,
    title: '2 ka baho nga masimhot nimo',
    english: 'Two things you can smell',
    hint: 'If you cannot smell anything, name two smells you remember.',
    placeholder: 'e.g. rain on concrete, coffee',
  },
  {
    count: 1,
    title: '1 ka lami nga matilawan nimo',
    english: 'One thing you can taste',
    hint: 'Take a sip of water. Notice the taste, or the absence of one.',
    placeholder: 'e.g. mint, water, nothing',
  },
] as const;

export const DISTORTIONS = [
  {
    id: 'all-or-nothing',
    ceb: 'Tanang o wala',
    en: 'All-or-nothing thinking',
    example: '“Kung dili perfect, wala na lang.”',
  },
  {
    id: 'catastrophizing',
    ceb: 'Pinakagrabe nga mahitabo',
    en: 'Catastrophizing',
    example: '“Kung masayop ko, tapos na ang tanan.”',
  },
  {
    id: 'mind-reading',
    ceb: 'Pagbasa sa hunahuna',
    en: 'Mind reading',
    example: '“Gikasab-an ko niya sa iyang hunahuna.”',
  },
  {
    id: 'shoulds',
    ceb: 'Angay / Dapat',
    en: 'Should statements',
    example: '“Angay gyud ko nga kamao na niini.”',
  },
  {
    id: 'labeling',
    ceb: 'Paglabel',
    en: 'Labeling',
    example: '“Tapulan gyud ko nga tawo.”',
  },
  {
    id: 'overgeneralizing',
    ceb: 'Kanunay / Wala gyud',
    en: 'Overgeneralizing',
    example: '“Kanunay na lang ko masayop.”',
  },
  {
    id: 'discounting',
    ceb: 'Pagbalewala sa maayo',
    en: 'Discounting the positive',
    example: '“Swerti lang ’to, dili tungod sa akong paningkamot.”',
  },
  {
    id: 'personalization',
    ceb: 'Pagbasol sa kaugalingon',
    en: 'Personalization',
    example: '“Tungod nako nangasuko siya.”',
  },
] as const;

export const SUPPORT_TIPS = [
  {
    title: 'Listen before fixing',
    body: '“Naminaw ko. Ayaw sa og sulbad—istorya lang sa.” Presence is often the first intervention.',
  },
  {
    title: 'Ask directly',
    body: 'Asking “Nagahunahuna ka ba og paghikog?” does not plant the idea. It opens a door and can save a life.',
  },
  {
    title: 'Stay with them',
    body: 'If danger is immediate, do not leave them alone. Help them call 911 or 1553, or bring them to the nearest ER.',
  },
  {
    title: 'Do not promise secrecy',
    body: 'If their safety is at risk, tell them kindly that you will involve someone who can help. Safety comes before secrecy.',
  },
];

export const RESOURCE_LINKS = [
  {
    name: 'National Center for Mental Health',
    href: 'https://www.ncmh.gov.ph/',
    detail: 'Philippine mental health information and crisis line 1553.',
  },
  {
    name: 'Department of Health – Mental Health',
    href: 'https://doh.gov.ph/',
    detail: 'National mental health programs and advisories.',
  },
  {
    name: 'Find A Helpline – Philippines',
    href: 'https://findahelpline.com/countries/ph',
    detail: 'Verified crisis lines across the Philippines.',
  },
  {
    name: 'Cagayan de Oro City Health Office',
    href: 'https://www.cdo.gov.ph/',
    detail: 'Local health services. Call ahead or visit the nearest health center.',
  },
];
