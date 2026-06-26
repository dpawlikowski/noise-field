import { useEffect, useState } from 'react';
import { registerAll, isNativeHoudini } from '../register';
import { WorkletCard } from './WorkletCard';
import { workletConfigs } from './workletConfigs';
import './App.css';

export default function App() {
  const [ready, setReady] = useState(false);
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativeHoudini());
    registerAll().then(() => setReady(true));
  }, []);

  return (
    <div className="app">
      <header className="site-header">
        <div className="header-inner">
          <div className="header-title">
            <h1>noise<span className="accent">-field</span></h1>
            <p className="header-sub">CSS Houdini Paint Worklets — generative backgrounds, zero JS on main thread</p>
          </div>
          <div className="header-badges">
            <span className={`badge ${native ? 'badge--green' : 'badge--yellow'}`}>
              {native ? '⬡ Native Houdini' : '⬡ Polyfill mode'}
            </span>
            <a
              className="badge badge--ghost"
              href="https://github.com/dominikpawlowski/noise-field"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      <main className="gallery">
        {!ready ? (
          <div className="loading">Registering worklets…</div>
        ) : (
          workletConfigs.map(config => (
            <WorkletCard key={config.name} config={config} />
          ))
        )}
      </main>

      <footer className="site-footer">
        <p>
          Built with <a href="https://developer.mozilla.org/en-US/docs/Web/API/CSS_Painting_API" target="_blank" rel="noreferrer">CSS Houdini Paint API</a>.
          Polyfill via <a href="https://github.com/GoogleChromeLabs/css-paint-polyfill" target="_blank" rel="noreferrer">css-paint-polyfill</a>.
        </p>
      </footer>
    </div>
  );
}
