/* Weekender shared state — localStorage hooks + helpers */
const { useState, useEffect, useCallback, useMemo, useRef } = React;

const LS_KEY = 'weekender:v1';

const DEFAULT_STATE = {
  profiles: [
    { id: 'me', name: 'You', color: 'oklch(0.58 0.17 35)' },
  ],
  activeProfileId: 'me',
  visits: [],         // { id, restaurantId, profileId, date, rating, thumbs, note, bestDish, withWho, wouldReturn }
  wishlist: {},       // { [restaurantId]: { profileId: addedAt } }
  tiers: {},          // { [profileId]: { [restaurantId]: tierKey } }
  tierSet: 'classic', // 'classic' | 'editorial'
};

const PROFILE_PALETTE = [
  'oklch(0.58 0.17 35)',
  'oklch(0.42 0.08 160)',
  'oklch(0.55 0.14 260)',
  'oklch(0.62 0.16 320)',
  'oklch(0.58 0.13 220)',
  'oklch(0.56 0.16 80)',
];

const TIER_SETS = {
  classic: [
    { key: 'S', label: 'S', sub: 'OBSESSED', color: 'oklch(0.58 0.17 35)' },
    { key: 'A', label: 'A', sub: 'GREAT',    color: 'oklch(0.62 0.14 50)' },
    { key: 'B', label: 'B', sub: 'GOOD',     color: 'oklch(0.65 0.12 95)' },
    { key: 'C', label: 'C', sub: 'OK',       color: 'oklch(0.55 0.06 150)' },
    { key: 'D', label: 'D', sub: 'MEH',      color: 'oklch(0.50 0.04 230)' },
    { key: 'F', label: 'F', sub: 'SKIP',     color: 'oklch(0.40 0.05 290)' },
  ],
  editorial: [
    { key: 'S', label: 'Take a date here',     sub: 'WORTH IT',   color: 'oklch(0.58 0.17 35)' },
    { key: 'A', label: 'Bring the parents',    sub: 'IMPRESSIVE', color: 'oklch(0.62 0.14 50)' },
    { key: 'B', label: 'Solid Tuesday',        sub: 'RELIABLE',   color: 'oklch(0.65 0.12 95)' },
    { key: 'C', label: 'If you must',          sub: 'PASSABLE',   color: 'oklch(0.55 0.06 150)' },
    { key: 'D', label: 'Skip',                 sub: 'NO',         color: 'oklch(0.40 0.05 290)' },
  ],
};

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch (e) {
    return DEFAULT_STATE;
  }
}
function saveState(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) {}
}

function useStore() {
  const [state, setState] = useState(loadState);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; saveState(state); }, [state]);
  // Wrap setState into action helpers
  const actions = useMemo(() => ({
    setActive: (id) => setState(s => ({ ...s, activeProfileId: id })),
    addProfile: (name) => setState(s => {
      const id = 'p-' + Math.random().toString(36).slice(2, 8);
      const color = PROFILE_PALETTE[s.profiles.length % PROFILE_PALETTE.length];
      return { ...s, profiles: [...s.profiles, { id, name, color }], activeProfileId: id };
    }),
    renameProfile: (id, name) => setState(s => ({
      ...s, profiles: s.profiles.map(p => p.id === id ? { ...p, name } : p)
    })),
    removeProfile: (id) => setState(s => {
      if (s.profiles.length === 1) return s;
      const profiles = s.profiles.filter(p => p.id !== id);
      const activeProfileId = s.activeProfileId === id ? profiles[0].id : s.activeProfileId;
      const tiers = { ...s.tiers }; delete tiers[id];
      const visits = s.visits.filter(v => v.profileId !== id);
      return { ...s, profiles, activeProfileId, tiers, visits };
    }),
    logVisit: (visit) => setState(s => ({
      ...s, visits: [{ id: 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2,5), ...visit }, ...s.visits]
    })),
    updateVisit: (id, patch) => setState(s => ({
      ...s, visits: s.visits.map(v => v.id === id ? { ...v, ...patch } : v)
    })),
    deleteVisit: (id) => setState(s => ({ ...s, visits: s.visits.filter(v => v.id !== id) })),
    toggleWishlist: (rid) => setState(s => {
      const pid = s.activeProfileId;
      const cur = s.wishlist[rid] || {};
      const next = { ...cur };
      if (next[pid]) delete next[pid]; else next[pid] = Date.now();
      const wishlist = { ...s.wishlist };
      if (Object.keys(next).length === 0) delete wishlist[rid];
      else wishlist[rid] = next;
      return { ...s, wishlist };
    }),
    setTier: (rid, tierKey) => setState(s => {
      const pid = s.activeProfileId;
      const t = { ...(s.tiers[pid] || {}) };
      if (tierKey == null) delete t[rid]; else t[rid] = tierKey;
      return { ...s, tiers: { ...s.tiers, [pid]: t } };
    }),
    clearTiers: () => setState(s => ({ ...s, tiers: { ...s.tiers, [s.activeProfileId]: {} } })),
    setTierSet: (key) => setState(s => ({ ...s, tierSet: key })),
    resetAll: () => { localStorage.removeItem(LS_KEY); setState(DEFAULT_STATE); },
    exportState: () => {
      // Returns the current state as a JSON string with a small wrapper for safety.
      try {
        return JSON.stringify({
          __weekender: 1,
          exportedAt: new Date().toISOString(),
          state: stateRef.current,
        }, null, 2);
      } catch (e) { return null; }
    },
    importState: (json, mode = 'merge') => {
      // mode: 'merge' (combine profiles/visits/ratings) or 'replace'
      try {
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;
        const incoming = parsed && parsed.__weekender ? parsed.state : parsed;
        if (!incoming || typeof incoming !== 'object') return { ok: false, error: 'Not a Weekender file' };
        if (mode === 'replace') {
          setState({ ...DEFAULT_STATE, ...incoming });
          return { ok: true, profilesAdded: (incoming.profiles || []).length };
        }
        // merge
        setState(s => {
          const profMap = new Map(s.profiles.map(p => [p.id, p]));
          (incoming.profiles || []).forEach(p => { if (p && p.id && !profMap.has(p.id)) profMap.set(p.id, p); });
          const visitKey = v => `${v.profileId}|${v.restaurantId}|${v.date || ''}`;
          const visitMap = new Map(s.visits.map(v => [visitKey(v), v]));
          (incoming.visits || []).forEach(v => { const k = visitKey(v); if (!visitMap.has(k)) visitMap.set(k, v); });
          const ratings = { ...s.ratings };
          Object.entries(incoming.ratings || {}).forEach(([pid, rs]) => {
            ratings[pid] = { ...(rs || {}), ...(ratings[pid] || {}) };
          });
          const tiers = { ...s.tiers };
          Object.entries(incoming.tiers || {}).forEach(([pid, ts]) => {
            tiers[pid] = { ...(ts || {}), ...(tiers[pid] || {}) };
          });
          const wishlist = { ...s.wishlist };
          Object.entries(incoming.wishlist || {}).forEach(([pid, ws]) => {
            wishlist[pid] = Array.from(new Set([...(wishlist[pid] || []), ...((ws || []))]));
          });
          return { ...s, profiles: Array.from(profMap.values()), visits: Array.from(visitMap.values()), ratings, tiers, wishlist };
        });
        return { ok: true, profilesAdded: (incoming.profiles || []).length };
      } catch (e) {
        return { ok: false, error: String(e.message || e) };
      }
    },
  }), []);
  return [state, actions];
}

// ---- Selectors ----
function getActiveProfile(state) {
  return state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0];
}
function getVisitsForProfile(state, pid) {
  return state.visits.filter(v => v.profileId === pid);
}
function getRestaurantById(id) {
  return window.RESTAURANTS.find(r => r.id === id);
}
function getRestaurantStats(state, restaurantId) {
  const visits = state.visits.filter(v => v.restaurantId === restaurantId);
  const onWishlist = !!state.wishlist[restaurantId];
  const ratings = visits.map(v => v.rating).filter(Boolean);
  const avg = ratings.length ? ratings.reduce((a,b)=>a+b,0) / ratings.length : null;
  return { visits, count: visits.length, avg, onWishlist };
}

// ---- Helpers ----
function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateShort(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function initials(name) {
  return (name || '?').split(/\s+/).slice(0,2).map(s => s[0] || '').join('').toUpperCase() || '?';
}

Object.assign(window, {
  useStore, loadState, saveState,
  getActiveProfile, getVisitsForProfile, getRestaurantById, getRestaurantStats,
  TIER_SETS, PROFILE_PALETTE,
  fmtDate, fmtDateShort, initials,
});
