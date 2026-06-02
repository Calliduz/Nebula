# Nebula UX & React Client Audit Report
*Compiled on: 2026-06-02*

Based on an audit of the current database schemas and data models in the `nebula-server` codebase (specifically in [models/Cache.ts](file:///mnt/c/Users/chuchi/Desktop/Repositories/nebula/nebula-server/models/Cache.ts)), this report highlights frontend improvements, state tracking, and performance-centric optimizations to build a premium, faster, and more responsive experience in our React client.

---

## 1. Mapped Gaps: Database Cache vs. React Client
The server stores third-party scraping data and caches it. The client currently underutilizes these structures:

*   **The DeadPool Schema Gap**: The server maintains a list of verified unreachable streams in a `DeadPool` collection, exposed via `/api/stream/availability` with the parameter `isDead`. The client's api helper in [tmdb.ts](file:///mnt/c/Users/chuchi/Desktop/Repositories/nebula/nebula/src/services/tmdb.ts) parses verification status but discards the `isDead` response, meaning the "No Signal" indicator on the frontend in [MovieCard.tsx](file:///mnt/c/Users/chuchi/Desktop/Repositories/nebula/nebula/src/components/MovieCard.tsx#L113-L120) is never populated.
*   **Missing On-Scroll Checks**: The client exposes a fast batch checking helper `fetchAvailability`, but it is never triggered in the horizontal scrolling row logic.
*   **Visual Metadata Truncation**: Fanart metadata (logos, backgrounds) fetched via `/api/metadata?batch=...` is loaded only for the first 10 items of a row on load. If the user scrolls past card 10, they fall back to basic text titles rather than clear logos.

---

## 2. Strategic UX Recommendations

### Category 1: Smart UI States (Skeletons & Fallbacks)
1.  **Progressive Loading State for Streams**: Uncached streams require backend scraping that can take 10+ seconds. In [MediaPlayer.tsx](file:///mnt/c/Users/chuchi/Desktop/Repositories/nebula/nebula/src/components/MediaPlayer.tsx#L1287-L1298), show text feedback matching the server's scraping phases (e.g. `Checking Dramacool...` for drama pages, `Connecting to VidLink...` for normal media).
2.  **Manual Mirror Picker on Timeout**: In case of buffering or slow startup, expose the raw mirrors list (e.g., `Mirror 1 (HLS)`, `Mirror 2 (Embed)`) on the loader layout to let users manually switch mirrors.
3.  **Local Row-Level Failure Isolation**: Wrap [MovieRow.tsx](file:///mnt/c/Users/chuchi/Desktop/Repositories/nebula/nebula/src/components/MovieRow.tsx) sections in a React `ErrorBoundary`. If a particular row's proxy or TMDB query fails, it should display an error fallback inline with a refresh retry option, without interrupting the other feed shelves.

### Category 2: UX Enhancements Leveraging Data Layout
1.  **Live Availability Check on Feed Scroll**: Use `IntersectionObserver` on shelves. When a `MovieRow` scrolls, compile a list of the newly visible TMDB IDs and call `/api/stream/availability`. 
2.  **Instant Play Indicators**: Show a pulsing green "Verified / Live" badge on items that are cached in `StreamCache`. Clicking these triggers an immediate transition into the video player, bypassing the scraper page.
3.  **Visual Indicators for Dead Pool Media**: If a movie is in the `DeadPool` cache, lower its opacity, display a "No Signal / Offline" badge, and show a disclaimer tooltip to prevent users from starting dead scraping attempts.
4.  **Infinite Scroll Metadata Prefetching**: When a user scrolls to the 8th card of a row, fetch transparent logo URLs `/api/metadata?batch=...` for the next 10 items, preventing text fallbacks.

### Category 3: Performance-Centric Frontend Optimizations
1.  **Deferred Row Fetching (Lazy-Loading Rows)**: Instead of resolving 30+ category rows in a single blocking `Promise.all` at startup (in [useAppState.ts](file:///mnt/c/Users/chuchi/Desktop/Repositories/nebula/nebula/src/hooks/useAppState.ts#L705-L739)), load only above-the-fold content first. Lazy-load the remaining rows when scrolled into view, showing [MovieSkeleton.tsx](file:///mnt/c/Users/chuchi/Desktop/Repositories/nebula/nebula/src/components/MovieSkeleton.tsx) slots.
2.  **React 19 `useOptimistic` for List Mutations**: Bind additions and deletions in the watchlists or secure records using `useOptimistic`. The UI state (e.g. bookmark icon state) will toggle immediately before database write confirmations complete.
3.  **High-Performance Feed Cache (IndexedDB)**: The 3-hour cache for the global home feed in `useAppState.ts` parses a massive raw JSON array from LocalStorage, blocking main thread rendering. Replacing it with an asynchronous IndexedDB cache (e.g., via `localforage` or `idb`) ensures smooth 60fps scrolling and fast page mounts.

---

## 3. Guide to Relevant System Skills
For implementing the designs outlined above, reference these guidelines:
*   [react-patterns](file:///home/chuchi/.gemini/antigravity-cli/skills/react-patterns/SKILL.md) for React 19 hooks and optimal composition rules.
*   [ux-feedback](file:///home/chuchi/.gemini/antigravity-cli/skills/ux-feedback/SKILL.md) for standardizing loading/empty/error/success states.
*   [design-spells](file:///home/chuchi/.gemini/antigravity-cli/skills/design-spells/SKILL.md) for polished card animations and transition micro-interactions.
