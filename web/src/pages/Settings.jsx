import { useEffect, useRef, useState } from 'react';
import { exportAll, importAll } from '../lib/db.js';
import { getSync, setSync, testSync } from '../lib/sync.js';
import { installVoice, PIPER_VOICE, refreshInstalled, removeVoice, speak } from '../lib/tts.js';
import { useApp } from '../store.js';
import { Bi, tx } from '../components/ui.jsx';
import { UI } from '../i18n.js';
import SyncLine from '../components/SyncLine.jsx';

function Choice({ value, options, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, k]) => (
        <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {UI[k] ? <Bi k={k} inline /> : k}
        </button>
      ))}
    </div>
  );
}

export default function Settings() {
  const { settings, update, notify, reload, doSync } = useApp();
  const set = (k) => (v) => update({ [k]: v });

  // natural voice
  const [voiceOk, setVoiceOk] = useState(false);
  const [dl, setDl] = useState(null);
  useEffect(() => { refreshInstalled().then(setVoiceOk); }, []);
  const download = async () => {
    setDl(0);
    try { setVoiceOk(await installVoice((p) => setDl(Math.round(p * 100)))); } catch { notify(['Téléchargement impossible', 'İndirilemedi']); }
    setDl(null);
  };

  // sync
  const [cfg, setCfg] = useState({ url: '', token: '' });
  const [paired, setPaired] = useState(false);
  useEffect(() => { getSync().then((s) => { if (s) { setCfg(s); setPaired(true); } }); }, []);
  const pair = async () => {
    const c = { url: cfg.url.trim(), token: cfg.token.trim() };
    if (!/^https:\/\//.test(c.url) || !c.token) { notify(['Adresse https:// et jeton nécessaires', 'https:// adresi ve anahtar gerekli']); return; }
    try { await testSync({ ...c, url: c.url.replace(/\/+$/, '') }); } catch (e) {
      notify(e.code === 'token' ? tx('sync_token_bad') : tx('sync_unreachable'));
      return;
    }
    await setSync(c); setPaired(true); notify(tx('sync_paired')); doSync(true);
  };
  const forget = async () => { await setSync(null); setPaired(false); setCfg({ url: '', token: '' }); doSync(); };

  // backup
  const fileRef = useRef(null);
  const doExport = async () => {
    const data = await exportAll();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `petit-a-petit-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const doImport = async (file) => {
    try { const n = await importAll(JSON.parse(await file.text())); await reload(); notify(tx('imported', n)); doSync(); }
    catch { notify(tx('import_bad')); }
  };

  return (
    <div className="page settings">
      <section className="block">
        <h2><Bi k="s_profile" /></h2>
        <label className="row-l" htmlFor="s-name"><Bi k="s_name" /></label>
        <input id="s-name" className="field" value={settings.name} maxLength={30} autoComplete="given-name"
          onChange={(e) => update({ name: e.target.value })} />
        <div className="row-l"><Bi k="s_goal" /></div>
        <Choice label="goal" value={settings.goal} onChange={set('goal')} options={[10, 15, 20, 30, 45, 60].map((n) => [n, String(n)])} />
        <div className="row-l"><Bi k="s_new" /></div>
        <Choice label="new" value={settings.newPerDay} onChange={set('newPerDay')} options={[2, 3, 4, 6, 8].map((n) => [n, String(n)])} />
      </section>

      <section className="block">
        <h2><Bi k="s_display" /></h2>
        <div className="row-l"><Bi k="s_pron" /></div>
        <Choice label="pron" value={settings.pron} onChange={set('pron')} options={[['tk', 'pron_tk'], ['ipa', 'pron_ipa'], ['both', 'pron_both']]} />
        <div className="row-l"><Bi k="s_help" /></div>
        <Choice label="help" value={settings.help} onChange={set('help')} options={[[true, 'show'], [false, 'hide']]} />
        <div className="row-l"><Bi k="s_theme" /></div>
        <Choice label="theme" value={settings.theme} onChange={set('theme')} options={[['auto', 'th_auto'], ['light', 'th_light'], ['dark', 'th_dark']]} />
      </section>

      <section className="block">
        <h2><Bi k="s_voice" /></h2>
        <Choice label="voice" value={settings.voice} onChange={set('voice')} options={[['natural', 'voice_natural'], ['system', 'voice_system']]} />
        {settings.voice === 'natural' && (
          <div className="voice-box">
            <p className="small"><Bi k="voice_natural_desc" /></p>
            {voiceOk ? (
              <div className="row"><span className="chip c-ok"><Bi k="installed" inline /></span>
                <button type="button" className="btn ghost small" onClick={async () => setVoiceOk(await removeVoice())}><Bi k="remove" inline /></button></div>
            ) : dl !== null ? (
              <div className="dl"><span style={{ width: `${dl}%` }} /><b>{dl} %</b></div>
            ) : (
              <button type="button" className="btn small" onClick={download}><Bi k="download" inline /> ({PIPER_VOICE.size} Mo)</button>
            )}
          </div>
        )}
        <div className="row-l"><Bi k="s_rate" /></div>
        <Choice label="rate" value={settings.rate} onChange={set('rate')} options={[[0.7, '0.7'], [0.8, '0.8'], [0.9, '0.9'], [1, '1']]} />
        <button type="button" className="btn ghost small" onClick={() => speak('Bonjour ! Je parle français petit à petit.', { rate: settings.rate })}><Bi k="test_voice" inline /></button>
      </section>

      <section className="block">
        <h2><Bi k="s_sync" /></h2>
        <p className="small"><Bi k="sync_desc" /></p>
        <SyncLine />
        {!paired && <p className="muted small"><Bi k="sync_off" /></p>}
        <label className="row-l" htmlFor="s-url"><Bi k="sync_url" /></label>
        <input id="s-url" className="field" type="url" inputMode="url" placeholder="https://raspberrypi.xxxx.ts.net" value={cfg.url} disabled={paired}
          onChange={(e) => setCfg((c) => ({ ...c, url: e.target.value }))} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        <label className="row-l" htmlFor="s-token"><Bi k="sync_token" /></label>
        <input id="s-token" className="field" type="password" value={cfg.token} disabled={paired}
          onChange={(e) => setCfg((c) => ({ ...c, token: e.target.value }))} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        <div className="row">
          {!paired && <button type="button" className="btn small" onClick={pair}><Bi k="sync_save" inline /></button>}
          {paired && <button type="button" className="btn small" onClick={() => doSync(true)}><Bi k="sync_now" inline /></button>}
          {paired && <button type="button" className="btn ghost small" onClick={forget}><Bi k="sync_forget" inline /></button>}
        </div>
      </section>

      <section className="block">
        <h2><Bi k="s_backup" /></h2>
        <p className="small"><Bi k="backup_desc" /></p>
        <div className="row">
          <button type="button" className="btn ghost small" onClick={doExport}><Bi k="export" inline /></button>
          <button type="button" className="btn ghost small" onClick={() => fileRef.current?.click()}><Bi k="import" inline /></button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
        </div>
      </section>

      <section className="block about small">
        <h2><Bi k="s_about" /></h2>
        <p>Petit à petit · version {import.meta.env.VITE_VERSION || '0.1'}</p>
        <p>Formes et prononciation des verbes : <a href="http://www.lexique.org" target="_blank" rel="noreferrer">Lexique 3.83</a> (B. New, C. Pallier et al.), CC BY-SA 4.0.
          Voix : Piper, voix « {PIPER_VOICE.name} » ({PIPER_VOICE.license}). D'après <a href="https://github.com/minihollow/passeport-civique" target="_blank" rel="noreferrer">Passeport civique</a>.</p>
      </section>
    </div>
  );
}
