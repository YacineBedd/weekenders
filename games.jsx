/* Weekender — Slots, Roulette, Tier List games */

// ---- Slots ----
function SlotsScreen({ state, actions, onOpen, tweaks }) {
  const reelFields = tweaks.slotReels || ['cuisine', 'vibe', 'neighborhood'];
  const [filters, setFilters] = useState({});
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [strips, setStrips] = useState([[], [], []]);
  const reelRefs = [useRef(null), useRef(null), useRef(null)];

  const pool = useMemo(() => applyFilters(window.RESTAURANTS, filters), [filters]);

  const reelData = useMemo(() => reelFields.map(f => {
    const values = [...new Set(pool.map(r => r[f]).filter(Boolean))];
    while (values.length < 6 && values.length > 0) values.push(...values);
    return values.length ? values : ['—'];
  }), [pool, reelFields.join('|')]);

  const labels = { cuisine: 'Cuisine', vibe: 'Vibe', neighborhood: 'Area', price: 'Price', bestFor: 'Best for' };
  const itemH = 56;
  const TARGET_IDX = 30;
  const STRIP_LEN = 36;

  // Build initial display strips when not spinning
  useEffect(() => {
    if (spinning) return;
    const initial = reelData.map(vals => {
      const s = [];
      for (let k = 0; k < STRIP_LEN; k++) s.push(vals[k % vals.length]);
      return s;
    });
    setStrips(initial);
    // Snap reels to top with no transition
    reelRefs.forEach(ref => {
      if (ref.current) {
        ref.current.style.transition = 'none';
        ref.current.style.transform = 'translateY(0)';
      }
    });
  }, [reelData]);

  const spin = () => {
    if (!pool.length || spinning) return;
    setSpinning(true);
    setResult(null);

    const target = pool[Math.floor(Math.random() * pool.length)];
    const targets = reelFields.map(f => target[f]);

    // Build new strips with target at TARGET_IDX
    const newStrips = reelData.map((vals, i) => {
      const s = [];
      for (let k = 0; k < STRIP_LEN; k++) s.push(vals[Math.floor(Math.random() * vals.length)]);
      s[TARGET_IDX] = targets[i];
      // Also seed first frame with random for visual chaos
      s[0] = vals[Math.floor(Math.random() * vals.length)];
      return s;
    });
    setStrips(newStrips);

    const durations = [1.6, 2.2, 2.9];

    // After React renders, kick off animations imperatively
    requestAnimationFrame(() => {
      reelRefs.forEach((ref, i) => {
        const el = ref.current;
        if (!el) return;
        // Phase 1: snap to 0 with no transition
        el.style.transition = 'none';
        el.style.transform = 'translateY(0)';
        // Force reflow to commit the snap
        void el.offsetHeight;
        // Phase 2: enable transition and move to final
        requestAnimationFrame(() => {
          el.style.transition = `transform ${durations[i]}s cubic-bezier(0.16, 1, 0.3, 1)`;
          el.style.transform = `translateY(${-(TARGET_IDX * itemH)}px)`;
        });
      });
    });

    setTimeout(() => {
      const values = {};
      reelFields.forEach((f, i) => { values[f] = targets[i]; });
      const matches = window.RESTAURANTS.filter(r => reelFields.every(f => r[f] === values[f]));
      setResult({ values, matches, picked: target });
      setSpinning(false);
    }, Math.max(...durations) * 1000 + 250);
  };

  return (
    <div>
      <div className="hero">
        <div className="eyebrow">Game · Slot machine</div>
        <h1 className="h-display" style={{ marginTop: 8, marginBottom: 12 }}>Pull the lever, <em>let dinner pick itself.</em></h1>
        <p className="lede" style={{ maxWidth: 620 }}>
          Three reels: cuisine, vibe, neighborhood. They lock into a real restaurant from your list. The fates cannot be appealed.
        </p>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} restaurants={window.RESTAURANTS} />

      <div className="slot-stage">
        <div className="reels">
          {reelFields.map((f, i) => (
            <div key={f + i} className="reel">
              <div className="reel-head">{labels[f] || f}</div>
              <div className="reel-track" ref={reelRefs[i]}>
                {strips[i] && strips[i].map((v, k) => (
                  <div key={k} className="reel-item">{v}</div>
                ))}
              </div>
              <div className="reel-mask"></div>
            </div>
          ))}
        </div>

        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <button className="btn btn-lg btn-accent" onClick={spin} disabled={spinning || !pool.length}>
            {spinning ? 'Spinning…' : '▶ Spin'}
          </button>
          <span className="mono soft" style={{ fontSize: 12 }}>
            {pool.length} restaurant{pool.length === 1 ? '' : 's'} in pool
          </span>
        </div>

        {result && !spinning && (
          <div style={{ width: '100%', maxWidth: 720, animation: 'slide-up 0.4s' }}>
            <div className="divider"></div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Tonight's reservation</div>
            <RestaurantCard r={result.picked} onClick={() => onOpen(result.picked.id)} />
            {result.matches.length > 1 && (
              <p className="soft" style={{ fontSize: 12, marginTop: 10, fontFamily: 'var(--mono)' }}>
                {result.matches.length} restaurants matched these reels — picked one at random.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Roulette ----
function RouletteScreen({ state, actions, onOpen, tweaks }) {
  const [filters, setFilters] = useState({});
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showConfetti, setShowConfetti] = useState(0);

  const pool = useMemo(() => applyFilters(window.RESTAURANTS, filters), [filters]);

  const colors = [
    'oklch(0.95 0.04 35)',
    'oklch(0.97 0.012 80)',
    'oklch(0.92 0.04 95)',
    'oklch(0.94 0.03 160)',
    'oklch(0.96 0.025 60)',
    'oklch(0.93 0.04 230)',
  ];

  const slice = pool.length > 0 ? 360 / pool.length : 0;

  const buildSlicePath = (cx, cy, r, startA, endA) => {
    const toRad = a => (a - 90) * Math.PI / 180;
    const sx = cx + r * Math.cos(toRad(startA));
    const sy = cy + r * Math.sin(toRad(startA));
    const ex = cx + r * Math.cos(toRad(endA));
    const ey = cy + r * Math.sin(toRad(endA));
    const large = endA - startA > 180 ? 1 : 0;
    return `M${cx},${cy} L${sx},${sy} A${r},${r} 0 ${large} 1 ${ex},${ey} Z`;
  };

  const spin = () => {
    if (!pool.length) return;
    setSpinning(true);
    setWinner(null);
    let idx;
    if (tweaks.weightByRating) {
      // Weight by rating
      const weights = pool.map(r => Math.pow((r.rating || 3) - 2, 2) + 0.1);
      const sum = weights.reduce((a, b) => a + b, 0);
      let rnd = Math.random() * sum;
      for (let i = 0; i < pool.length; i++) {
        rnd -= weights[i];
        if (rnd <= 0) { idx = i; break; }
      }
      if (idx == null) idx = pool.length - 1;
    } else {
      idx = Math.floor(Math.random() * pool.length);
    }
    // Land so that the pointer (at 0deg/top) points to slice idx's center.
    const targetCenter = idx * slice + slice / 2;
    const turns = 5 + Math.random() * 2;
    const finalAngle = -targetCenter + 360 * turns;
    setAngle(angle + (finalAngle % 360 < 360 ? finalAngle : finalAngle));
    // simpler: set absolute spin
    const newAngle = angle - (angle % 360) + (360 * Math.ceil(turns) - targetCenter);
    setAngle(newAngle);

    setTimeout(() => {
      setSpinning(false);
      setWinner(pool[idx]);
      setShowConfetti(c => c + 1);
    }, 5100);
  };

  return (
    <div>
      <Confetti run={showConfetti} />
      <div className="hero">
        <div className="eyebrow">Game · Roulette</div>
        <h1 className="h-display" style={{ marginTop: 8, marginBottom: 12 }}>One spin. <em>One winner.</em></h1>
        <p className="lede" style={{ maxWidth: 620 }}>
          The whole list — or whatever survives the filters — laid around a wheel. Tap spin, accept your fate.
        </p>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} restaurants={window.RESTAURANTS} />

      <div className="roulette-stage">
        <div className="wheel-wrap">
          <div className="wheel-pointer"></div>
          <div className="wheel" style={{ transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 5s cubic-bezier(0.16, 1, 0.3, 1)' : 'none' }}>
            {pool.length > 0 && (
              <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', display: 'block' }}>
                {pool.map((r, i) => {
                  const startA = i * slice;
                  const endA = (i + 1) * slice;
                  const fill = colors[i % colors.length];
                  return (
                    <g key={r.id}>
                      <path d={buildSlicePath(100, 100, 100, startA, endA)} fill={fill} stroke="oklch(0.86 0.012 70)" strokeWidth="0.4" />
                      <text
                        x="100" y="100"
                        transform={`rotate(${startA + slice / 2} 100 100) translate(0 -55)`}
                        textAnchor="middle"
                        fontSize={pool.length > 60 ? 2.2 : pool.length > 40 ? 2.8 : pool.length > 24 ? 3.4 : pool.length > 14 ? 4 : 5}
                        fontFamily="var(--serif)"
                        fill="oklch(0.20 0.008 50)"
                        style={{ letterSpacing: '-0.02em' }}
                      >
                        {(() => {
                          const max = pool.length > 60 ? 12 : pool.length > 40 ? 14 : pool.length > 24 ? 16 : 18;
                          return r.name.length > max ? r.name.slice(0, max - 1) + '…' : r.name;
                        })()}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
          <div className="wheel-hub">{spinning ? '…' : 'spin'}</div>
        </div>

        <div>
          <div className="card">
            <div className="eyebrow">Status</div>
            <div className="h2" style={{ marginTop: 6 }}>
              {spinning ? 'Spinning…' : winner ? 'We have a winner.' : 'Ready when you are.'}
            </div>
            <p className="soft" style={{ fontSize: 13, marginTop: 8 }}>
              {pool.length} of {window.RESTAURANTS.length} restaurants on the wheel.
              {tweaks.weightByRating && <span> Weighted by rating.</span>}
            </p>
            <div className="row" style={{ gap: 8, marginTop: 16 }}>
              <button className="btn btn-lg btn-accent" onClick={spin} disabled={spinning || !pool.length}>
                {spinning ? 'Spinning…' : '▶ Spin the wheel'}
              </button>
            </div>
          </div>

          {winner && !spinning && (
            <div style={{ marginTop: 16, animation: 'slide-up 0.4s' }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>You're going to</div>
              <RestaurantCard r={winner} onClick={() => onOpen(winner.id)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Tier list ----
function TierScreen({ state, actions, onOpen, tweaks }) {
  const [filters, setFilters] = useState({});
  const tierSet = TIER_SETS[state.tierSet] || TIER_SETS.classic;
  const profileTiers = state.tiers[state.activeProfileId] || {};
  const [draggedId, setDraggedId] = useState(null);
  const [overTier, setOverTier] = useState(null);

  const filtered = useMemo(() => applyFilters(window.RESTAURANTS, filters), [filters]);
  const tieredIds = new Set(Object.keys(profileTiers));
  const pool = filtered.filter(r => !tieredIds.has(r.id));
  const tieredById = (key) => filtered.filter(r => profileTiers[r.id] === key);

  const onDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragOver = (e, key) => {
    e.preventDefault();
    setOverTier(key);
  };
  const onDrop = (e, key) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (id) {
      if (key === '__pool__') actions.setTier(id, null);
      else actions.setTier(id, key);
    }
    setDraggedId(null); setOverTier(null);
  };
  const onDragEnd = () => { setDraggedId(null); setOverTier(null); };

  const Token = ({ r }) => (
    <div
      className={`tier-token ${draggedId === r.id ? 'dragging' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, r.id)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(r.id)}
      title={r.name}
    >
      <span className="tt-dot" style={{ background: 'var(--accent)' }}></span>
      {r.name}
    </div>
  );

  // Mobile fallback: tap to open menu and assign
  const [pickerFor, setPickerFor] = useState(null);

  return (
    <div>
      <div className="hero">
        <div className="eyebrow">Game · Tier list</div>
        <h1 className="h-display" style={{ marginTop: 8, marginBottom: 12 }}>
          The <em>definitive</em> ranking. <span style={{ fontStyle: 'normal', fontFamily: 'var(--mono)', fontSize: 14, letterSpacing: '0.06em', color: 'var(--muted)' }}>(According to {getActiveProfile(state).name})</span>
        </h1>
        <p className="lede" style={{ maxWidth: 620 }}>
          Drag any restaurant to a tier. Each profile has their own list. Argue with your friends.
        </p>
      </div>

      <div className="row" style={{ marginBottom: 14, gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="label">Tier set</span>
          <button className={`chip ${state.tierSet === 'classic' ? 'on' : ''}`} onClick={() => actions.setTierSet('classic')}>Classic S–F</button>
          <button className={`chip ${state.tierSet === 'editorial' ? 'on' : ''}`} onClick={() => actions.setTierSet('editorial')}>Editorial labels</button>
        </div>
        {Object.keys(profileTiers).length > 0 && (
          <button className="btn btn-ghost" onClick={() => { if (confirm('Clear your entire tier list?')) actions.clearTiers(); }}>Clear list</button>
        )}
      </div>

      <FilterBar filters={filters} setFilters={setFilters} restaurants={window.RESTAURANTS} />

      <div>
        {tierSet.map(t => (
          <div className="tier-row" key={t.key}>
            <div className="tier-label" style={{ background: t.color }}>
              {t.label}
              <span className="tier-sub">{t.sub}</span>
            </div>
            <div
              className={`tier-bay ${overTier === t.key ? 'over' : ''}`}
              onDragOver={(e) => onDragOver(e, t.key)}
              onDragLeave={() => setOverTier(null)}
              onDrop={(e) => onDrop(e, t.key)}
            >
              {tieredById(t.key).map(r => <Token key={r.id} r={r} />)}
              {tieredById(t.key).length === 0 && (
                <span className="soft" style={{ fontSize: 12, fontFamily: 'var(--mono)', alignSelf: 'center', padding: '0 4px' }}>
                  drop here
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <div className="row" style={{ marginBottom: 8, gap: 8, alignItems: 'baseline' }}>
          <span className="eyebrow">Unranked</span>
          <span className="soft" style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>{pool.length}</span>
          <span className="spacer"></span>
          <span className="soft" style={{ fontSize: 12 }}>Tap to rank quickly</span>
        </div>
        <div
          className="tier-pool"
          onDragOver={(e) => onDragOver(e, '__pool__')}
          onDragLeave={() => setOverTier(null)}
          onDrop={(e) => onDrop(e, '__pool__')}
        >
          {pool.length === 0 && (
            <span className="soft" style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>All ranked. Bow before your taste.</span>
          )}
          {pool.map(r => (
            <div
              key={r.id}
              className="tier-token"
              draggable
              onDragStart={(e) => onDragStart(e, r.id)}
              onDragEnd={onDragEnd}
              onClick={() => setPickerFor(r.id)}
            >
              <span className="tt-dot"></span>
              {r.name}
            </div>
          ))}
        </div>
      </div>

      {pickerFor && (
        <Sheet open={!!pickerFor} onClose={() => setPickerFor(null)}>
          <div className="sheet-head">
            <div>
              <div className="eyebrow">Quick rank</div>
              <div className="h2" style={{ marginTop: 4 }}>{getRestaurantById(pickerFor)?.name}</div>
            </div>
            <button className="x-btn" onClick={() => setPickerFor(null)}>✕</button>
          </div>
          <div className="sheet-body">
            <div className="grid" style={{ gap: 8 }}>
              {tierSet.map(t => (
                <button
                  key={t.key}
                  className="row"
                  style={{ background: t.color, color: 'var(--paper)', border: 'none', borderRadius: 'var(--r)', padding: '14px 18px', cursor: 'pointer', justifyContent: 'space-between' }}
                  onClick={() => { actions.setTier(pickerFor, t.key); setPickerFor(null); }}
                >
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 22 }}>{t.label}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em' }}>{t.sub}</span>
                </button>
              ))}
              <button className="btn btn-ghost" onClick={() => setPickerFor(null)}>Cancel</button>
              <button className="btn btn-ghost" onClick={() => { onOpen(pickerFor); setPickerFor(null); }}>See restaurant details ↗</button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}

Object.assign(window, { SlotsScreen, RouletteScreen, TierScreen });
