import { screenText } from '../src/shared/safety.ts';
import type { RiskLevel } from '../src/shared/types.ts';

/**
 * Ordinary community moderation.
 *
 * Crisis detection is deliberately separate. Distress, grief, and suicidal
 * thoughts are never policy violations: they are routed to support resources
 * and flagged privately for a moderator, never blocked or auto-removed.
 */

export interface PolicyScreen {
  /** High-confidence violations that should not be published at all. */
  blockReasons: string[];
  /** Lower-confidence concerns that publish but enter the review queue. */
  reviewReasons: string[];
  /** Private crisis signal from the existing Higala screen. */
  riskLevel: RiskLevel;
}

const THREAT_PATTERNS: RegExp[] = [
  /\bi(?:'m| am)?\s+(?:going|gonna)\s+to\s+(?:kill|hurt|beat|stab|shoot|find)\s+you\b/i,
  /\bi(?:'ll| will)\s+(?:kill|hurt|beat|stab|shoot|find)\s+you\b/i,
  /\byou(?:'re| are)\s+(?:going|gonna)\s+to\s+(?:die|get hurt)\b/i,
  /\b(?:watch|sleep\s+with)\s+(?:your|ur)\s+back\b/i,
];

const SELF_HARM_ENCOURAGEMENT_PATTERNS: RegExp[] = [
  /\b(?:kill|hurt|cut|harm)\s+(?:yourself|urself)\b/i,
  /\bgo\s+(?:and\s+)?kill\s+yourself\b/i,
  /\bwhy\s+don'?t\s+you\s+(?:just\s+)?(?:die|kill\s+yourself|end\s+it)\b/i,
  /\byou\s+should\s+(?:just\s+)?(?:die|kill\s+yourself|end\s+it)\b/i,
  /\b(?:nobody|no\s+one)\s+(?:would|will)\s+(?:miss|care\s+about)\s+you\b/i,
];

const PII_PATTERNS: RegExp[] = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+63|0)\s?9\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/,
  /\b(?:\+63|0)\s?(?:2|3[2-9]|4[2-9]|5[2-9]|6[2-9]|7[2-9]|8[2-9])\s?\d{3}[\s.-]?\d{4}\b/,
];

const DANGEROUS_ADVICE_PATTERNS: RegExp[] = [
  /\bstop\s+(?:taking\s+)?(?:your\s+)?(?:meds|medication|medicine)\b/i,
  /\bdon'?t\s+(?:take|need)\s+(?:your\s+)?(?:meds|medication|medicine)\b/i,
  /\byou\s+don'?t\s+need\s+(?:a\s+)?(?:doctor|therapist|psychiatrist)\b/i,
  /\b(?:just\s+)?(?:drink|take)\s+(?:more\s+)?(?:alcohol|beer|wine)\s+to\s+(?:cope|feel\s+better)\b/i,
];

// Supportive phrasing such as "please don't kill yourself" must never be
// treated as encouragement. Look at the words immediately before a match.
const NEGATION_BEFORE =
  /\b(?:don'?t|do\s+not|doesn'?t|didn'?t|never|won'?t|will\s+not|wouldn'?t|shouldn'?t|mustn'?t|no\s+longer|not)\b[^.!?\n]{0,25}$/i;

function matchesAny(text: string, patterns: RegExp[]): boolean {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const before = text.slice(Math.max(0, match.index - 40), match.index);
    if (NEGATION_BEFORE.test(before)) continue;
    return true;
  }
  return false;
}

export function screenCommunityContent(text: string): PolicyScreen {
  const { level } = screenText(text);
  const blockReasons: string[] = [];
  const reviewReasons: string[] = [];

  if (matchesAny(text, THREAT_PATTERNS)) {
    blockReasons.push('threats or targeted violence');
  }
  if (matchesAny(text, SELF_HARM_ENCOURAGEMENT_PATTERNS)) {
    blockReasons.push('encouraging self-harm');
  }
  if (matchesAny(text, PII_PATTERNS)) {
    reviewReasons.push('possible personal information');
  }
  if (matchesAny(text, DANGEROUS_ADVICE_PATTERNS)) {
    reviewReasons.push('possible dangerous advice');
  }

  // A crisis signal is never a rule violation. It only tells a moderator that
  // someone may need support.
  return { blockReasons, reviewReasons, riskLevel: level };
}

export function needsModeratorReview(screen: PolicyScreen): boolean {
  return (
    screen.reviewReasons.length > 0 ||
    screen.riskLevel === 'elevated' ||
    screen.riskLevel === 'crisis'
  );
}
