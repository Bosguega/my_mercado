import { useCallback, useEffect, useState } from 'react';
import type { AppTab } from '../types/ui';

export function usePersistedTab({
  storageKey = '@MyMercado:tab',
  defaultTab = 'scan',
}: {
  storageKey?: string;
  defaultTab?: AppTab;
} = {}) {
  const [tab, setTab] = useState<AppTab>(defaultTab);

  useEffect(() => {
    const storedTab = localStorage.getItem(storageKey);
    if (storedTab) setTab(storedTab as AppTab);
  }, [storageKey]);

  const setPersistedTab = useCallback(
    (nextTab: AppTab) => {
      setTab(nextTab);
      localStorage.setItem(storageKey, nextTab);
    },
    [storageKey],
  );

  return { tab, setTab: setPersistedTab };
}
