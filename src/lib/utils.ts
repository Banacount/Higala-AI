import type { MoodEntry } from '@/shared/types';

export function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function lastNDays(count: number): string[] {
  const days: string[] = [];
  const cursor = new Date();
  for (let index = count - 1; index >= 0; index -= 1) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() - index);
    days.push(todayKey(day));
  }
  return days;
}

export function formatLongDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatShortDate(key: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
  }).format(dateFromKey(key));
}

export function formatWeekday(key: string): string {
  return new Intl.DateTimeFormat('en-PH', { weekday: 'short' }).format(
    dateFromKey(key),
  );
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function dayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

export function streakFromEntries(entries: MoodEntry[]): number {
  if (entries.length === 0) return 0;
  const dates = new Set(entries.map((entry) => entry.date));
  const cursor = new Date();

  if (!dates.has(todayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (dates.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function averageMood(entries: MoodEntry[]): number | null {
  if (entries.length === 0) return null;
  const total = entries.reduce((sum, entry) => sum + entry.level, 0);
  return total / entries.length;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'H';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
