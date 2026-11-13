export type Language = 'ceb' | 'fil' | 'en';

/** Must stay in sync with the voice endpoint's multipart file limit. */
export const MAX_VOICE_AUDIO_BYTES = 3 * 1024 * 1024;

export type RiskLevel = 'none' | 'watch' | 'elevated' | 'crisis';

export type ToolId =
  | 'breathing'
  | 'grounding'
  | 'thought-record'
  | 'anger-pause'
  | 'safety-plan'
  | 'mood-check'
  | 'none';

export const TOOL_IDS: ToolId[] = [
  'breathing',
  'grounding',
  'thought-record',
  'anger-pause',
  'safety-plan',
  'mood-check',
  'none',
];

export const RISK_LEVELS: RiskLevel[] = ['none', 'watch', 'elevated', 'crisis'];

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatApiRequest {
  messages: ChatTurn[];
  language: Language;
  riskLevel?: RiskLevel;
}

export interface ChatApiResponse {
  message: string;
  challenge?: string;
  suggestedTool?: ToolId;
  riskLevel: RiskLevel;
  demo?: boolean;
}

export interface ChatVoiceApiResponse extends ChatApiResponse {
  transcript: string;
}

export type ChatMessageKind = 'text' | 'voice';

export type VoiceMessageStatus = 'processing' | 'ready' | 'failed';

export interface ChatVoice {
  /**
   * Session-scoped `blob:` URL for playback. It is intentionally not a
   * durable storage reference: the app has no configured audio store.
   */
  url: string;
  mimeType: string;
  durationMs: number;
  size?: number;
  status: VoiceMessageStatus;
}

export interface ChatMessage extends ChatTurn {
  id: string;
  /** Older saved messages omit this and are treated as plain text. */
  kind?: ChatMessageKind;
  voice?: ChatVoice;
  challenge?: string;
  suggestedTool?: ToolId;
  riskLevel?: RiskLevel;
  demo?: boolean;
  createdAt: number;
}

export interface MoodEntry {
  date: string;
  level: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  note: string;
  updatedAt: number;
}

export interface ThoughtRecord {
  id: string;
  createdAt: number;
  situation: string;
  thought: string;
  distortions: string[];
  evidenceFor: string;
  evidenceAgainst: string;
  balancedThought: string;
}

export interface SafetyPlan {
  warningSigns: string;
  copingStrategies: string;
  distractions: string;
  contacts: string;
  reasonsToLive: string;
  environment: string;
  updatedAt: number;
}

export interface Profile {
  name: string;
  language: Language;
}

export interface RiskScreen {
  level: RiskLevel;
  matches: string[];
}

export const RISK_WEIGHT: Record<RiskLevel, number> = {
  none: 0,
  watch: 1,
  elevated: 2,
  crisis: 3,
};

export function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_WEIGHT[a] >= RISK_WEIGHT[b] ? a : b;
}

export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === 'string' && RISK_LEVELS.includes(value as RiskLevel);
}

export function isLanguage(value: unknown): value is Language {
  return value === 'ceb' || value === 'fil' || value === 'en';
}
