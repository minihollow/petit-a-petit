import { createContext, useContext } from 'react';

// Settings kept on the device (kv 'settings').
// goal: minutes per day; newPerDay: new tables per day; pron: 'tk' | 'ipa' | 'both';
// help: Turkish help shown; theme: 'auto' | 'light' | 'dark'; voice: 'natural' | 'system'; rate: reading speed.
// coco: 'off' | 'on' (computer with Ollama only); cocoModel: chosen Ollama model.
export const DEFAULTS = { name: '', goal: 30, newPerDay: 4, newWords: 8, pron: 'tk', help: true, theme: 'auto', voice: 'natural', rate: 0.9, coco: 'off', cocoModel: '' };

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);
