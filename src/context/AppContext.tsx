import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  Language,
  MoodEntry,
  Profile,
  SafetyPlan,
  ThoughtRecord,
} from '@/shared/types';
import { todayKey, uid } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export const STORAGE_KEYS = {
  profile: 'higala.profile.v1',
  mood: 'higala.mood.v1',
  thoughts: 'higala.thoughts.v1',
  safety: 'higala.safety.v1',
  chat: 'higala.chat.v1',
} as const;

const EMPTY_PROFILE: Profile = {
  name: '',
  language: 'en',
};

const EMPTY_SAFETY_PLAN: SafetyPlan = {
  warningSigns: '',
  copingStrategies: '',
  distractions: '',
  contacts: '',
  reasonsToLive: '',
  environment: '',
  updatedAt: 0,
};

interface AppContextValue {
  profile: Profile;
  setLanguage: (language: Language) => void;
  setName: (name: string) => void;

  moodEntries: MoodEntry[];
  todayMood: MoodEntry | undefined;
  updateTodayMood: (
    patch: Partial<Pick<MoodEntry, 'level' | 'tags' | 'note'>>,
  ) => void;
  removeMoodEntry: (date: string) => void;
  clearMoods: () => void;

  thoughtRecords: ThoughtRecord[];
  addThoughtRecord: (
    record: Omit<ThoughtRecord, 'id' | 'createdAt'>,
  ) => void;
  clearThoughtRecords: () => void;

  safetyPlan: SafetyPlan;
  saveSafetyPlan: (plan: Omit<SafetyPlan, 'updatedAt'>) => void;

  crisisOpen: boolean;
  openCrisis: () => void;
  closeCrisis: () => void;

  clearAllData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useLocalStorage<Profile>(
    STORAGE_KEYS.profile,
    EMPTY_PROFILE,
  );
  const [moodEntries, setMoodEntries] = useLocalStorage<MoodEntry[]>(
    STORAGE_KEYS.mood,
    [],
  );
  const [thoughtRecords, setThoughtRecords] = useLocalStorage<ThoughtRecord[]>(
    STORAGE_KEYS.thoughts,
    [],
  );
  const [safetyPlan, setSafetyPlan] = useLocalStorage<SafetyPlan>(
    STORAGE_KEYS.safety,
    EMPTY_SAFETY_PLAN,
  );
  const [crisisOpen, setCrisisOpen] = useState(false);

  const setLanguage = useCallback(
    (language: Language) => {
      setProfile((current) => ({ ...current, language }));
    },
    [setProfile],
  );

  const setName = useCallback(
    (name: string) => {
      setProfile((current) => ({ ...current, name }));
    },
    [setProfile],
  );

  const updateTodayMood = useCallback(
    (patch: Partial<Pick<MoodEntry, 'level' | 'tags' | 'note'>>) => {
      const date = todayKey();
      setMoodEntries((current) => {
        const existing = current.find((entry) => entry.date === date);
        const next: MoodEntry = {
          date,
          level: patch.level ?? existing?.level ?? 3,
          tags: patch.tags ?? existing?.tags ?? [],
          note: patch.note ?? existing?.note ?? '',
          updatedAt: Date.now(),
        };

        const without = current.filter((entry) => entry.date !== date);
        return [...without, next].sort((a, b) => a.date.localeCompare(b.date));
      });
    },
    [setMoodEntries],
  );

  const removeMoodEntry = useCallback(
    (date: string) => {
      setMoodEntries((current) => current.filter((entry) => entry.date !== date));
    },
    [setMoodEntries],
  );

  const clearMoods = useCallback(() => {
    setMoodEntries([]);
  }, [setMoodEntries]);

  const addThoughtRecord = useCallback(
    (record: Omit<ThoughtRecord, 'id' | 'createdAt'>) => {
      const next: ThoughtRecord = {
        ...record,
        id: uid(),
        createdAt: Date.now(),
      };
      setThoughtRecords((current) => [next, ...current].slice(0, 60));
    },
    [setThoughtRecords],
  );

  const clearThoughtRecords = useCallback(() => {
    setThoughtRecords([]);
  }, [setThoughtRecords]);

  const saveSafetyPlan = useCallback(
    (plan: Omit<SafetyPlan, 'updatedAt'>) => {
      setSafetyPlan({ ...plan, updatedAt: Date.now() });
    },
    [setSafetyPlan],
  );

  const openCrisis = useCallback(() => setCrisisOpen(true), []);
  const closeCrisis = useCallback(() => setCrisisOpen(false), []);

  const clearAllData = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach((key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore storage failures.
      }
    });
    window.location.reload();
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      profile,
      setLanguage,
      setName,
      moodEntries,
      todayMood: moodEntries.find((entry) => entry.date === todayKey()),
      updateTodayMood,
      removeMoodEntry,
      clearMoods,
      thoughtRecords,
      addThoughtRecord,
      clearThoughtRecords,
      safetyPlan,
      saveSafetyPlan,
      crisisOpen,
      openCrisis,
      closeCrisis,
      clearAllData,
    }),
    [
      profile,
      setLanguage,
      setName,
      moodEntries,
      updateTodayMood,
      removeMoodEntry,
      clearMoods,
      thoughtRecords,
      addThoughtRecord,
      clearThoughtRecords,
      safetyPlan,
      saveSafetyPlan,
      crisisOpen,
      openCrisis,
      closeCrisis,
      clearAllData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside AppProvider.');
  }
  return context;
}
