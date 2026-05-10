/* Restaurant detail sheet + Log Visit form */

function RestaurantDetail({ restaurantId, state, actions, onClose, onLog }) {
  const r = restaurantId ? getRestaurantById(restaurantId) : null;
  const stats = r ? getRestaurantStats(state, r.id) : null;
  const profileVisits = r ? state.visits.filter(v => v.restaurantId === r.id) : [];
  const onWishlist = r ? !!(state.wishlist[r.id] && state.wishlist[r.id][state.activeProfileId]) : false;
  if (!r) return null;
  return (
    <Sheet open={!!r} onClose={onClose} wide>
      <div className="sheet-head">
        <div>
          <div className="eyebrow">{r.cuisine} · {r.neighborhood}</div>
          <div className="h1" style={{ marginTop: 6, fontSize: 38 }}>{r.name}</div>
          <div className="row wrap" style={{ marginTop: 10, gap: 6 }}>
            <Pill tone="">{r.price}</Pill>
            <Pill>{r.vibe}</Pill>
            <Pill>Best for: <span style={{ marginLeft: 4 }}>{r.bestFor}</span></Pill>
          </div>
        </div>
        <button className="x-btn" onClick={onClose}>✕</button>
      </div>
      <div className="sheet-body">
        <p className="lede" style={{ margin: '0 0 22px' }}>{r.description}</p>

        <div className="grid cols-3" style={{ marginBottom: 22 }}>
          <div className="card tight" style={{ textAlign: 'center', padding: 16 }}>
            <div className="eyebrow">Guide rating</div>
            <div className="h2" style={{ marginTop: 4 }}>{r.rating ? r.rating.toFixed(1) : '—'}</div>
            <div className="soft" style={{ fontSize: 12 }}>From the original list</div>
          </div>
          <div className="card tight" style={{ textAlign: 'center', padding: 16 }}>
            <div className="eyebrow">Your visits</div>
            <div className="h2" style={{ marginTop: 4 }}>{stats.count || '0'}</div>
            <div className="soft" style={{ fontSize: 12 }}>{stats.count === 1 ? 'time' : 'times'}</div>
          </div>
          <div className="card tight" style={{ textAlign: 'center', padding: 16 }}>
            <div className="eyebrow">Group avg</div>
            <div className="h2" style={{ marginTop: 4 }}>{stats.avg ? stats.avg.toFixed(1) : '—'}</div>
            <div className="soft" style={{ fontSize: 12 }}>{stats.count > 0 ? `over ${stats.count} visit${stats.count===1?'':'s'}` : 'no visits yet'}</div>
          </div>
        </div>

        <div className="row" style={{ gap: 8, marginBottom: 22 }}>
          <button className="btn btn-accent" onClick={() => onLog(r.id)}>＋ Log a visit</button>
          <button className={`btn ${onWishlist ? '' : 'btn-ghost'}`} onClick={() => actions.toggleWishlist(r.id)}>
            {onWishlist ? '♥ On wishlist' : '♡ Add to wishlist'}
          </button>
          <a className="btn btn-ghost" href={`https://www.google.com/maps/search/${encodeURIComponent(r.name + ' Montreal')}`} target="_blank" rel="noreferrer">↗ Maps</a>
        </div>

        {profileVisits.length > 0 && (
          <Fragment>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Your visit log</div>
            <div>
              {profileVisits.map(v => {
                const profile = state.profiles.find(p => p.id === v.profileId);
                return (
                  <div key={v.id} className="entry">
                    <div className="e-date">{fmtDateShort(v.date)}<br/><span style={{ color: profile?.color, fontWeight: 600 }}>{profile?.name || '—'}</span></div>
                    <div>
                      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                        <StarsRO value={v.rating} size={16} />
                        {v.wouldReturn === true && <Pill tone="green">Would go back</Pill>}
                        {v.wouldReturn === false && <Pill tone="">Probably not</Pill>}
                      </div>
                      {v.bestDish && <div style={{ marginTop: 6, fontSize: 14 }}><span className="eyebrow" style={{ marginRight: 6 }}>Best dish</span>{v.bestDish}</div>}
                      {v.note && <div className="e-note">"{v.note}"</div>}
                      {v.withWho && <div className="soft" style={{ fontSize: 12, marginTop: 6 }}>with {v.withWho}</div>}
                    </div>
                    <div>
                      <button className="x-btn" onClick={() => { if (confirm('Delete this visit?')) actions.deleteVisit(v.id); }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Fragment>
        )}

        {r.notes && (
          <div className="card tight" style={{ marginTop: 18, fontSize: 13, fontStyle: 'italic', color: 'var(--ink-soft)' }}>
            From the guide: {r.notes}
          </div>
        )}
      </div>
    </Sheet>
  );
}

// ---- LogVisitSheet ----
function LogVisitSheet({ restaurantId, state, actions, onClose, onSaved }) {
  const r = restaurantId ? getRestaurantById(restaurantId) : null;
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [bestDish, setBestDish] = useState('');
  const [withWho, setWithWho] = useState('');
  const [wouldReturn, setWouldReturn] = useState(null);

  useEffect(() => {
    if (restaurantId) {
      setDate(new Date().toISOString().slice(0, 10));
      setRating(0); setNote(''); setBestDish(''); setWithWho(''); setWouldReturn(null);
    }
  }, [restaurantId]);

  if (!r) return null;
  const submit = () => {
    actions.logVisit({
      restaurantId: r.id,
      profileId: state.activeProfileId,
      date: new Date(date).getTime(),
      rating,
      note,
      bestDish,
      withWho,
      wouldReturn,
    });
    onSaved && onSaved();
  };

  return (
    <Sheet open={!!r} onClose={onClose}>
      <div className="sheet-head">
        <div>
          <div className="eyebrow">Logging a visit</div>
          <div className="h2" style={{ marginTop: 4 }}>{r.name}</div>
          <div className="soft" style={{ fontSize: 13, marginTop: 4 }}>as {getActiveProfile(state).name}</div>
        </div>
        <button className="x-btn" onClick={onClose}>✕</button>
      </div>
      <div className="sheet-body">
        <div className="grid cols-2" style={{ marginBottom: 16 }}>
          <div>
            <label className="label">When</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">With</label>
            <input className="input" placeholder="e.g. Maya & Tom" value={withWho} onChange={e => setWithWho(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="label">Rating</label>
          <Stars value={rating} onChange={setRating} size={28} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="label">Best dish</label>
          <input className="input" placeholder="e.g. The duck. Order two." value={bestDish} onChange={e => setBestDish(e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="label">Would you go back?</label>
          <div className="row" style={{ gap: 8 }}>
            <button className={`chip ${wouldReturn === true ? 'on' : ''}`} onClick={() => setWouldReturn(wouldReturn === true ? null : true)}>👍 Hell yes</button>
            <button className={`chip ${wouldReturn === false ? 'on' : ''}`} onClick={() => setWouldReturn(wouldReturn === false ? null : false)}>👎 Probably not</button>
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label className="label">Notes</label>
          <textarea className="textarea" placeholder="The bread was unreal, service got messy after 9pm…" value={note} onChange={e => setNote(e.target.value)}></textarea>
        </div>
        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={submit} disabled={!rating}>Save visit</button>
        </div>
      </div>
    </Sheet>
  );
}

Object.assign(window, { RestaurantDetail, LogVisitSheet });
