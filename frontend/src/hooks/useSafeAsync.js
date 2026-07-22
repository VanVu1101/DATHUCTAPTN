import { useCallback, useEffect, useRef, useState } from 'react';

export function useSafeAsync(asyncFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    setError(null);

    asyncFn()
      .then((result) => {
        if (isMountedRef.current) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMountedRef.current) {
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setLoading(false);
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, deps);

  return { data, loading, error };
}

export function useSafeAbort() {
  const controllerRef = useRef(null);

  const getSignal = useCallback(() => {
    if (!controllerRef.current) {
      controllerRef.current = new AbortController();
    }
    return controllerRef.current.signal;
  }, []);

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  return { getSignal };
}
