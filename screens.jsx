/* Browse + Log + Stats screens */

// ---- Browse: list of all restaurants with filters ----
function BrowseScreen({ state, actions, onOpen }) {
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('rating'); // rating | name | price

  const filtered = useMemo(() => {
    let list = applyFilters(window.RESTAURANTS, filters);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q) || r.neighborhood.toLowerCase().includes(q));
    }
    if (sortBy === 'rating') list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortBy === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'price') list = [...list].sort((a, b) => (a.price || '').length - (b.price || '').length);
    return list;
  }, [filters, search, sortBy]);

  const visited = new Set(state.visits.filter(v => v.profileId === state.activeProfileId).map(v => v.restaurantId));
  const wishlist = new Set(Object.keys(state.wishlist).filter(id => state.wishlist[id][state.activeProfileId]));

  return (
    <div>
      <div className="hero">
        <div className="eyebrow">The full list</div>
        <h1 className="h-display" style={{ marginTop: 8, marginBottom: 12 }}>
          {window.RESTAURANTS.length} <em>places</em> worth your weekend.
        </h1>
        <p className="lede" style={{ maxWidth: 620 }}>
          Curated, filtered, ranked. Tap any card for the full details, or send it to the games to let chance decide.
        </p>
        <div className="meta-row">
          <div className="stat"><span className="stat-num">{visited.size}</span><span className="stat-label">visited</span></div>
          <div className="stat"><span className="stat-num">{wishlist.size}</span><span className="stat-label">wishlist</span></div>
          <div className="stat"><span className="stat-num">{window.RESTAURANTS.length - visited.size}</span><span className="stat-label">to discover</span></div>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Search restaurant, cuisine, neighborhood…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 240, maxWidth: 380 }}
        />
        <span className="label" style={{ margin: 0 }}>Sort</span>
        <button className={`chip ${sortBy === 'rating' ? 'on' : ''}`} onClick={() => setSortBy('rating')}>Rating</button>
        <button className={`chip ${sortBy === 'name' ? 'on' : ''}`} onClick={() => setSortBy('name')}>A–Z</button>
        <button className={`chip ${sortBy === 'price' ? 'on' : ''}`} onClick={() => setSortBy('price')}>Price</button>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} restaurants={window.RESTAURANTS} />

      <div className="grid cols-auto" style={{ gap: 14 }}>
        {filtered.map(r => {
          const status = visited.has(r.id) ? 'visited' : wishlist.has(r.id) ? 'wishlist' : null;
          return <RestaurantCard key={r.id} r={r} status={status} onClick={() => onOpen(r.id)} />;
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty">
          <div className="empty-h">Nothing in this corner</div>
          <p>Loosen the filters and try again.</p>
        </div>
      )}
    </div>
  );
}

// ---- Log: per-profile history ----
function LogScreen({ state, actions, onOpen }) {
  const [scope, setScope] = useState('mine'); // mine | all
  const profile = getActiveProfile(state);
  const visits = useMemo(() => {
    const list = scope === 'mine' ? state.visits.filter(v => v.profileId === profile.id) : state.visits;
    return [...list].sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [state.visits, scope, profile.id]);

  const wishlistIds = Object.keys(state.wishlist).filter(id => scope === 'mine' ? state.wishlist[id][profile.id] : Object.keys(state.wishlist[id]).length > 0);

  return (
    <div>
      <div className="hero">
        <div className="eyebrow">Visit log</div>
        <h1 className="h-display" style={{ marginTop: 8, marginBottom: 12 }}>
          The <em>receipt</em> of every weekend.
        </h1>
        <p className="lede" style={{ maxWidth: 620 }}>
          Where you've been, what was great, what to never order again. Filtered by you — switch profiles to see your friends' takes.
        </p>
      </div>

      <div className="row" style={{ marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <button className={`chip ${scope === 'mine' ? 'on' : ''}`} onClick={() => setScope('mine')}>Mine ({profile.name})</button>
        <button className={`chip ${scope === 'all' ? 'on' : ''}`} onClick={() => setScope('all')}>Everyone</button>
      </div>

      {wishlistIds.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>On the wishlist · {wishlistIds.length}</div>
          <div className="grid cols-auto" style={{ gap: 12 }}>
            {wishlistIds.map(id => {
              const r = getRestaurantById(id);
              if (!r) return null;
              return <RestaurantCard key={id} r={r} status="wishlist" onClick={() => onOpen(id)} />;
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="row" style={{ marginBottom: 8, alignItems: 'baseline' }}>
          <div className="eyebrow">History</div>
          <span className="soft" style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>{visits.length} visit{visits.length === 1 ? '' : 's'}</span>
        </div>

        {visits.length === 0 ? (
          <div className="empty" style={{ marginTop: 12 }}>
            <div className="empty-h">No receipts yet</div>
            <p>Spin, roll, or just pick something. Then log how it went.</p>
          </div>
        ) : (
          visits.map(v => {
            const r = getRestaurantById(v.restaurantId);
            const p = state.profiles.find(p => p.id === v.profileId);
            if (!r) return null;
            return (
              <div key={v.id} className="entry" onClick={() => onOpen(r.id)} style={{ cursor: 'pointer' }}>
                <div className="e-date">
                  {fmtDateShort(v.date)}<br/>
                  <span style={{ color: p?.color, fontWeight: 600 }}>{p?.name || '—'}</span>
                </div>
                <div>
                  <div className="e-name">{r.name}</div>
                  <div className="e-meta">
                    <Pill>{r.cuisine}</Pill>
                    <Pill>{r.neighborhood}</Pill>
                    {v.wouldReturn === true && <Pill tone="green">Would go back</Pill>}
                    {v.wouldReturn === false && <Pill tone="">Probably not</Pill>}
                  </div>
                  {v.bestDish && <div style={{ marginTop: 8, fontSize: 14 }}><span className="eyebrow" style={{ marginRight: 6 }}>Best dish</span>{v.bestDish}</div>}
                  {v.note && <div className="e-note">"{v.note}"</div>}
                  {v.withWho && <div className="soft" style={{ fontSize: 12, marginTop: 6 }}>with {v.withWho}</div>}
                </div>
                <div>
                  <div className="e-rating">{v.rating ? v.rating.toFixed(1) : '—'}</div>
                  <div className="e-rating-sub">stars</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ---- Stats ----
function StatsScreen({ state, actions, onOpen }) {
  const profile = getActiveProfile(state);
  const myVisits = state.visits.filter(v => v.profileId === profile.id);
  const myRestaurants = new Set(myVisits.map(v => v.restaurantId));
  const ratings = myVisits.map(v => v.rating).filter(Boolean);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const cuisineCounts = {};
  const neighborhoodCounts = {};
  const priceCounts = {};
  myVisits.forEach(v => {
    const r = getRestaurantById(v.restaurantId);
    if (!r) return;
    cuisineCounts[r.cuisine] = (cuisineCounts[r.cuisine] || 0) + 1;
    neighborhoodCounts[r.neighborhood] = (neighborhoodCounts[r.neighborhood] || 0) + 1;
    priceCounts[r.price] = (priceCounts[r.price] || 0) + 1;
  });
  const sortByCount = obj => Object.entries(obj).sort((a, b) => b[1] - a[1]);
  const topCuisines = sortByCount(cuisineCounts).slice(0, 6);
  const topNeighborhoods = sortByCount(neighborhoodCounts).slice(0, 6);

  // Group leaderboard
  const profileStats = state.profiles.map(p => {
    const v = state.visits.filter(x => x.profileId === p.id);
    const r = v.map(x => x.rating).filter(Boolean);
    return {
      profile: p,
      visits: v.length,
      avg: r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0,
      restaurants: new Set(v.map(x => x.restaurantId)).size,
    };
  }).sort((a, b) => b.visits - a.visits);

  // Best & worst
  const ratedVisits = myVisits.filter(v => v.rating).sort((a, b) => b.rating - a.rating);
  const best = ratedVisits[0];
  const worst = ratedVisits[ratedVisits.length - 1];

  const Bar = ({ label, value, max }) => (
    <div className="bar">
      <div className="bar-label">{label}</div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${(value / max) * 100}%` }}></div></div>
      <div className="bar-num">{value}</div>
    </div>
  );

  return (
    <div>
      <div className="hero">
        <div className="eyebrow">Stats · {profile.name}</div>
        <h1 className="h-display" style={{ marginTop: 8, marginBottom: 12 }}>
          The <em>receipts</em> add up.
        </h1>
        <p className="lede" style={{ maxWidth: 620 }}>
          What you've seen, what you've avoided, what your friends are voting for.
        </p>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 24, gap: 14 }}>
        <div className="stat-card">
          <div className="eyebrow">Total visits</div>
          <div className="big">{myVisits.length}</div>
          <div className="soft" style={{ fontSize: 13 }}>{myRestaurants.size} unique restaurants</div>
        </div>
        <div className="stat-card">
          <div className="eyebrow">Avg rating</div>
          <div className="big">{avg ? avg.toFixed(1) : '—'}</div>
          <div className="soft" style={{ fontSize: 13 }}>{ratings.length ? `over ${ratings.length} ratings` : 'rate something to see this'}</div>
        </div>
        <div className="stat-card">
          <div className="eyebrow">Coverage</div>
          <div className="big">{Math.round((myRestaurants.size / window.RESTAURANTS.length) * 100)}<span style={{ fontSize: 28 }}>%</span></div>
          <div className="soft" style={{ fontSize: 13 }}>{window.RESTAURANTS.length - myRestaurants.size} left to try</div>
        </div>
      </div>

      <div className="grid cols-2" style={{ gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Cuisines you keep choosing</div>
          {topCuisines.length === 0 ? <p className="muted">Log a visit to see your patterns.</p> :
            topCuisines.map(([k, v]) => <Bar key={k} label={k} value={v} max={topCuisines[0][1]} />)
          }
        </div>
        <div className="stat-card">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Neighborhoods most visited</div>
          {topNeighborhoods.length === 0 ? <p className="muted">Log a visit to see your patterns.</p> :
            topNeighborhoods.map(([k, v]) => <Bar key={k} label={k} value={v} max={topNeighborhoods[0][1]} />)
          }
        </div>
      </div>

      {(best || worst) && best !== worst && (
        <div className="grid cols-2" style={{ gap: 14, marginBottom: 24 }}>
          {best && (
            <div className="stat-card">
              <div className="eyebrow">Highest rated</div>
              <div className="row" style={{ alignItems: 'baseline', gap: 12, marginTop: 8 }}>
                <span className="big" style={{ fontSize: 44 }}>{best.rating.toFixed(1)}</span>
                <div>
                  <div className="h3" style={{ fontSize: 22 }}>{getRestaurantById(best.restaurantId)?.name}</div>
                  {best.note && <div className="soft" style={{ fontStyle: 'italic', fontSize: 13 }}>"{best.note}"</div>}
                </div>
              </div>
            </div>
          )}
          {worst && (
            <div className="stat-card">
              <div className="eyebrow">Worst experience</div>
              <div className="row" style={{ alignItems: 'baseline', gap: 12, marginTop: 8 }}>
                <span className="big" style={{ fontSize: 44 }}>{worst.rating.toFixed(1)}</span>
                <div>
                  <div className="h3" style={{ fontSize: 22 }}>{getRestaurantById(worst.restaurantId)?.name}</div>
                  {worst.note && <div className="soft" style={{ fontStyle: 'italic', fontSize: 13 }}>"{worst.note}"</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {profileStats.length > 1 && (
        <div className="stat-card">
          <div className="eyebrow" style={{ marginBottom: 14 }}>The group · who's been busiest</div>
          {profileStats.map(s => (
            <div key={s.profile.id} className="row" style={{ padding: '10px 0', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
              <Avatar profile={s.profile} size={32} />
              <div style={{ flex: 1, marginLeft: 10 }}>
                <div style={{ fontWeight: 500 }}>{s.profile.name}</div>
                <div className="soft" style={{ fontSize: 12 }}>{s.restaurants} unique · avg {s.avg ? s.avg.toFixed(1) : '—'}</div>
              </div>
              <div className="serif" style={{ fontSize: 26 }}>{s.visits}</div>
              <div className="eyebrow" style={{ marginLeft: 6 }}>visits</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { BrowseScreen, LogScreen, StatsScreen });
