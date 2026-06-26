import { useEffect, useRef, useCallback } from 'react';
import { register, type WorkletName } from '../register';

export type WorkletProps = Record<string, string | number>;

export function useWorklet(name: WorkletName, initialProps?: WorkletProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    register(name);
  }, [name]);

  const setProps = useCallback((props: WorkletProps) => {
    const el = ref.current;
    if (!el) return;
    for (const [key, value] of Object.entries(props)) {
      el.style.setProperty(key, String(value));
    }
  }, []);

  useEffect(() => {
    if (initialProps) setProps(initialProps);
  }, [initialProps, setProps]);

  return { ref, setProps };
}
