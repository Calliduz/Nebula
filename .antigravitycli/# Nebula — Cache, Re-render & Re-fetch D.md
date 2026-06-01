# Nebula — Cache, Re-render & Re-fetch Deep Dive

## What Is Actually Happening (Root Causes)

### Bug 1 — Background fetch fires even when cache is fresh (biggest UX killer)

```ts
// useAppState.ts L671-678
if (Date.now() - timestamp < 1000 * 60 * 60 * 4) {
  setRows(cRows);
  setFeaturedMovies(cFeatured);
  setAllMovies(cAll);
  setIsLoading(false);
  markInitialPagesAsFetched();
  // ⚠️ NO RETURN — falls through to the full 31-call Promise.all below
}
```

**Effect:** Even on a fresh cache hit, the code _always_ fires 31 parallel TMDB calls, enriches rows, and calls `setRows` / `setAllMovies` again ~2s later. This causes the shimmer flash and row reorder you see on every back/refresh.

**Fix:** Add a staleness check and `return` early from the full fetch when cache is fresh. Only background-refresh when cache age is between 3–4 hours (stale-while-revalidate pattern).

---

### Bug 2 — `syncUserRows` fires on every route change (including back navigation)

```ts
// L1340-1342
useEffect(() => {
  syncUserRows();
}, [location.pathname, history, myList, allMovies.length, syncUserRows]);
```

`location.pathname` changes on every navigation. `syncUserRows` is an async function that calls `getMediaBasicInfo` for missing items and then mutates `rows` state. Every back navigation re-triggers the full user row sync → `setRows` → component re-render → shimmer flash.

**Fix:** Remove `location.pathname` from the dependency array. `syncUserRows` should only depend on `history`, `myList`, and `allMovies.length` — it doesn't need to re-run because the URL changed.

---

### Bug 3 — `categoryCacheRef` is reset on remount

```ts
// L434
const categoryCacheRef = useRef<Record<string, Set<number>>>({});
```

`useRef` lives in React's component tree. On a full page refresh (F5), the component unmounts and remounts, so `categoryCacheRef.current` resets to `{}`. This causes `isPageFetched()` to always return `false` for categories, triggering re-fetches on "See All" pages even when the data is already in `allMovies`.

**Fix:** Persist the fetched-page set in `sessionStorage` (survives navigation but not full refresh), or derive it from `allMovies.length` (if the pool is populated, page 1 is considered fetched).

---

### Bug 4 — `fetchInitialData` closes over stale `allMovies`

```ts
// L659 — defined inside useAppState body, no deps array
const fetchInitialData = async () => { ... }

useEffect(() => {
  fetchInitialData();
}, []); // ← captures allMovies = [] at mount time
```

At lines 904-911, `fetchInitialData` tries `allMovies.find(...)` — but `allMovies` is always `[]` here because it was captured at mount. This causes unnecessary `getMediaBasicInfo` calls for history items that _would_ be in the pool after the fetch completes.

**Fix:** Wrap `fetchInitialData` in `useCallback` (or move the closure-dependent logic to run after `setAllMovies` resolves).

---

## Current Architecture Assessment

```
Client (React)
  └── useAppState (1943 lines, God Hook)
        ├── localStorage: nebula-feed-cache (4h TTL) ← correct concept, buggy impl
        ├── sessionStorage: scroll positions ← correct
        ├── useRef: categoryCacheRef ← wiped on remount
        └── 31 parallel TMDB calls → nebula-server → MongoDB (StreamCache, MetadataCache)

Server (Express)
  ├── MongoDB: StreamCache, MetadataCache, DiscoveryCache ← server-side cache ✔
  ├── proxyCache (in-memory Map, 10min TTL, max 100 entries) ← correct
  └── No TMDB discovery caching on server side ← gap
```

### What's Working Well

- `StreamCache` in MongoDB: stream URL deduplication with 4–6h TTL is solid
- `proxyCache` in-memory: correct pattern for HLS segment acceleration
- `nebula-feed-cache` in localStorage: the _concept_ is right, just the implementation has the "no-return" bug
- Scroll restoration via sessionStorage: architecture is correct
- `AbortController` for search debounce: well done

### What's Broken

| Issue                                                | Severity                                     | Fix complexity                          |
| ---------------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| Background fetch even on fresh cache                 | 🔴 High — causes shimmer/reorder every visit | Simple — add `return` + staleness guard |
| `syncUserRows` on every route change                 | 🔴 High — re-renders on every back nav       | Simple — remove `location.pathname` dep |
| `categoryCacheRef` wiped on refresh                  | 🟡 Medium — redundant category fetches       | Medium — move to sessionStorage         |
| Stale `allMovies` closure in fetch                   | 🟡 Medium — unnecessary API calls            | Medium — useCallback with deps          |
| `recommendations` re-shuffles on every `rows` change | 🟡 Medium — UI jumps                         | Simple — stable sort seed               |

---

---

## Prioritized Fix Plan

### Priority 1 — Fix background fetch (30 min)

```ts
// useAppState.ts inside fetchInitialData
if (Date.now() - timestamp < 1000 * 60 * 60 * 4) {
  setRows(cRows);
  setFeaturedMovies(cFeatured);
  setAllMovies(cAll);
  setIsLoading(false);
  markInitialPagesAsFetched();
  syncUserRows(); // still sync user-specific rows from cache
  return; // ← ADD THIS — skip the full 31-call fetch
}
// If cache is stale (> 3h), fall through to full fetch
```

### Priority 2 — Fix syncUserRows dependency (5 min)

```ts
// Remove location.pathname from deps
useEffect(() => {
  syncUserRows();
}, [history, myList, allMovies.length, syncUserRows]); // ← remove location.pathname
```

### Priority 3 — Persist categoryCacheRef across remounts (20 min)

```ts
// Instead of useRef, use sessionStorage
const isPageFetched = (category: string, region: string, page: number) => {
  try {
    const key = `nebula-fetched-${category}-${region}-${page}`;
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

const markPageAsFetched = (category: string, region: string, page: number) => {
  try {
    const key = `nebula-fetched-${category}-${region}-${page}`;
    sessionStorage.setItem(key, "1");
  } catch {}
};
```

### Priority 4 — Fix recommendations shuffle (5 min)

```ts
// Stable seed based on rows length — won't re-shuffle on unrelated state changes
const recommendations = useMemo(() => {
  const flat = rows.flatMap((r) => r.items);
  // Stable deterministic shuffle using row titles as seed
  const seed = rows.map((r) => r.title).join("").length;
  return flat.slice(seed % 3, (seed % 3) + 20);
}, [rows]);
```

### Priority 5 (Future) — Move TMDB discover calls server-side

Cache the 31 TMDB discover responses on the server with `DiscoveryCache` (TTL 6h).
This reduces TMDB API key quota burn and makes cold-start faster for all users.
