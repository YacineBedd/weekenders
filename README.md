# Weekender — MTL

An editorial restaurant guide for Montreal. Pick where to eat with friends using slots, roulette, or a drag-and-drop tier list. Log visits, rate spots, and keep score — and now, share the same data with everyone in your group.

## Take it live (one-time setup)

The app is a static site that talks to a free Supabase project for shared data. It runs fine without Supabase too (each browser keeps its own data in `localStorage`); the steps below give you the shared-with-friends version.

### 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) (free, no credit card).
2. Create a new project. Pick any region close to you and any password (you won't need it again).
3. Once the project is provisioned, open the **SQL Editor** and paste the contents of [`supabase/schema.sql`](./supabase/schema.sql). Hit **Run**.
4. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key.

### 2. Plug the keys into the app

Open [`supabase-config.js`](./supabase-config.js) and paste your URL + anon key:

```js
window.SUPABASE_URL = "https://xxxx.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

The anon key is designed to be public (it's served to every browser that loads the page); row-level security in `schema.sql` is what guards the data.

### 3. Host on GitHub Pages

1. In this repo on GitHub: **Settings → Pages**.
2. **Source**: Deploy from a branch. **Branch**: `main` / `(root)`. Save.
3. After a minute, the site is live at:

   ```
   https://<your-username>.github.io/<repo-name>/
   ```

Share that URL with your friends. Open it on any phone or laptop and you'll all see the same data update live.

## Trust model

Anyone with the URL can read **and** write the shared data. That's intentional — it lets your friends jump in without logins. Treat the link like a shared Google Doc: don't post it publicly. If a friend group falls out of favor or you want a fresh start, regenerate the anon key in Supabase and update `supabase-config.js`.

## Run it locally

```sh
python3 -m http.server 8000
# then visit http://localhost:8000/
```

If `supabase-config.js` is empty, the app runs offline-only and stores data in this browser's `localStorage`.

## What's in it

- **Home** — your standing, today's editor's pick, latest receipts
- **Browse** — all 101 restaurants, filterable by cuisine, area, price, vibe
- **Slots** — three-reel slot machine that lands on a real restaurant
- **Roulette** — spinning wheel, optionally weighted by rating
- **Tier list** — drag-and-drop S–F (or editorial labels), per profile
- **Log** — date, stars, best dish, who you went with, would-go-back, notes
- **Stats** — coverage, top cuisines/neighborhoods, group leaderboard
- **Tweaks** — theme, accent, slot reel categories, JSON export/import

## Files

- `Weekender.html` — entry point (loaded as `index.html` redirects)
- `styles.css` — design tokens and layout
- `data.js` — restaurant catalog
- `sync.js` + `supabase-config.js` — shared-data layer
- `app.jsx`, `store.jsx`, `ui.jsx`, `detail.jsx`, `games.jsx`, `screens.jsx`, `tweaks-panel.jsx` — React components, compiled in-browser via Babel-standalone
- `supabase/schema.sql` — Postgres schema + RLS policies + realtime publication

## Backup / restore

**Tweaks → Sharing & data** still has Export to JSON and Import from file. Useful for snapshots, or for moving a workspace to a new Supabase project.
