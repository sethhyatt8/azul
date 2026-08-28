# Azul

Online multiplayer clone of the board game **Azul**. Create a room, share a 4-letter code, and play with 2–4 friends on your phones.

Live at [sethhyatt8.github.io/azul](https://sethhyatt8.github.io/azul/).

## Stack

- React + Vite + TypeScript
- Firebase Realtime Database (REST) for live rooms under `azul/{code}`
- GitHub Pages deploy on push to `main`

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Rooms use the same Firebase project as [Games](https://github.com/sethhyatt8/games) and [Artists](https://github.com/sethhyatt8/artists), under a separate `azul/` path.

## Scripts

- `npm run dev` — local dev server
- `npm run test` — game engine tests
- `npm run build` / `npm run lint`
- `npm run deploy` — manual GitHub Pages deploy

## How to play

1. **Create room** or **join** with a code.
2. Host starts when at least 2 players have joined.
3. On your turn, tap a color in a factory or the center pool.
4. Tiles fill your pattern lines, then move to your wall at round end.
5. Game ends when someone completes a horizontal row on their wall.
