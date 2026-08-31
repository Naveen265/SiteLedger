import { useCallback, useEffect, useState } from 'react';

/**
 * A state value that survives a reload.
 * Used for the project switcher and the language choice, both of which must
 * persist per user per device.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      // A private browsing window can throw on read. Fall back to the default.
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage being unavailable must never break the screen.
    }
  }, [key, value]);

  const clear = useCallback(() => {
    window.localStorage.removeItem(key);
    setValue(initialValue);
  }, [key, initialValue]);

  return [value, setValue, clear] as const;
}
