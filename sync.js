// Weekender — Supabase sync layer
//
// Wraps the Supabase JS client and exposes a small API to store.jsx.
// When SUPABASE_URL / SUPABASE_ANON_KEY aren't set, init() returns
// { enabled: false } and the app falls back to localStorage-only mode.

(function () {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  const enabled = !!(url && key && window.supabase && window.supabase.createClient);

  let client = null;
  if (enabled) {
    client = window.supabase.createClient(url, key, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }

  // ---- row <-> state mappers ----
  // DB columns are snake_case; in-memory state matches the legacy
  // localStorage shape (camelCase, plus visit-specific fields).
  function visitFromRow(r) {
    return {
      id: r.id,
      restaurantId: r.restaurant_id,
      profileId: r.profile_id,
      date: Number(r.date),
      rating: r.rating == null ? null : Number(r.rating),
      thumbs: r.thumbs || null,
      note: r.note || '',
      bestDish: r.best_dish || '',
      withWho: r.with_who || '',
      wouldReturn: r.would_return,
    };
  }
  function visitToRow(v) {
    return {
      id: v.id,
      restaurant_id: v.restaurantId,
      profile_id: v.profileId,
      date: v.date,
      rating: v.rating ?? null,
      thumbs: v.thumbs ?? null,
      note: v.note ?? '',
      best_dish: v.bestDish ?? '',
      with_who: v.withWho ?? '',
      would_return: v.wouldReturn ?? null,
    };
  }
  function profileFromRow(r) {
    return { id: r.id, name: r.name, color: r.color };
  }

  // ---- loaders ----
  async function loadAll() {
    if (!enabled) throw new Error('sync disabled');
    const [pRes, vRes, wRes, tRes, mRes] = await Promise.all([
      client.from('profiles').select('*'),
      client.from('visits').select('*'),
      client.from('wishlist').select('*'),
      client.from('tiers').select('*'),
      client.from('meta').select('*'),
    ]);
    for (const r of [pRes, vRes, wRes, tRes, mRes]) if (r.error) throw r.error;

    const profiles = pRes.data.map(profileFromRow);
    const visits = vRes.data.map(visitFromRow).sort((a, b) => b.date - a.date);

    const wishlist = {};
    for (const row of wRes.data) {
      if (!wishlist[row.restaurant_id]) wishlist[row.restaurant_id] = {};
      wishlist[row.restaurant_id][row.profile_id] = Number(row.added_at);
    }

    const tiers = {};
    for (const row of tRes.data) {
      if (!tiers[row.profile_id]) tiers[row.profile_id] = {};
      tiers[row.profile_id][row.restaurant_id] = row.tier_key;
    }

    const tierSetRow = mRes.data.find((r) => r.key === 'tierSet');
    const tierSet = tierSetRow ? tierSetRow.value : 'classic';

    return { profiles, visits, wishlist, tiers, tierSet };
  }

  // ---- writers ----
  async function upsertProfile(p) {
    if (!enabled) return;
    const { error } = await client.from('profiles').upsert({
      id: p.id, name: p.name, color: p.color || null,
    });
    if (error) throw error;
  }
  async function deleteProfile(id) {
    if (!enabled) return;
    const { error } = await client.from('profiles').delete().eq('id', id);
    if (error) throw error;
  }
  async function upsertVisit(v) {
    if (!enabled) return;
    const { error } = await client.from('visits').upsert(visitToRow(v));
    if (error) throw error;
  }
  async function deleteVisit(id) {
    if (!enabled) return;
    const { error } = await client.from('visits').delete().eq('id', id);
    if (error) throw error;
  }
  async function setWishlist(restaurantId, profileId, on) {
    if (!enabled) return;
    if (on) {
      const { error } = await client.from('wishlist').upsert({
        restaurant_id: restaurantId, profile_id: profileId, added_at: Date.now(),
      });
      if (error) throw error;
    } else {
      const { error } = await client.from('wishlist').delete()
        .eq('restaurant_id', restaurantId).eq('profile_id', profileId);
      if (error) throw error;
    }
  }
  async function setTier(restaurantId, profileId, tierKey) {
    if (!enabled) return;
    if (tierKey == null) {
      const { error } = await client.from('tiers').delete()
        .eq('restaurant_id', restaurantId).eq('profile_id', profileId);
      if (error) throw error;
    } else {
      const { error } = await client.from('tiers').upsert({
        profile_id: profileId, restaurant_id: restaurantId, tier_key: tierKey,
      });
      if (error) throw error;
    }
  }
  async function clearTiers(profileId) {
    if (!enabled) return;
    const { error } = await client.from('tiers').delete().eq('profile_id', profileId);
    if (error) throw error;
  }
  async function setTierSet(value) {
    if (!enabled) return;
    const { error } = await client.from('meta').upsert({ key: 'tierSet', value });
    if (error) throw error;
  }
  async function resetAll() {
    if (!enabled) return;
    // Delete order matters because of FKs (visits/wishlist/tiers all
    // cascade from profiles, but be explicit anyway).
    for (const table of ['visits', 'wishlist', 'tiers', 'profiles', 'meta']) {
      const { error } = await client.from(table).delete().neq(
        table === 'meta' ? 'key' : (table === 'tiers' || table === 'wishlist' ? 'restaurant_id' : 'id'),
        '__never_matches__'
      );
      if (error) throw error;
    }
  }
  async function bulkInsert(snapshot) {
    // Used by import (replace mode). Caller is expected to call resetAll first.
    if (!enabled) return;
    if (snapshot.profiles?.length) {
      const { error } = await client.from('profiles').upsert(
        snapshot.profiles.map((p) => ({ id: p.id, name: p.name, color: p.color || null }))
      );
      if (error) throw error;
    }
    if (snapshot.visits?.length) {
      const { error } = await client.from('visits').upsert(snapshot.visits.map(visitToRow));
      if (error) throw error;
    }
    const wRows = [];
    for (const rid of Object.keys(snapshot.wishlist || {})) {
      for (const pid of Object.keys(snapshot.wishlist[rid] || {})) {
        wRows.push({ restaurant_id: rid, profile_id: pid, added_at: snapshot.wishlist[rid][pid] || Date.now() });
      }
    }
    if (wRows.length) {
      const { error } = await client.from('wishlist').upsert(wRows);
      if (error) throw error;
    }
    const tRows = [];
    for (const pid of Object.keys(snapshot.tiers || {})) {
      for (const rid of Object.keys(snapshot.tiers[pid] || {})) {
        tRows.push({ profile_id: pid, restaurant_id: rid, tier_key: snapshot.tiers[pid][rid] });
      }
    }
    if (tRows.length) {
      const { error } = await client.from('tiers').upsert(tRows);
      if (error) throw error;
    }
    if (snapshot.tierSet) {
      const { error } = await client.from('meta').upsert({ key: 'tierSet', value: snapshot.tierSet });
      if (error) throw error;
    }
  }

  // ---- realtime ----
  // Calls onEvent({ table, eventType, new, old }) for every change.
  function subscribe(onEvent) {
    if (!enabled) return () => {};
    const channel = client.channel('weekender-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' },
        (p) => onEvent({ table: 'profiles', eventType: p.eventType, new: p.new, old: p.old }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' },
        (p) => onEvent({ table: 'visits', eventType: p.eventType, new: p.new, old: p.old }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist' },
        (p) => onEvent({ table: 'wishlist', eventType: p.eventType, new: p.new, old: p.old }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tiers' },
        (p) => onEvent({ table: 'tiers', eventType: p.eventType, new: p.new, old: p.old }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meta' },
        (p) => onEvent({ table: 'meta', eventType: p.eventType, new: p.new, old: p.old }))
      .subscribe();
    return () => { try { client.removeChannel(channel); } catch (e) {} };
  }

  window.WeekenderSync = {
    enabled,
    loadAll,
    upsertProfile, deleteProfile,
    upsertVisit, deleteVisit,
    setWishlist,
    setTier, clearTiers,
    setTierSet,
    resetAll, bulkInsert,
    subscribe,
    visitFromRow, profileFromRow,
  };
})();
