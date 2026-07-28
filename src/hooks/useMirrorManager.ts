import { useState, useCallback, useMemo } from "react";
import {
  fetchCategoryMirrors,
  groupMirrors,
  sortMirrorsList,
} from "../utils/mediaPlayerUtils";
import { fetchVideasySourcesDirect } from "../services/videasy";
import { API_BASE_URL } from "../config";

const API = API_BASE_URL;

const SOURCE_PRIORITY = [
  "Vaplayer",
  "VidRock",
  "Vidrift",
  "Videasy",
  "VidLink",
  "Vidnest",
  "Kuro",
  "FilmU",
  "Peachify",
  "HDGharTV",
  "GharTV",
  "NetNaija",
  "Vesper",
];

interface UseMirrorManagerOptions {
  movie: any;
  season?: number;
  episode?: number;
  initialSource?: string;
}

export function useMirrorManager({
  movie,
  season,
  episode,
  initialSource,
}: UseMirrorManagerOptions) {
  const [mirrors, setMirrors] = useState<any[]>([]);
  const [selectedMirror, setSelectedMirror] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>("Vaplayer");

  const fetchMirrorsForCategory = useCallback(
    async (category: string, force: boolean = false): Promise<any[]> => {
      return fetchCategoryMirrors(
        category,
        movie,
        season,
        episode,
        API,
        fetchVideasySourcesDirect,
        force,
      );
    },
    [
      movie.id,
      movie.type,
      movie.title,
      movie.year,
      movie.release_date,
      season,
      episode,
    ],
  );

  const groupedMirrors = useMemo(() => {
    if (!mirrors || mirrors.length === 0) return [];
    return groupMirrors(mirrors);
  }, [mirrors]);

  return {
    mirrors,
    setMirrors,
    groupedMirrors,
    selectedMirror,
    setSelectedMirror,
    isScanning,
    setIsScanning,
    activeCategory,
    setActiveCategory,
    fetchMirrorsForCategory,
    SOURCE_PRIORITY,
  };
}
