import { describe, it, expect } from "vitest";
import {
  matchYearFilter,
  filterAndSortSearchResults,
  NebulaMovie,
} from "../services/tmdb";
import {
  SORT_OPTIONS,
  YEAR_OPTIONS,
  RATING_OPTIONS,
  GENRE_OPTIONS,
} from "../components/SearchOverlay";

const mockMovies: NebulaMovie[] = [
  {
    id: 1,
    title: "Interstellar",
    description: "Space exploration movie",
    image: "/interstellar.jpg",
    backdrop: "/interstellar-bg.jpg",
    genre: "Sci-Fi, Adventure, Drama",
    year: 2014,
    release_date: "2014-11-07",
    popularity: 150.5,
    vote_count: 32000,
    imdb: 8.7,
    type: "movie",
  },
  {
    id: 2,
    title: "Stranger Things",
    description: "80s sci-fi supernatural series",
    image: "/stranger-things.jpg",
    backdrop: "/stranger-things-bg.jpg",
    genre: "Sci-Fi, Drama, Mystery",
    year: 2016,
    release_date: "2016-07-15",
    popularity: 320.0,
    vote_count: 18000,
    imdb: 8.6,
    type: "tv",
  },
  {
    id: 3,
    title: "Attack on Titan",
    description: "Humanity fights Titans",
    image: "/aot.jpg",
    backdrop: "/aot-bg.jpg",
    genre: "Animation, Action, Fantasy",
    year: 2013,
    release_date: "2013-04-07",
    popularity: 210.0,
    vote_count: 12000,
    imdb: 9.1,
    type: "tv",
    original_language: "ja",
    origin_country: ["JP"],
  },
  {
    id: 4,
    title: "Spider-Man: Beyond the Spider-Verse",
    description: "Multiverse animation",
    image: "/spiderman-2025.jpg",
    backdrop: "/spiderman-2025-bg.jpg",
    genre: "Animation, Action, Sci-Fi",
    year: 2025,
    release_date: "2025-06-15",
    popularity: 90.0,
    vote_count: 500,
    imdb: 8.9,
    type: "movie",
    original_language: "en",
    origin_country: ["US"],
  },
  {
    id: 5,
    title: "Blade Runner",
    description: "Cyberpunk classic",
    image: "/bladerunner.jpg",
    backdrop: "/bladerunner-bg.jpg",
    genre: "Sci-Fi, Thriller",
    year: 1982,
    release_date: "1982-06-25",
    popularity: 80.0,
    vote_count: 14000,
    imdb: 8.1,
    type: "movie",
  },
  {
    id: 6,
    title: "Boring Low Rated Film",
    description: "Low score film",
    image: "/low.jpg",
    backdrop: "/low-bg.jpg",
    genre: "Comedy",
    year: 2021,
    release_date: "2021-01-01",
    popularity: 10.0,
    vote_count: 100,
    imdb: 5.2,
    type: "movie",
  },
];

describe("Search Engine Filters", () => {
  describe("matchYearFilter", () => {
    it("should match exact 4-digit years", () => {
      expect(matchYearFilter(2024, "2024")).toBe(true);
      expect(matchYearFilter(2025, "2024")).toBe(false);
      expect(matchYearFilter(2014, "2014")).toBe(true);
    });

    it("should match year ranges (e.g. 2020-2022)", () => {
      expect(matchYearFilter(2021, "2020-2022")).toBe(true);
      expect(matchYearFilter(2020, "2020-2022")).toBe(true);
      expect(matchYearFilter(2022, "2020-2022")).toBe(true);
      expect(matchYearFilter(2023, "2020-2022")).toBe(false);
      expect(matchYearFilter(2019, "2020-2022")).toBe(false);
    });

    it("should match decades (2010s, 2000s, 90s)", () => {
      expect(matchYearFilter(2014, "2010s")).toBe(true);
      expect(matchYearFilter(2008, "2000s")).toBe(true);
      expect(matchYearFilter(1994, "90s")).toBe(true);
      expect(matchYearFilter(1994, "1990s")).toBe(true);
      expect(matchYearFilter(2014, "2000s")).toBe(false);
    });

    it("should match classic (<1990)", () => {
      expect(matchYearFilter(1982, "classic")).toBe(true);
      expect(matchYearFilter(1975, "classic")).toBe(true);
      expect(matchYearFilter(1995, "classic")).toBe(false);
    });

    it("should return true for 'all' or empty filter", () => {
      expect(matchYearFilter(2024, "all")).toBe(true);
      expect(matchYearFilter(1982, "")).toBe(true);
    });
  });

  describe("filterAndSortSearchResults", () => {
    it("filters by media type correctly", () => {
      const moviesOnly = filterAndSortSearchResults(mockMovies, {
        type: "movie",
      });
      expect(moviesOnly.every((m) => m.type === "movie")).toBe(true);
      expect(moviesOnly.some((m) => m.title === "Interstellar")).toBe(true);
      expect(moviesOnly.some((m) => m.title === "Stranger Things")).toBe(false);

      const tvOnly = filterAndSortSearchResults(mockMovies, { type: "tv" });
      expect(tvOnly.every((m) => m.type === "tv")).toBe(true);
      expect(tvOnly.some((m) => m.title === "Stranger Things")).toBe(true);

      const animeOnly = filterAndSortSearchResults(mockMovies, {
        type: "anime",
      });
      expect(animeOnly.some((m) => m.title === "Attack on Titan")).toBe(true);
      expect(
        animeOnly.some(
          (m) => m.title === "Spider-Man: Beyond the Spider-Verse",
        ),
      ).toBe(false);
    });

    it("filters by release year correctly", () => {
      const filtered = filterAndSortSearchResults(mockMovies, {
        year: "2010s",
      });
      expect(filtered.map((m) => m.title)).toContain("Interstellar");
      expect(filtered.map((m) => m.title)).toContain("Stranger Things");
      expect(filtered.map((m) => m.title)).toContain("Attack on Titan");
      expect(filtered.map((m) => m.title)).not.toContain("Blade Runner");
      expect(filtered.map((m) => m.title)).not.toContain(
        "Spider-Man: Beyond the Spider-Verse",
      );
    });

    it("filters by minimum rating threshold", () => {
      const highlyRated = filterAndSortSearchResults(mockMovies, {
        minRating: 8.5,
      });
      expect(highlyRated.every((m) => (m.imdb || 0) >= 8.5)).toBe(true);
      expect(highlyRated.map((m) => m.title)).toContain("Attack on Titan");
      expect(highlyRated.map((m) => m.title)).toContain("Interstellar");
      expect(highlyRated.map((m) => m.title)).toContain("Stranger Things");
      expect(highlyRated.map((m) => m.title)).not.toContain(
        "Boring Low Rated Film",
      );
    });

    it("filters by genre", () => {
      const sciFi = filterAndSortSearchResults(mockMovies, { genre: "Sci-Fi" });
      expect(sciFi.map((m) => m.title)).toContain("Interstellar");
      expect(sciFi.map((m) => m.title)).toContain("Stranger Things");
      expect(sciFi.map((m) => m.title)).toContain("Blade Runner");
      expect(sciFi.map((m) => m.title)).not.toContain("Boring Low Rated Film");
    });

    it("sorts by popularity / most_watched correctly", () => {
      const sorted = filterAndSortSearchResults(mockMovies, {
        sortBy: "most_watched",
      });
      // Stranger Things (score: 320 + 180 = 500), Interstellar (score: 150.5 + 320 = 470.5), Attack on Titan (score: 210 + 120 = 330)
      expect(sorted[0].title).toBe("Stranger Things");
      expect(sorted[1].title).toBe("Interstellar");
      expect(sorted[2].title).toBe("Attack on Titan");
    });

    it("sorts by highest rating correctly", () => {
      const sorted = filterAndSortSearchResults(mockMovies, {
        sortBy: "rating",
      });
      expect(sorted[0].title).toBe("Attack on Titan"); // 9.1
      expect(sorted[1].title).toBe("Spider-Man: Beyond the Spider-Verse"); // 8.9
      expect(sorted[2].title).toBe("Interstellar"); // 8.7
    });

    it("sorts by newest releases correctly", () => {
      const sorted = filterAndSortSearchResults(mockMovies, {
        sortBy: "newest",
      });
      expect(sorted[0].title).toBe("Spider-Man: Beyond the Spider-Verse"); // 2025
      expect(sorted[1].title).toBe("Boring Low Rated Film"); // 2021
      expect(sorted[sorted.length - 1].title).toBe("Blade Runner"); // 1982
    });

    it("sorts by alphabetical title correctly", () => {
      const sorted = filterAndSortSearchResults(mockMovies, {
        sortBy: "title",
      });
      expect(sorted[0].title).toBe("Attack on Titan");
      expect(sorted[1].title).toBe("Blade Runner");
      expect(sorted[2].title).toBe("Boring Low Rated Film");
    });
  });

  describe("Content Type and Documentary Recognition", () => {
    const mockVariedContent: NebulaMovie[] = [
      {
        id: 101,
        title: "Top Gun: Maverick",
        description: "Starring Tom Cruise as Maverick",
        image: "/topgun.jpg",
        backdrop: "/topgun-bg.jpg",
        genre: "Action, Drama",
        year: 2022,
        type: "movie",
        displayType: "Film",
        imdb: 8.3,
        vote_count: 8500,
        popularity: 250,
      },
      {
        id: 102,
        title: "Tom Cruise: The Last Movie Star",
        description: "Documentary about Tom Cruise",
        image: "/tc-doc.jpg",
        backdrop: "/tc-doc-bg.jpg",
        genre: "Documentary",
        genres: ["Documentary"],
        isDocumentary: true,
        displayType: "Doc",
        year: 2020,
        type: "movie",
        imdb: 6.2,
        vote_count: 15,
        popularity: 1.2,
      },
      {
        id: 103,
        title: "Mission: Impossible - Dead Reckoning",
        description: "Ethan Hunt embarks on dangerous mission",
        image: "/mi.jpg",
        backdrop: "/mi-bg.jpg",
        genre: "Action, Adventure, Thriller",
        year: 2023,
        type: "movie",
        displayType: "Film",
        imdb: 7.7,
        vote_count: 3200,
        popularity: 180,
      },
    ];

    it("correctly distinguishes film vs documentary content", () => {
      const docsOnly = filterAndSortSearchResults(mockVariedContent, {
        genre: "Documentary",
      });
      expect(docsOnly.length).toBe(1);
      expect(docsOnly[0].title).toBe("Tom Cruise: The Last Movie Star");
      expect(docsOnly[0].displayType).toBe("Doc");

      const actionOnly = filterAndSortSearchResults(mockVariedContent, {
        genre: "Action",
      });
      expect(actionOnly.length).toBe(2);
      expect(actionOnly.some((m) => m.title === "Top Gun: Maverick")).toBe(true);
      expect(actionOnly.some((m) => m.title === "Mission: Impossible - Dead Reckoning")).toBe(true);
    });

    it("correctly sorts blockbuster movies above low-popularity documentaries on most_watched", () => {
      const sorted = filterAndSortSearchResults(mockVariedContent, {
        sortBy: "most_watched",
      });
      expect(sorted[0].title).toBe("Top Gun: Maverick");
      expect(sorted[1].title).toBe("Mission: Impossible - Dead Reckoning");
      expect(sorted[2].title).toBe("Tom Cruise: The Last Movie Star");
    });
  });

  describe("Constants configuration", () => {
    it("includes critical sort options like most_watched, rating, newest", () => {
      const sortIds = SORT_OPTIONS.map((s) => s.id);
      expect(sortIds).toContain("relevance");
      expect(sortIds).toContain("most_watched");
      expect(sortIds).toContain("rating");
      expect(sortIds).toContain("newest");
    });

    it("includes modern and vintage year options", () => {
      const yearIds = YEAR_OPTIONS.map((y) => y.id);
      expect(yearIds).toContain("2026");
      expect(yearIds).toContain("2025");
      expect(yearIds).toContain("2024");
      expect(yearIds).toContain("2010s");
      expect(yearIds).toContain("classic");
    });

    it("includes valid rating and genre options", () => {
      expect(RATING_OPTIONS.some((r) => r.id === 8.0)).toBe(true);
      expect(GENRE_OPTIONS).toContain("Sci-Fi");
      expect(GENRE_OPTIONS).toContain("Action");
      expect(GENRE_OPTIONS).toContain("Anime");
    });
  });
});
