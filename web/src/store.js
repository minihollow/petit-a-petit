import { createContext, useContext } from 'react';

// Settings kept on the device (kv 'settings').
// goal: minutes per day; newPerDay / newWords: new cards per day in the library series; pron: 'tk' | 'ipa' | 'both';
// mode: 'tr' | 'bi' | 'fr' (help language, as in Passeport civique); theme: 'auto' | 'light' | 'dark';
// voice: 'natural' | 'system'; rate: reading speed; coco: 'off' | 'on' (computer with Ollama only); cocoModel: chosen model.
export const DEFAULTS = { name: '', goal: 30, newPerDay: 4, newWords: 8, pron: 'tk', mode: 'bi', theme: 'auto', voice: 'natural', rate: 0.9, coco: 'off', cocoModel: '' };

// Saved settings from older versions: "help: false" becomes French only.
export function migrate(saved = {}) {
  const s = { ...DEFAULTS, ...saved };
  if (!saved.mode) s.mode = saved.help === false ? 'fr' : 'bi';
  delete s.help;
  return s;
}

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);
