/* Weekender shared UI components */
const { Fragment } = React;

function Pill({ children, tone, mono = true, className = '' }) {
  return <span className={`pill ${tone || ''} ${className}`} style={mono ? {} : { fontFamily: 'var(--sans)' }}>{children}</span>;
}

function Stars({ value = 0, onChange, max = 5, size = 22 }) {
  const [hover, setHover] = useState(0);
  const cur = hover || value;
  return (
    <div className="stars" onMouseLeave={() => setHover(0)}>
      {Array.from({ length: max }).map((_, i) => {
        const v = i + 1;
        return (
          <button
            key={i}
            className={`star ${v <= cur ? 'on' : ''}`}
            style={{ fontSize: size }}
            onMouseEnter={() => onChange && setHover(v)}
            onClick={() => onChange && onChange(v === value ? 0 : v)}
            type="button"
          >★</button>
        );
      })}
    </div>
  );
}

function StarsRO({ value, size = 14 }) {
  return (
    <span className="stars" style={{ pointerEvents: 'none' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`star ${i < Math.round(value) ? 'on' : ''}`} style={{ fontSize: size, padding: 0 }}>★</span>
      ))}
    </span>
  );
}

function Avatar({ profile, size = 26, className = '' }) {
  if (!profile) return null;
  return (
    <div className={`avatar ${className}`} style={{ width: size, height: size, background: profile.color, fontSize: Math.round(size * 0.42) }}>
      {initials(profile.name)}
    </div>
  );
}

function RestaurantCard({ r, status, onClick, rightSlot }) {
  return (
    <article className="r-card" onClick={onClick}>
      {status && <div className={`r-status ${status === 'wishlist' ? 'wish' : ''}`}>{status === 'wishlist' ? 'Wishlist' : 'Visited'}</div>}
      <div>
        <div className="r-name">{r.name}</div>
        <div className="r-meta" style={{ marginTop: 6 }}>
          <Pill>{r.cuisine}</Pill>
          <Pill>{r.neighborhood}</Pill>
          <Pill tone="">{r.price}</Pill>
        </div>
      </div>
      <div className="r-side">
        {rightSlot || (
          <Fragment>
            <div className="r-rating">{r.rating ? r.rating.toFixed(1) : '—'}</div>
            <div className="r-rating-sub">guide</div>
          </Fragment>
        )}
      </div>
      {r.description && <p className="r-desc" style={{ margin: '4px 0 0' }}>{r.description}</p>}
    </article>
  );
}

function Sheet({ open, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className={`sheet ${wide ? 'wide' : ''}`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onDone(), 2200);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

function ProfilePicker({ state, actions }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);
  const active = getActiveProfile(state);
  const submitAdd = () => {
    if (!name.trim()) return;
    actions.addProfile(name.trim());
    setName(''); setAdding(false); setOpen(false);
  };
  return (
    <div style={{ display: 'contents' }}>
      <button className="who" onClick={() => setOpen(true)}>
        <span className="who-label">You</span>
        <span className="who-name">{active.name}</span>
        <Avatar profile={active} />
      </button>
      <Sheet open={open} onClose={() => { setOpen(false); setAdding(false); }}>
        <div className="sheet-head">
          <div>
            <div className="eyebrow">Who's choosing</div>
            <div className="h2" style={{ marginTop: 4 }}>Pick your seat at the table</div>
          </div>
          <button className="x-btn" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="sheet-body">
          <p className="lede" style={{ margin: '0 0 16px' }}>
            Each person gets their own ratings, tier list, and wishlist. Switch between you and your friends — everything stays sorted by who said what.
          </p>
          <div className="grid" style={{ gap: 8 }}>
            {state.profiles.map(p => {
              const isActive = state.activeProfileId === p.id;
              return (
                <div
                  key={p.id}
                  className="card tight"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: 12,
                    cursor: isActive ? 'default' : 'pointer',
                    borderColor: isActive ? 'var(--ink)' : 'var(--border)',
                    background: isActive ? 'oklch(0.95 0.012 70)' : 'var(--paper)',
                  }}
                  onClick={(e) => {
                    if (isActive) return;
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                    actions.setActive(p.id);
                    setOpen(false);
                  }}
                >
                  <Avatar profile={p} size={36} />
                  <input
                    defaultValue={p.name}
                    className="input"
                    style={{ border: 'none', padding: 0, fontSize: 16, fontWeight: 500, flex: 1, background: 'transparent' }}
                    onClick={e => e.stopPropagation()}
                    onBlur={e => { if (e.target.value.trim() && e.target.value !== p.name) actions.renameProfile(p.id, e.target.value.trim()); }}
                  />
                  {isActive ? (
                    <Pill tone="solid">Active</Pill>
                  ) : (
                    <span className="mono soft" style={{ fontSize: 11, letterSpacing: '0.06em' }}>tap to switch →</span>
                  )}
                  {state.profiles.length > 1 && (
                    <button
                      className="x-btn"
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${p.name}? Their visits and tiers will be deleted.`)) actions.removeProfile(p.id); }}
                      title="Remove this profile"
                    >✕</button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="divider"></div>
          {adding ? (
            <div className="row" style={{ gap: 8 }}>
              <input
                ref={inputRef}
                className="input"
                placeholder="Friend's name"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitAdd(); if (e.key === 'Escape') { setAdding(false); setName(''); } }}
                style={{ flex: 1 }}
              />
              <button className="btn" onClick={submitAdd}>Add</button>
              <button className="btn btn-ghost" onClick={() => { setAdding(false); setName(''); }}>Cancel</button>
            </div>
          ) : (
            <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
              <button className="btn btn-ghost" onClick={() => setAdding(true)}>+ Add a friend</button>
              <button className="btn" onClick={() => setOpen(false)}>Done</button>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}

// ---- Filter bar ----
function FilterBar({ filters, setFilters, restaurants }) {
  const fields = useMemo(() => ({
    cuisine: [...new Set(restaurants.map(r => r.cuisine))].filter(Boolean).sort(),
    neighborhood: [...new Set(restaurants.map(r => r.neighborhood))].filter(Boolean).sort(),
    vibe: [...new Set(restaurants.map(r => r.vibe))].filter(Boolean).sort(),
    price: ['$$', '$$$', '$$$$'],
  }), [restaurants]);

  const toggle = (field, value) => {
    const cur = filters[field] || [];
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
    setFilters({ ...filters, [field]: next });
  };

  const clear = () => setFilters({});
  const activeCount = Object.values(filters).flat().length;

  const Row = ({ field, label }) => (
    <div className="filter-row">
      <span className="label">{label}</span>
      <div className="chip-row">
        {fields[field].map(v => (
          <button
            key={v}
            className={`chip ${(filters[field] || []).includes(v) ? 'on' : ''}`}
            onClick={() => toggle(field, v)}
          >{v}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="filter-bar">
      <div className="filter-row" style={{ marginBottom: 4 }}>
        <span className="eyebrow">Filters</span>
        <span className="muted" style={{ fontSize: 12 }}>{activeCount > 0 ? `${activeCount} active` : 'Show everything'}</span>
        <span className="spacer"></span>
        {activeCount > 0 && <button className="chip" onClick={clear}>Clear all ✕</button>}
      </div>
      <Row field="cuisine" label="Cuisine" />
      <Row field="neighborhood" label="Area" />
      <Row field="price" label="Price" />
      <Row field="vibe" label="Vibe" />
    </div>
  );
}

function applyFilters(restaurants, filters) {
  return restaurants.filter(r => {
    for (const [field, values] of Object.entries(filters)) {
      if (!values || values.length === 0) continue;
      const key = { cuisine: 'cuisine', neighborhood: 'neighborhood', price: 'price', vibe: 'vibe' }[field];
      if (!values.includes(r[key])) return false;
    }
    return true;
  });
}

function Confetti({ run }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!run) return;
    const colors = ['oklch(0.58 0.17 35)', 'oklch(0.42 0.08 160)', 'oklch(0.78 0.13 85)', 'oklch(0.20 0.008 50)', 'oklch(0.72 0.10 15)'];
    const next = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      dur: 1.4 + Math.random() * 1.2,
      color: colors[i % colors.length],
      rot: Math.random() * 360,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 3000);
    return () => clearTimeout(t);
  }, [run]);
  if (!pieces.length) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 150, overflow: 'hidden' }}>
      {pieces.map(p => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            top: -20,
            background: p.color,
            transform: `rotate(${p.rot}deg)`,
            animation: `confetti-fall ${p.dur}s ${p.delay}s linear forwards`,
          }}
        />
      ))}
    </div>
  );
}

Object.assign(window, {
  Pill, Stars, StarsRO, Avatar, RestaurantCard, Sheet, Toast, ProfilePicker,
  FilterBar, applyFilters, Confetti,
});
