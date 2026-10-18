import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './motion.css';
import './art.css';
import { markNativeTransitions } from './lib/motionPlan';

// Before the first render, so the first frame already uses the right entrance style.
markNativeTransitions(document);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
