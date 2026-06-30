import { useEffect, useRef, useCallback } from 'react';
import { register, type WorkletName } from '../register';

export type WorkletProps = Record<string, string | number>;

export function useWorklet(name: WorkletName, initialProps?: WorkletProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Capture initial props once — re-running on every render would thrash CSS vars
  // whenever the caller passes an inline object literal
  const initialPropsRef = useRef(initialProps);

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
    if (initialPropsRef.current) setProps(initialPropsRef.current);
  }, [setProps]);

  return { ref, setProps };
}
