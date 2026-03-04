# 🎮 Party Games

A real-time multiplayer party game platform built with **Next.js** and **Supabase**. Host a lobby, share a code, and play together — no downloads needed.

## Current Games

### 🎨 ColorRank
An abstract image is displayed with multiple colors. Players must pick the top N colors by area coverage. Scoring is based on correctness first, then speed as a tiebreaker.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend/Realtime**: Supabase (Postgres + Realtime subscriptions)
- **Deployment**: Vercel (free tier)
- **Database**: Supabase free tier (up to 500MB, 2 projects)

---

## Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
4. Go to **Project Settings → API** and copy your:
   - Project URL
   - `anon` public key

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Enable Realtime

In the Supabase dashboard:
1. Go to **Database → Replication**
2. Enable replication for tables: `lobbies`, `players`, `rounds`, `submissions`

(The schema.sql already does this, but verify it's active.)

### 4. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Deploy to Vercel

```bash
# Push to GitHub, then:
# 1. Import repo on vercel.com
# 2. Add environment variables in Vercel dashboard
# 3. Deploy
```

Or use the Vercel CLI:
```bash
npx vercel --prod
```

---

## How It Works

### Game Flow

1. **Host creates a lobby** → gets a 6-character code
2. **Players join** by entering the code → pick a name and icon
3. **Host starts the game** → all players see a countdown
4. **Each round**: an image appears, players pick top N colors by area
5. **Round ends**: scores are shown (correctness > speed)
6. **Between rounds**: new players can join the lobby
7. **Game over**: final standings displayed

### Scoring (ColorRank)

- 1 point per correct color in the top N
- Players with equal scores are ranked by response time
- Example: If top 3 colors are Red, Blue, Green...
  - Picking all 3 correctly in 2s → 3 pts, ranked above someone with 3 pts in 5s
  - Picking 2 of 3 correctly → 2 pts, ranked below all 3-point players

### Architecture

```
Browser A (Host)  ──┐
Browser B (Player) ──┤──→ Supabase Realtime ──→ Postgres
Browser C (Player) ──┘
```

All game state lives in Supabase. Clients subscribe to realtime changes on the `lobbies`, `players`, `rounds`, and `submissions` tables. The host triggers state transitions (start game, next round, end round) by writing to the database directly.

---

## Project Structure

```
party-games/
├── app/
│   ├── layout.tsx          # Root layout with fonts
│   ├── page.tsx            # Home: create/join lobby
│   ├── globals.css         # Styles + animations
│   └── lobby/
│       ├── join/page.tsx   # Name + icon selection
│       └── [code]/page.tsx # Main lobby + game play
├── components/
│   ├── ColorRankImage.tsx  # Canvas-generated color image
│   ├── Scoreboard.tsx      # Round/game score display
│   └── GameSettings.tsx    # Host game config panel
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── database.types.ts   # TypeScript types
│   ├── game-types.ts       # Game logic + constants
│   └── actions.ts          # Database operations
└── supabase/
    └── schema.sql          # Database schema (run in SQL Editor)
```

---

## Adding New Games

The architecture is designed to be extensible. To add a new game:

1. Add your game type to `GameType` in `lib/game-types.ts`
2. Create round data types and scoring functions
3. Create game-specific components (like `ColorRankImage`)
4. Add a game selection UI to the lobby page
5. Handle the new game type in the lobby `[code]/page.tsx` playing phase

---

## Limits (Free Tier)

- **Supabase**: 500MB database, 2GB bandwidth, 50K monthly active users
- **Vercel**: 100GB bandwidth, serverless function limits
- **Max players per lobby**: 30 (configurable)
- **Lobbies auto-cleanup**: 24 hours (via the `cleanup_old_lobbies` function)

For a casual party game with friends, the free tier is more than enough.
