import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

function readValue<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') return initialValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return initialValue;
    return JSON.parse(raw) as T;
  } catch {
    return initialValue;
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readValue(key, initialValue));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage may be unavailable (private mode / quota). The app still works
      // for the current session.
    }
  }, [key, value]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      if (event.newValue === null) {
        setValue(initialValue);
        return;
      }
      try {
        setValue(JSON.parse(event.newValue) as T);
      } catch {
        // Ignore malformed writes from other tabs.
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
    // `initialValue` is intentionally stable per key in this app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, setValue];
}
