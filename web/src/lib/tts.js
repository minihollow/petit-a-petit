// Reading French aloud (from Passeport civique).
// - Natural voice: Piper (open source), computed in the browser. Downloaded once (≈ 63 MB) from
//   Hugging Face and kept on the device: then it works offline.
// - Otherwise, or before the download: the browser / system voice.
let voices = [];
function refresh() { try { voices = window.speechSynthesis?.getVoices() || []; } catch { voices = []; } }
if (typeof window !== 'undefined' && window.speechSynthesis) {
  refresh();
  window.speechSynthesis.onvoiceschanged = refresh;
}
export const ttsAvailable = () => typeof window !== 'undefined' && !!window.speechSynthesis;

// License: the one of the recordings the voice was trained on.
export const PIPER_VOICE = { id: 'fr_FR-siwis-medium', name: 'Siwis', size: 63, license: 'CC BY 4.0' };
let engine = 'natural'; // 'natural': Piper when installed; 'system': always the browser voice
let installed = false;
export function setVoiceEngine(e) { engine = e || 'natural'; }
const piperOk = () => typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory;

export async function refreshInstalled() {
  if (!piperOk()) return false;
  try {
    const { stored } = await import('@mintplex-labs/piper-tts-web');
    installed = (await stored()).includes(PIPER_VOICE.id);
  } catch { /* storage unavailable */ }
  return installed;
}

let session = null; // the model is loaded once
function getSession(progress) {
  if (!session) {
    session = (async () => {
      const { TtsSession } = await import('@mintplex-labs/piper-tts-web');
      TtsSession._instance = null;
      return TtsSession.create({ voiceId: PIPER_VOICE.id, progress });
    })();
    session.catch(() => { session = null; });
  }
  return session;
}

export async function installVoice(onProgress) {
  await getSession((p) => { if (p.total && p.url?.endsWith('.onnx')) onProgress?.(p.loaded / p.total); });
  return refreshInstalled();
}
export async function removeVoice() {
  const { remove } = await import('@mintplex-labs/piper-tts-web');
  await remove(PIPER_VOICE.id);
  session = null;
  return refreshInstalled();
}

let playId = 0; // each new reading cancels the previous one
let audio = null;
const cache = new Map(); // text -> wav blob (a table is often read twice)

function pickVoice() {
  if (!voices.length) refresh();
  const list = voices.filter((v) => v.lang?.toLowerCase().startsWith('fr'));
  const rank = (v) => (/natural|premium|enhanced/i.test(v.name) ? 0 : /online|google/i.test(v.name) ? 1 : 2) + (/fr[-_]fr/i.test(v.lang) ? 0 : 0.5);
  return list.sort((a, b) => rank(a) - rank(b))[0] || null;
}

function playWav(wav, rate, id) {
  return new Promise((resolve) => {
    if (id !== playId) { resolve(); return; }
    const url = URL.createObjectURL(wav);
    audio = new Audio(url);
    audio.playbackRate = rate;
    const done = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onended = done; audio.onpause = done; audio.onerror = done;
    audio.play().catch(done);
  });
}
function speakSystem(text, rate, id) {
  return new Promise((resolve) => {
    if (id !== playId || !ttsAvailable()) { resolve(); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; u.rate = rate;
    const v = pickVoice(); if (v) u.voice = v;
    u.onend = resolve; u.onerror = resolve;
    window.speechSynthesis.speak(u);
  });
}

async function speakOne(text, rate, id) {
  if (engine === 'natural' && installed) {
    try {
      let wav = cache.get(text);
      if (!wav) { wav = await (await getSession()).predict(text); cache.set(text, wav); if (cache.size > 200) cache.delete(cache.keys().next().value); }
      if (id === playId) await playWav(wav, rate, id);
      return;
    } catch { /* fall back to the system voice */ }
  }
  await speakSystem(text, rate, id);
}

// text: a string, or several strings read one after another (a table).
export async function speak(text, { rate = 0.9 } = {}) {
  if (!text || (Array.isArray(text) && !text.length)) return;
  stopSpeaking();
  const id = playId;
  for (const t of Array.isArray(text) ? text : [text]) {
    if (id !== playId) return;
    await speakOne(t, rate, id);
  }
}

export function stopSpeaking() {
  playId++;
  try { audio?.pause(); } catch { /* ignore */ }
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}
