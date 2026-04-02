import { useState, useCallback, useMemo } from 'react';
import {
  getApiKey,
  setApiKey as setApiKeyStorage,
  getApiModel,
  setApiModel as setApiModelStorage,
  detectProvider
} from '../utils/aiConfig';

export function useApiKey() {
  const [apiKey, setApiKeyInternal] = useState(() => getApiKey());
  const [model, setModelInternal] = useState(() => getApiModel());

  const setApiKey = useCallback((newKey: string | null | undefined) => {
    setApiKeyStorage(newKey);
    setApiKeyInternal(newKey ?? null);
  }, []);

  const setModel = useCallback((newModel: string) => {
    setApiModelStorage(newModel);
    setModelInternal(newModel);
  }, []);

  const provider = useMemo(() => detectProvider(apiKey), [apiKey]);

  return {
    apiKey,
    setApiKey,
    hasKey: !!apiKey,
    model,
    setModel,
    provider
  };
}
