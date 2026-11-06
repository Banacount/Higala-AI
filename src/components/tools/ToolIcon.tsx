import {
  Brain,
  Flame,
  Hand,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { ToolId } from '@/shared/types';

const ICONS: Record<ToolId, LucideIcon> = {
  breathing: Wind,
  grounding: Hand,
  'thought-record': Brain,
  'anger-pause': Flame,
  'safety-plan': ShieldCheck,
  'mood-check': HeartPulse,
  none: Sparkles,
};

export function ToolIcon({
  id,
  className,
}: {
  id: ToolId;
  className?: string;
}) {
  const Icon = ICONS[id] ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}
