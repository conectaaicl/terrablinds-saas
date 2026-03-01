import { useState, useCallback } from 'react';

interface UseMutationResult<T, A extends any[]> {
  execute: (...args: A) => Promise<T | null>;
  loading: boolean;
  error: string | null;
}

export function useMutation<T, A extends any[] = any[]>(
  mutationFn: (...args: A) => Promise<T>
): UseMutationResult<T, A> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: A): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutationFn(...args);
      setLoading(false);
      return result;
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
      setLoading(false);
      return null;
    }
  }, [mutationFn]);

  return { execute, loading, error };
}
