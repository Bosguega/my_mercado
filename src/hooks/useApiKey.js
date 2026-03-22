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

  const setApiKey = useCallback((newKey) => {
    setApiKeyStorage(newKey);
    setApiKeyInternal(newKey);
  }, []);

  const setModel = useCallback((newModel) => {
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
