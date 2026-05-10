/* Weekender — main app shell */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "cream",
  "accent": "terracotta",
  "showHomeStats": true,
  "weightByRating": false,
  "slotReels": ["cuisine", "vibe", "neighborhood"]
} /*EDITMODE-END*/;

const ACCENTS = {
  terracotta: { accent: 'oklch(0.58 0.17 35)', accentSoft: 'oklch(0.92 0.05 35)', accentInk: 'oklch(0.32 0.12 35)' },
  forest: { accent: 'oklch(0.50 0.10 160)', accentSoft: 'oklch(0.92 0.04 160)', accentInk: 'oklch(0.32 0.08 160)' },
  midnight: { accent: 'oklch(0.45 0.13 260)', accentSoft: 'oklch(0.92 0.04 260)', accentInk: 'oklch(0.30 0.10 260)' },
  rose: { accent: 'oklch(0.62 0.14 15)', accentSoft: 'oklch(0.94 0.04 15)', accentInk: 'oklch(0.40 0.12 15)' }
};
const THEMES = {
  cream: { bg: 'oklch(0.97 0.012 80)', paper: 'oklch(0.99 0.008 80)', ink: 'oklch(0.20 0.008 50)' },
  paper: { bg: 'oklch(0.985 0.005 100)', paper: 'oklch(1 0 0)', ink: 'oklch(0.18 0.005 240)' },
  dusk: { bg: 'oklch(0.96 0.015 220)', paper: 'oklch(0.99 0.008 220)', ink: 'oklch(0.20 0.02 240)' }
};

function ThemeApplier({ tweaks }) {
  useEffect(() => {
    const t = THEMES[tweaks.theme] || THEMES.cream;
    const a = ACCENTS[tweaks.accent] || ACCENTS.terracotta;
    const r = document.documentElement;
    r.style.setProperty('--bg', t.bg);
    r.style.setProperty('--paper', t.paper);
    r.style.setProperty('--ink', t.ink);
    r.style.setProperty('--accent', a.accent);
    r.style.setProperty('--accent-soft', a.accentSoft);
    r.style.setProperty('--accent-ink', a.accentInk);
  }, [tweaks.theme, tweaks.accent]);
  return null;
}

// ---- Home / dashboard ----
function HomeScreen({ state, actions, onOpen, setTab, tweaks }) {
  const profile = getActiveProfile(state);
  const myVisits = state.visits.filter((v) => v.profileId === profile.id);
  const recent = [...myVisits].sort((a, b) => b.date - a.date).slice(0, 3);

  // Random featured pick (rotates daily-ish)
  const featured = useMemo(() => {
    const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 12));
    const idx = seed % window.RESTAURANTS.length;
    return window.RESTAURANTS[idx];
  }, []);

  const wishlistIds = Object.keys(state.wishlist).filter((id) => state.wishlist[id][profile.id]);

  return (
    <div>
      <div className="hero" style={{ paddingBottom: 32 }}>
        <div className="eyebrow">Weekender · Montreal · {state.profiles.length} {state.profiles.length === 1 ? 'taster' : 'tasters'}</div>
        <h1 className="h-display" style={{ marginTop: 12, marginBottom: 16 }}>
          Hello, {profile.name}.<br />
          <em>Where are we eating?</em>
        </h1>
        <p className="lede" style={{ maxWidth: 580 }}>
          A list of {window.RESTAURANTS.length} restaurants. Three games to help you choose. A log to keep score.
        </p>
        <div className="row" style={{ gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
          <button className="btn btn-lg btn-accent" onClick={() => setTab('slots')}>🎰 Spin the slots</button>
          <button className="btn btn-lg" onClick={() => setTab('roulette')}>⊙ Roulette</button>
          <button className="btn btn-lg btn-ghost" onClick={() => setTab('tiers')}>↕ Tier list</button>
        </div>
      </div>

      <div className="grid cols-2" style={{ gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: 24, background: 'oklch(0.99 0.012 60)', borderColor: 'var(--accent-soft)' }}>
          <div className="eyebrow">Editor's pick today</div>
          <div className="h2" style={{ marginTop: 8, marginBottom: 4 }}>{featured.name}</div>
          <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
            <Pill tone="accent">{featured.cuisine}</Pill>
            <Pill>{featured.neighborhood}</Pill>
            <Pill>{featured.price}</Pill>
          </div>
          <p className="soft" style={{ fontSize: 14 }}>{featured.description}</p>
          <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => onOpen(featured.id)}>See details →</button>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="eyebrow">Your standing</div>
          <div className="row" style={{ gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
            <div>
              <div className="serif" style={{ fontSize: 56, lineHeight: 0.95, letterSpacing: '-0.025em' }}>{myVisits.length}</div>
              <div className="eyebrow">visits</div>
            </div>
            <div>
              <div className="serif" style={{ fontSize: 56, lineHeight: 0.95, letterSpacing: '-0.025em' }}>{wishlistIds.length}</div>
              <div className="eyebrow">on wishlist</div>
            </div>
            <div>
              <div className="serif" style={{ fontSize: 56, lineHeight: 0.95, letterSpacing: '-0.025em' }}>
                {Object.keys(state.tiers[profile.id] || {}).length}
              </div>
              <div className="eyebrow">ranked</div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={() => setTab('stats')}>Full stats →</button>
        </div>
      </div>

      {recent.length > 0 &&
      <div style={{ marginBottom: 24 }}>
          <div className="row" style={{ marginBottom: 12, alignItems: 'baseline' }}>
            <div className="eyebrow">Latest receipts</div>
            <span className="spacer"></span>
            <button className="btn btn-ghost" onClick={() => setTab('log')}>See all →</button>
          </div>
          <div className="grid cols-3" style={{ gap: 12 }}>
            {recent.map((v) => {
            const r = getRestaurantById(v.restaurantId);
            if (!r) return null;
            return (
              <div key={v.id} className="card" style={{ cursor: 'pointer', padding: 16 }} onClick={() => onOpen(r.id)}>
                  <div className="eyebrow">{fmtDateShort(v.date)}</div>
                  <div className="h3" style={{ marginTop: 6, marginBottom: 6 }}>{r.name}</div>
                  <div className="row" style={{ gap: 6 }}>
                    <StarsRO value={v.rating} size={14} />
                    <span className="soft mono" style={{ fontSize: 11 }}>{v.rating?.toFixed(1)}</span>
                  </div>
                  {v.note && <p className="soft" style={{ fontStyle: 'italic', fontSize: 13, marginTop: 6 }}>"{v.note.slice(0, 80)}{v.note.length > 80 ? '…' : ''}"</p>}
                </div>);

          })}
          </div>
        </div>
      }

      <div className="card" style={{ padding: 24 }}>
        <div className="eyebrow">How this works</div>
        <div className="grid cols-3" style={{ gap: 18, marginTop: 14 }}>
          <div>
            <div className="serif" style={{ fontSize: 36, lineHeight: 1, fontStyle: 'italic' }}>1.</div>
            <div className="h3" style={{ marginTop: 4, fontSize: 18 }}>Pick your seat</div>
            <p className="soft" style={{ fontSize: 13, marginTop: 4 }}>Add yourself and your friends. Each person's votes stay tagged to them.</p>
          </div>
          <div>
            <div className="serif" style={{ fontSize: 36, lineHeight: 1, fontStyle: 'italic' }}>2.</div>
            <div className="h3" style={{ marginTop: 4, fontSize: 18 }}>Let the game decide</div>
            <p className="soft" style={{ fontSize: 13, marginTop: 4 }}>Slots, roulette, or rank everything in a tier list. Filter first if you're picky.</p>
          </div>
          <div>
            <div className="serif" style={{ fontSize: 36, lineHeight: 1, fontStyle: 'italic' }}>3.</div>
            <div className="h3" style={{ marginTop: 4, fontSize: 18 }}>Log the receipt</div>
            <p className="soft" style={{ fontSize: 13, marginTop: 4 }}>Rate, jot down the best dish, mark would-go-back. Build the group's canon.</p>
          </div>
        </div>
      </div>
    </div>);

}

// ---- Tweaks panel content ----
function WeekenderTweaks({ state, actions, tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Theme">
        <TweakRadio label="Surface" value={tweaks.theme} options={[
        { value: 'cream', label: 'Cream' },
        { value: 'paper', label: 'Paper' },
        { value: 'dusk', label: 'Dusk' }]
        } onChange={(v) => setTweak('theme', v)} />
        <TweakRadio
          label="Accent"
          value={tweaks.accent}
          options={[
          { value: 'terracotta', label: 'Terra' },
          { value: 'forest', label: 'Forest' },
          { value: 'midnight', label: 'Night' },
          { value: 'rose', label: 'Rose' }]
          }
          onChange={(v) => setTweak('accent', v)} />
        
      </TweakSection>
      <TweakSection label="Games">
        <TweakToggle
          label="Roulette: weight by rating"
          value={tweaks.weightByRating}
          onChange={(v) => setTweak('weightByRating', v)}
          hint="Higher-rated restaurants spin up more often." />
        
        <TweakSelect
          label="Slot reel 1"
          value={(tweaks.slotReels || [])[0] || 'cuisine'}
          onChange={(v) => {
            const next = [...(tweaks.slotReels || ['cuisine', 'vibe', 'neighborhood'])];
            next[0] = v;
            setTweak('slotReels', next);
          }}
          options={[
          { value: 'cuisine', label: 'Cuisine' },
          { value: 'vibe', label: 'Vibe' },
          { value: 'neighborhood', label: 'Area' },
          { value: 'price', label: 'Price' },
          { value: 'bestFor', label: 'Best for' }]
          } />
        
        <TweakSelect
          label="Slot reel 2"
          value={(tweaks.slotReels || [])[1] || 'vibe'}
          onChange={(v) => {
            const next = [...(tweaks.slotReels || ['cuisine', 'vibe', 'neighborhood'])];
            next[1] = v;
            setTweak('slotReels', next);
          }}
          options={[
          { value: 'cuisine', label: 'Cuisine' },
          { value: 'vibe', label: 'Vibe' },
          { value: 'neighborhood', label: 'Area' },
          { value: 'price', label: 'Price' },
          { value: 'bestFor', label: 'Best for' }]
          } />
        
        <TweakSelect
          label="Slot reel 3"
          value={(tweaks.slotReels || [])[2] || 'neighborhood'}
          onChange={(v) => {
            const next = [...(tweaks.slotReels || ['cuisine', 'vibe', 'neighborhood'])];
            next[2] = v;
            setTweak('slotReels', next);
          }}
          options={[
          { value: 'cuisine', label: 'Cuisine' },
          { value: 'vibe', label: 'Vibe' },
          { value: 'neighborhood', label: 'Area' },
          { value: 'price', label: 'Price' },
          { value: 'bestFor', label: 'Best for' }]
          } />
        
      </TweakSection>
      <TweakSection label="Sharing & data">
        <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 6 }}>
          Send your tiers, ratings, and visits to a friend — or merge in theirs.
        </div>
        <TweakButton label="Export to JSON" onClick={() => {
          const json = actions.exportState();
          if (!json) { alert('Could not export.'); return; }
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const stamp = new Date().toISOString().slice(0,10);
          a.href = url; a.download = `weekender-${stamp}.json`;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }} />
        <TweakButton label="Import from file…" secondary onClick={() => {
          const input = document.createElement('input');
          input.type = 'file'; input.accept = '.json,application/json';
          input.onchange = async (e) => {
            const f = e.target.files && e.target.files[0]; if (!f) return;
            const text = await f.text();
            const mode = confirm("Click OK to MERGE the file into your data (keeps everything you have).\nClick Cancel to REPLACE all your data with the file.") ? 'merge' : 'replace';
            if (mode === 'replace' && !confirm('Replace really wipes your current ratings, tiers and visits. Continue?')) return;
            const result = actions.importState(text, mode);
            if (result.ok) alert(`Imported. ${result.profilesAdded} profile(s) in file.`);
            else alert('Import failed: ' + (result.error || 'unknown'));
          };
          input.click();
        }} />
        <div style={{ height: 8 }}></div>
        <TweakButton label="Reset all data" secondary onClick={() => {
          if (confirm('Wipe all profiles, visits, ratings, and tier lists? Cannot be undone.')) actions.resetAll();
        }} />
      </TweakSection>
    </TweaksPanel>);

}

// ---- Main App ----
function App() {
  const [state, actions] = useStore();
  const [tweaks, setTweaksState] = useTweaks(TWEAK_DEFAULTS);
  const setTweak = (k, v) => {
    if (typeof k === 'object') setTweaksState(k);else
    setTweaksState({ [k]: v });
  };
  const [tab, setTab] = useState(() => {
    try { const p = new URLSearchParams(window.location.search).get('tab'); if (p) return p; } catch (e) {}
    return 'home';
  });
  const [openId, setOpenId] = useState(null);
  const [logId, setLogId] = useState(null);
  const [toast, setToast] = useState(null);

  const onOpen = (id) => setOpenId(id);
  const onLog = (id) => {setOpenId(null);setLogId(id);};
  const onLoggedSaved = () => {setLogId(null);setToast('Visit logged.');};

  const tabs = [
  { id: 'home', label: 'Home' },
  { id: 'browse', label: 'Browse', num: window.RESTAURANTS.length },
  { id: 'slots', label: 'Slots' },
  { id: 'roulette', label: 'Roulette' },
  { id: 'tiers', label: 'Tier list' },
  { id: 'log', label: 'Log', num: state.visits.filter((v) => v.profileId === state.activeProfileId).length || null },
  { id: 'stats', label: 'Stats' }];


  return (
    <div className="app" data-screen-label="Weekender">
      <ThemeApplier tweaks={tweaks} />
      <nav className="nav">
        <div className="brand">
          <span className="brand-mark">Weekenders
</span>
          <span className="brand-meta">MTL · {window.RESTAURANTS.length} spots</span>
        </div>
        <div className="tabs">
          {tabs.map((t) => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
              {t.num != null && t.num > 0 && <span className="num">{t.num}</span>}
            </button>
          )}
        </div>
        <ProfilePicker state={state} actions={actions} />
      </nav>

      {tab === 'home' && <HomeScreen state={state} actions={actions} onOpen={onOpen} setTab={setTab} tweaks={tweaks} />}
      {tab === 'browse' && <BrowseScreen state={state} actions={actions} onOpen={onOpen} />}
      {tab === 'slots' && <SlotsScreen state={state} actions={actions} onOpen={onOpen} tweaks={tweaks} />}
      {tab === 'roulette' && <RouletteScreen state={state} actions={actions} onOpen={onOpen} tweaks={tweaks} />}
      {tab === 'tiers' && <TierScreen state={state} actions={actions} onOpen={onOpen} tweaks={tweaks} />}
      {tab === 'log' && <LogScreen state={state} actions={actions} onOpen={onOpen} />}
      {tab === 'stats' && <StatsScreen state={state} actions={actions} onOpen={onOpen} />}

      <RestaurantDetail
        restaurantId={openId}
        state={state}
        actions={actions}
        onClose={() => setOpenId(null)}
        onLog={onLog} />
      
      <LogVisitSheet
        restaurantId={logId}
        state={state}
        actions={actions}
        onClose={() => setLogId(null)}
        onSaved={onLoggedSaved} />
      

      <WeekenderTweaks state={state} actions={actions} tweaks={tweaks} setTweak={setTweak} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);