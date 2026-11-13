import type { RiskLevel, RiskScreen } from './types.ts';

type ScreenRule = {
  level: RiskLevel;
  patterns: RegExp[];
  label: string;
};

/**
 * Safety is screened twice: once in the browser (to surface help immediately)
 * and once on the server (to shape the model response). This is deliberately
 * conservative. It is not a diagnosis and it does not replace the model's own
 * safety judgement.
 */
const RULES: ScreenRule[] = [
  {
    level: 'crisis',
    label: 'direct self-harm or suicide language',
    patterns: [
      /\b(kill|killing)\s+(myself|me)\b/i,
      /\bsuicid(e|al)\b/i,
      /\b(end|ending)\s+(my\s+life|it\s+all|everything)\b/i,
      /\b(want|wanna|going|plan)\s+to\s+die\b/i,
      /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+here|exist)\b/i,
      /\bbetter\s+off\s+(dead|without\s+me)\b/i,
      /\bno\s+(reason|point)\s+(to|in)\s+liv(ing|e)\b/i,
      /\bself[-\s]?harm/i,
      /\b(cut|cutting|hurt|hurting|harm|harming)\s+(myself|my\s+self)\b/i,
      /\boverdos(e|ing)\b/i,
      /\bhang\s+myself\b/i,
      /\bhikog\b/i,
      /\bmagpakamatay\b/i,
      /\bpatyon\s+(nako|ko|ang)\b.*\bkaugalingon\b/i,
      /\bpatayin\s+(ko|ang)\s+(ang\s+)?(aking\s+)?sarili\b/i,
      /\bsaktan\s+ang\s+sarili\b/i,
      /\bgusto\s+(na\s+)?(ko|nako|kong)\s+mamatay\b/i,
      /\bdi\s+na\s+(ko|nako)\s+gusto\s+mabuhi\b/i,
      /\bayaw\s+ko\s+nang\s+mabuhay\b/i,
      /\bmamatay\s+na\s+ko\b/i,
      /\btapos\s+na\s+ang\s+tanan\b/i,
      /\bwa\s+nay\s+(rason|paglaum|pag-asa)\b/i,
    ],
  },
  {
    level: 'elevated',
    label: 'hopelessness or passive risk language',
    patterns: [
      /\bhopeless\b/i,
      /\bworthless\b/i,
      /\bno\s+hope\b/i,
      /\bcan'?t\s+(go\s+on|take\s+it\s+(anymore|any\s+more))\b/i,
      /\b(don'?t|do\s+not)\s+see\s+(a\s+)?(future|way\s+out)\b/i,
      /\bgive\s+up\b/i,
      /\bwant\s+to\s+disappear\b/i,
      /\bgusto\s+(ko|nako|kong)\s+mawala\b/i,
      /\bwala\s+nay\s+(paglaum|pag-asa|kalauman)\b/i,
      /\bwala\s+nang\s+(pag-asa|paglaum)\b/i,
      /\bdi\s+na\s+(ko|nako)\s+kaya\b/i,
      /\bhindi\s+ko\s+na\s+kaya\b/i,
      /\bgikapoy\s+na\s+ko\s+sa\s+tanan\b/i,
      /\bpagod\s+na\s+ako\s+sa\s+lahat\b/i,
    ],
  },
  {
    level: 'watch',
    label: 'heavy distress language',
    patterns: [
      /\b(gikapoy|kapoy)\s+na\s+(kaayo|gyud|jud)\b/i,
      /\bpagod\s+na\s+(ako|talaga)\b/i,
      /\bsobrang\s+(lungkot|sakit)\b/i,
      /\bgrabe\s+ang\s+(kasubo|kasakit)\b/i,
      /\bwala\s+koy\s+(motive|gana)\b/i,
      /\bwala\s+(akong|ko)\s+gana\b/i,
      /\bcan'?t\s+sleep\b/i,
      /\bdi\s+ko\s+makatulog\b/i,
      /\bhindi\s+ako\s+makatulog\b/i,
    ],
  },
];

export function screenText(text: string): RiskScreen {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return { level: 'none', matches: [] };

  const matches: string[] = [];
  let level: RiskLevel = 'none';

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) {
        matches.push(rule.label);
        if (
          level === 'none' ||
          (level === 'watch' && rule.level !== 'watch') ||
          (level === 'elevated' && rule.level === 'crisis')
        ) {
          level = rule.level;
        }
        break;
      }
    }
  }

  return { level, matches: [...new Set(matches)] };
}

export function hasImmediateRisk(text: string): boolean {
  return screenText(text).level === 'crisis';
}
