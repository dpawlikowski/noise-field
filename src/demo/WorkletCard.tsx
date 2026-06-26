import { useEffect, useRef, useState, useCallback } from 'react';
import type { WorkletConfig } from './workletConfigs';

interface Props {
  config: WorkletConfig;
}

export function WorkletCard({ config }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [showSource, setShowSource] = useState(false);
  // Track slider values for display
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(config.props.map(p => [p.cssVar, p.defaultValue]))
  );

  // Inject @property + @keyframes into <head> once per worklet type
  useEffect(() => {
    const styleId = `nf-anim-${config.name}`;
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = config.animationCSS;
      document.head.appendChild(style);
    }
  }, [config.name, config.animationCSS]);

  // Apply initial CSS custom property defaults to the element
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    config.props.forEach(p => el.style.setProperty(p.cssVar, String(p.defaultValue)));
    config.defaultColors?.forEach(c => el.style.setProperty(c.cssVar, c.defaultValue));
  }, [config]);

  const handleSlider = useCallback((cssVar: string, value: number) => {
    previewRef.current?.style.setProperty(cssVar, String(value));
    setValues(prev => ({ ...prev, [cssVar]: value }));
  }, []);

  const handleColor = useCallback((cssVar: string, value: string) => {
    previewRef.current?.style.setProperty(cssVar, value);
  }, []);

  const copyCSS = useCallback(async () => {
    const el = previewRef.current;
    if (!el) return;

    const cssVarLines = config.props
      .map(p => `  ${p.cssVar}: ${el.style.getPropertyValue(p.cssVar) || p.defaultValue};`)
      .join('\n');

    const colorLines = (config.defaultColors ?? [])
      .map(c => `  ${c.cssVar}: ${el.style.getPropertyValue(c.cssVar) || c.defaultValue};`)
      .join('\n');

    const animName = animationValue(config.name);

    const output = [
      config.animationCSS,
      '',
      `.element {`,
      `  background: paint(${config.name});`,
      cssVarLines,
      colorLines,
      `  animation: ${animName};`,
      `}`,
    ].filter(Boolean).join('\n');

    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [config]);

  const sourceText = [
    config.animationCSS,
    '',
    `.element {`,
    `  background: paint(${config.name});`,
    ...config.props.map(p => `  ${p.cssVar}: ${p.defaultValue};`),
    ...(config.defaultColors ?? []).map(c => `  ${c.cssVar}: ${c.defaultValue};`),
    `  animation: ${animationValue(config.name)};`,
    `}`,
  ].filter(Boolean).join('\n');

  return (
    <article className="worklet-card">
      <div
        ref={previewRef}
        className={`worklet-preview worklet-${config.name}`}
        aria-label={`${config.title} background preview`}
      />

      <div className="worklet-info">
        <div className="worklet-header">
          <div>
            <h2 className="worklet-title">{config.title}</h2>
            <p className="worklet-desc">{config.description}</p>
          </div>
          <div className="worklet-actions">
            <button className="btn btn-ghost" onClick={() => setShowSource(s => !s)}>
              {showSource ? 'Hide source' : 'View source'}
            </button>
            <button className="btn btn-primary" onClick={copyCSS}>
              {copied ? '✓ Copied' : 'Copy CSS'}
            </button>
          </div>
        </div>

        {config.props.length > 0 && (
          <div className="controls">
            {config.props.map(p => (
              <label key={p.cssVar} className="control-row">
                <span className="control-label">
                  {p.label}
                  <span className="control-value">{values[p.cssVar]}</span>
                </span>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={values[p.cssVar]}
                  onChange={e => handleSlider(p.cssVar, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        )}

        {config.defaultColors && config.defaultColors.length > 0 && (
          <div className="controls controls--colors">
            {config.defaultColors.map(c => (
              <label key={c.cssVar} className="control-row control-row--color">
                <span className="control-label">{c.label}</span>
                <input
                  type="color"
                  defaultValue={c.defaultValue}
                  onChange={e => handleColor(c.cssVar, e.target.value)}
                />
              </label>
            ))}
          </div>
        )}

        {showSource && (
          <pre className="source-block"><code>{sourceText}</code></pre>
        )}
      </div>
    </article>
  );
}

function animationValue(name: string): string {
  const map: Record<string, string> = {
    'noise-field':   'nf-flow 12s linear infinite',
    'plasma':        'plasma-flow 8s linear infinite',
    'marble':        'marble-flow 20s linear infinite',
    'grain':         'grain-flicker 0.1s steps(1) infinite',
    'mesh-gradient': 'mesh-flow 10s linear infinite',
  };
  return map[name] ?? '';
}
