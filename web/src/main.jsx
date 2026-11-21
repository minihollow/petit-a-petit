import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/lexend';
import '@fontsource-variable/archivo/wdth.css';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

// Installable and usable offline (https only).
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
