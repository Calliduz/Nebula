import { Home, Search, Clapperboard, Tv, Library, Theater } from "lucide-react";

export const NAV_ITEMS = [
  { id: "home", icon: Home, label: "Home" },
  { id: "search", icon: Search, label: "Search" },
  { id: "movies", icon: Clapperboard, label: "Movies" },
  { id: "tv", icon: Tv, label: "TV Shows" },
  { id: "drama", icon: Theater, label: "Dramas" },
  { id: "library", icon: Library, label: "Library" },
];

export const GENRES = [
  "All",
  "Sci-Fi",
  "Cyberpunk",
  "Thriller",
  "Action",
  "Mystery",
  "Manhwa",
];

export const MOODS = [
  "All Moods",
  "Dark & Gritty",
  "Mind-Bending",
  "Adrenaline Rush",
  "Cyber",
];

export const SORTS = ["Recently Added", "IMDB Rating", "Release Date"];

export const topSearches = [
  "Stranger Things",
  "One Piece",
  "Interstellar",
  "Attack on Titan",
  "The Dark Knight",
  "Breaking Bad",
  "Demon Slayer",
  "Inception",
  "The Bear",
  "Jujutsu Kaisen",
];
