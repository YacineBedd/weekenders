# Weekender — MTL

An editorial restaurant guide for Montreal. Pick where to eat with friends using slots, roulette, or a drag-and-drop tier list. Log visits, rate spots, and keep score.

## Run it

Open `Weekender.html` directly in a browser, or serve the folder over any static host (Netlify Drop, Cloudflare Pages, GitHub Pages, etc.). Data persists in your browser's `localStorage`.

```sh
python3 -m http.server 8000
# then visit http://localhost:8000/Weekender.html
```

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

- `Weekender.html` — entry point
- `styles.css` — design tokens and layout
- `data.js` — restaurant catalog
- `app.jsx`, `store.jsx`, `ui.jsx`, `detail.jsx`, `games.jsx`, `screens.jsx`, `tweaks-panel.jsx` — React components, compiled in-browser via Babel-standalone

## Sharing data with friends

Each browser keeps its own data. To share, use **Tweaks → Sharing & data → Export to JSON** to dump everything, then have friends import it (merge or replace).
