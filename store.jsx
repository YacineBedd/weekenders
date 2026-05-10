/* Weekender shared state — localStorage hooks + Supabase sync */
const { useState, useEffect, useCallback, useMemo, useRef } = React;

const LS_KEY = 'weekender:v1';
const LS_ACTIVE_KEY = 'weekender:activeProfile';

const DEFAULT_STATE = {
  profiles: [],
  activeProfileId: null,
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

const sync = window.WeekenderSync || { enabled: false };
function syncCall(fn, ...args) {
  if (!sync.enabled || typeof sync[fn] !== 'function') return Promise.resolve();
  try { return Promise.resolve(sync[fn](...args)).catch((e) => { console.warn('[sync]', fn, e); }); }
  catch (e) { console.warn('[sync]', fn, e); return Promise.resolve(); }
}

function newProfileId() {
  return 'p-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}
function newVisitId() {
  return 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
}

function seededDefaultState() {
  const id = newProfileId();
  return {
    ...DEFAULT_STATE,
    profiles: [{ id, name: 'You', color: PROFILE_PALETTE[0] }],
    activeProfileId: id,
  };
}
function loadCachedState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return seededDefaultState();
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_STATE, ...parsed };
    if (!merged.profiles || merged.profiles.length === 0) return seededDefaultState();
    return merged;
  } catch (e) {
    return seededDefaultState();
  }
}
function cacheState(s) {
  try {
    const { activeProfileId, ...rest } = s;
    localStorage.setItem(LS_KEY, JSON.stringify(rest));
    if (activeProfileId) localStorage.setItem(LS_ACTIVE_KEY, activeProfileId);
  } catch (e) {}
}
function loadActiveProfileId() {
  try { return localStorage.getItem(LS_ACTIVE_KEY); } catch (e) { return null; }
}

// Pick a sensible activeProfileId given a list of profiles.
function pickActive(profiles, preferred) {
  if (preferred && profiles.some((p) => p.id === preferred)) return preferred;
  return profiles[0] ? profiles[0].id : null;
}

// ---- realtime merge helpers (all idempotent) ----
function mergeProfileInsertOrUpdate(s, row) {
  const next = { id: row.id, name: row.name, color: row.color };
  const idx = s.profiles.findIndex((p) => p.id === row.id);
  const profiles = idx === -1 ? [...s.profiles, next] : s.profiles.map((p) => p.id === row.id ? next : p);
  return { ...s, profiles };
}
function mergeProfileDelete(s, row) {
  const id = row.id;
  const profiles = s.profiles.filter((p) => p.id !== id);
  const tiers = { ...s.tiers }; delete tiers[id];
  const visits = s.visits.filter((v) => v.profileId !== id);
  const wishlist = {};
  for (const rid of Object.keys(s.wishlist)) {
    const inner = { ...s.wishlist[rid] }; delete inner[id];
    if (Object.keys(inner).length) wishlist[rid] = inner;
  }
  const activeProfileId = pickActive(profiles, s.activeProfileId === id ? null : s.activeProfileId);
  return { ...s, profiles, tiers, visits, wishlist, activeProfileId };
}
function mergeVisitInsertOrUpdate(s, row) {
  const v = sync.visitFromRow ? sync.visitFromRow(row) : row;
  const idx = s.visits.findIndex((x) => x.id === v.id);
  let visits;
  if (idx === -1) visits = [v, ...s.visits].sort((a, b) => b.date - a.date);
  else visits = s.visits.map((x) => x.id === v.id ? v : x);
  return { ...s, visits };
}
function mergeVisitDelete(s, row) {
  return { ...s, visits: s.visits.filter((v) => v.id !== row.id) };
}
function mergeWishlistInsertOrUpdate(s, row) {
  const wishlist = { ...s.wishlist };
  const inner = { ...(wishlist[row.restaurant_id] || {}) };
  inner[row.profile_id] = Number(row.added_at);
  wishlist[row.restaurant_id] = inner;
  return { ...s, wishlist };
}
function mergeWishlistDelete(s, row) {
  const wishlist = { ...s.wishlist };
  const inner = { ...(wishlist[row.restaurant_id] || {}) };
  delete inner[row.profile_id];
  if (Object.keys(inner).length === 0) delete wishlist[row.restaurant_id];
  else wishlist[row.restaurant_id] = inner;
  return { ...s, wishlist };
}
function mergeTierInsertOrUpdate(s, row) {
  const tiers = { ...s.tiers };
  tiers[row.profile_id] = { ...(tiers[row.profile_id] || {}), [row.restaurant_id]: row.tier_key };
  return { ...s, tiers };
}
function mergeTierDelete(s, row) {
  const tiers = { ...s.tiers };
  const inner = { ...(tiers[row.profile_id] || {}) };
  delete inner[row.restaurant_id];
  tiers[row.profile_id] = inner;
  return { ...s, tiers };
}
function mergeMeta(s, row) {
  if (row && row.key === 'tierSet') return { ...s, tierSet: row.value || 'classic' };
  return s;
}

function applyRemoteEvent(s, evt) {
  const { table, eventType, new: nrow, old: orow } = evt;
  if (table === 'profiles') {
    if (eventType === 'INSERT' || eventType === 'UPDATE') return mergeProfileInsertOrUpdate(s, nrow);
    if (eventType === 'DELETE') return mergeProfileDelete(s, orow);
  }
  if (table === 'visits') {
    if (eventType === 'INSERT' || eventType === 'UPDATE') return mergeVisitInsertOrUpdate(s, nrow);
    if (eventType === 'DELETE') return mergeVisitDelete(s, orow);
  }
  if (table === 'wishlist') {
    if (eventType === 'INSERT' || eventType === 'UPDATE') return mergeWishlistInsertOrUpdate(s, nrow);
    if (eventType === 'DELETE') return mergeWishlistDelete(s, orow);
  }
  if (table === 'tiers') {
    if (eventType === 'INSERT' || eventType === 'UPDATE') return mergeTierInsertOrUpdate(s, nrow);
    if (eventType === 'DELETE') return mergeTierDelete(s, orow);
  }
  if (table === 'meta') {
    if (eventType === 'INSERT' || eventType === 'UPDATE') return mergeMeta(s, nrow);
  }
  return s;
}

function useStore() {
  // Fast first paint from localStorage cache; replaced by Supabase load on mount.
  const initial = useMemo(() => {
    const cached = loadCachedState();
    const preferred = loadActiveProfileId() || cached.activeProfileId;
    cached.activeProfileId = pickActive(cached.profiles, preferred);
    return cached;
  }, []);

  const [state, setState] = useState(initial);
  const stateRef = useRef(state);

  useEffect(() => { stateRef.current = state; cacheState(state); }, [state]);

  // Bootstrap from Supabase + subscribe to realtime
  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;

    (async () => {
      if (!sync.enabled) return; // Local-only mode: cached state already has a profile.

      try {
        const snapshot = await sync.loadAll();
        if (cancelled) return;
        if ((snapshot.profiles || []).length === 0) {
          const local = stateRef.current;
          const hasLocalData = local.profiles.length > 0 && (
            local.visits.length > 0 ||
            local.profiles.length > 1 ||
            Object.keys(local.tiers).length > 0 ||
            Object.keys(local.wishlist).length > 0
          );
          if (hasLocalData) {
            // Migrate prior local-only data into the now-shared workspace.
            await sync.bulkInsert({
              profiles: local.profiles, visits: local.visits,
              wishlist: local.wishlist, tiers: local.tiers, tierSet: local.tierSet,
            });
            snapshot.profiles = local.profiles;
            snapshot.visits = local.visits;
            snapshot.wishlist = local.wishlist;
            snapshot.tiers = local.tiers;
            snapshot.tierSet = local.tierSet;
          } else {
            const id = newProfileId();
            const seeded = { id, name: 'You', color: PROFILE_PALETTE[0] };
            await syncCall('upsertProfile', seeded);
            snapshot.profiles = [seeded];
          }
        }
        const preferred = loadActiveProfileId();
        const activeProfileId = pickActive(snapshot.profiles, preferred);
        setState((s) => ({ ...DEFAULT_STATE, ...snapshot, activeProfileId }));
      } catch (e) {
        console.warn('[sync] initial load failed; staying on cached state', e);
      }

      unsub = sync.subscribe((evt) => {
        setState((s) => applyRemoteEvent(s, evt));
      });
    })();

    return () => { cancelled = true; try { unsub(); } catch (e) {} };
  }, []);

  const actions = useMemo(() => ({
    setActive: (id) => setState((s) => ({ ...s, activeProfileId: id })),

    addProfile: (name) => {
      const id = newProfileId();
      const color = PROFILE_PALETTE[stateRef.current.profiles.length % PROFILE_PALETTE.length];
      const profile = { id, name, color };
      setState((s) => ({ ...s, profiles: [...s.profiles, profile], activeProfileId: id }));
      syncCall('upsertProfile', profile);
    },

    renameProfile: (id, name) => {
      setState((s) => ({ ...s, profiles: s.profiles.map((p) => p.id === id ? { ...p, name } : p) }));
      const p = stateRef.current.profiles.find((x) => x.id === id);
      syncCall('upsertProfile', { id, name, color: p && p.color });
    },

    removeProfile: (id) => {
      if (stateRef.current.profiles.length === 1) return;
      setState((s) => mergeProfileDelete(s, { id }));
      syncCall('deleteProfile', id);
    },

    logVisit: (visit) => {
      const full = { id: newVisitId(), ...visit };
      setState((s) => ({ ...s, visits: [full, ...s.visits] }));
      syncCall('upsertVisit', full);
    },

    updateVisit: (id, patch) => {
      setState((s) => ({ ...s, visits: s.visits.map((v) => v.id === id ? { ...v, ...patch } : v) }));
      const v = stateRef.current.visits.find((x) => x.id === id);
      if (v) syncCall('upsertVisit', { ...v, ...patch });
    },

    deleteVisit: (id) => {
      setState((s) => ({ ...s, visits: s.visits.filter((v) => v.id !== id) }));
      syncCall('deleteVisit', id);
    },

    toggleWishlist: (rid) => {
      const pid = stateRef.current.activeProfileId;
      if (!pid) return;
      const cur = stateRef.current.wishlist[rid] || {};
      const turningOn = !cur[pid];
      setState((s) => {
        const wishlist = { ...s.wishlist };
        const inner = { ...(wishlist[rid] || {}) };
        if (turningOn) inner[pid] = Date.now(); else delete inner[pid];
        if (Object.keys(inner).length === 0) delete wishlist[rid]; else wishlist[rid] = inner;
        return { ...s, wishlist };
      });
      syncCall('setWishlist', rid, pid, turningOn);
    },

    setTier: (rid, tierKey) => {
      const pid = stateRef.current.activeProfileId;
      if (!pid) return;
      setState((s) => {
        const t = { ...(s.tiers[pid] || {}) };
        if (tierKey == null) delete t[rid]; else t[rid] = tierKey;
        return { ...s, tiers: { ...s.tiers, [pid]: t } };
      });
      syncCall('setTier', rid, pid, tierKey);
    },

    clearTiers: () => {
      const pid = stateRef.current.activeProfileId;
      if (!pid) return;
      setState((s) => ({ ...s, tiers: { ...s.tiers, [pid]: {} } }));
      syncCall('clearTiers', pid);
    },

    setTierSet: (key) => {
      setState((s) => ({ ...s, tierSet: key }));
      syncCall('setTierSet', key);
    },

    resetAll: async () => {
      try { localStorage.removeItem(LS_KEY); } catch (e) {}
      try { localStorage.removeItem(LS_ACTIVE_KEY); } catch (e) {}
      if (sync.enabled) {
        try { await sync.resetAll(); } catch (e) { console.warn('[sync] resetAll failed', e); }
      }
      const id = newProfileId();
      const seeded = { id, name: 'You', color: PROFILE_PALETTE[0] };
      if (sync.enabled) syncCall('upsertProfile', seeded);
      setState({ ...DEFAULT_STATE, profiles: [seeded], activeProfileId: id });
    },

    exportState: () => {
      try {
        return JSON.stringify({
          __weekender: 1,
          exportedAt: new Date().toISOString(),
          state: stateRef.current,
        }, null, 2);
      } catch (e) { return null; }
    },

    importState: async (json, mode = 'merge') => {
      try {
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;
        const incoming = parsed && parsed.__weekender ? parsed.state : parsed;
        if (!incoming || typeof incoming !== 'object') return { ok: false, error: 'Not a Weekender file' };

        if (mode === 'replace') {
          const next = { ...DEFAULT_STATE, ...incoming };
          next.activeProfileId = pickActive(next.profiles || [], stateRef.current.activeProfileId);
          if (sync.enabled) {
            await sync.resetAll();
            await sync.bulkInsert({
              profiles: next.profiles, visits: next.visits,
              wishlist: next.wishlist, tiers: next.tiers, tierSet: next.tierSet,
            });
          }
          setState(next);
          return { ok: true, profilesAdded: (incoming.profiles || []).length };
        }

        // merge: upsert everything from incoming, keeping local rows that aren't in the file.
        const profMap = new Map(stateRef.current.profiles.map((p) => [p.id, p]));
        (incoming.profiles || []).forEach((p) => { if (p && p.id) profMap.set(p.id, { ...profMap.get(p.id), ...p }); });
        const visitKey = (v) => `${v.profileId}|${v.restaurantId}|${v.date || ''}`;
        const visitMap = new Map(stateRef.current.visits.map((v) => [visitKey(v), v]));
        (incoming.visits || []).forEach((v) => { const k = visitKey(v); if (!visitMap.has(k)) visitMap.set(k, v); });
        const tiers = { ...stateRef.current.tiers };
        Object.entries(incoming.tiers || {}).forEach(([pid, ts]) => {
          tiers[pid] = { ...(tiers[pid] || {}), ...(ts || {}) };
        });
        const wishlist = { ...stateRef.current.wishlist };
        Object.entries(incoming.wishlist || {}).forEach(([rid, inner]) => {
          wishlist[rid] = { ...(wishlist[rid] || {}), ...(inner || {}) };
        });

        const merged = {
          ...stateRef.current,
          profiles: Array.from(profMap.values()),
          visits: Array.from(visitMap.values()).sort((a, b) => (b.date || 0) - (a.date || 0)),
          tiers, wishlist,
          tierSet: incoming.tierSet || stateRef.current.tierSet,
        };

        if (sync.enabled) {
          await sync.bulkInsert({
            profiles: merged.profiles, visits: merged.visits,
            wishlist: merged.wishlist, tiers: merged.tiers, tierSet: merged.tierSet,
          });
        }
        setState(merged);
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
  return state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];
}
function getVisitsForProfile(state, pid) {
  return state.visits.filter((v) => v.profileId === pid);
}
function getRestaurantById(id) {
  return window.RESTAURANTS.find((r) => r.id === id);
}
function getRestaurantStats(state, restaurantId) {
  const visits = state.visits.filter((v) => v.restaurantId === restaurantId);
  const onWishlist = !!state.wishlist[restaurantId];
  const ratings = visits.map((v) => v.rating).filter(Boolean);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
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
  return (name || '?').split(/\s+/).slice(0, 2).map((s) => s[0] || '').join('').toUpperCase() || '?';
}

Object.assign(window, {
  useStore, loadState: loadCachedState, saveState: cacheState,
  getActiveProfile, getVisitsForProfile, getRestaurantById, getRestaurantStats,
  TIER_SETS, PROFILE_PALETTE,
  fmtDate, fmtDateShort, initials,
});
