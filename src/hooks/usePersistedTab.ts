import { useCallback, useEffect, useState } from 'react';

export function usePersistedTab({
  storageKey = '@MyMercado:tab',
  defaultTab = 'scan',
} = {}) {
  const [tab, setTab] = useState(defaultTab);

  useEffect(() => {
    const storedTab = localStorage.getItem(storageKey);
    if (storedTab) setTab(storedTab);
  }, [storageKey]);

  const setPersistedTab = useCallback(
    (nextTab) => {
      setTab(nextTab);
      localStorage.setItem(storageKey, nextTab);
    },
    [storageKey],
  );

  return { tab, setTab: setPersistedTab };
}

