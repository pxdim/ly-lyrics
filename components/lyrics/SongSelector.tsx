/**
 * SongSelector Component
 *
 * Song selection dropdown with search/filter functionality.
 * Fetches songs from API and updates the store when a song is selected.
 */

"use client";

import { type FC, useEffect, useState, useMemo } from "react";
import { useLyricsStore } from "@/lib/store";
import { getSongs, type Song } from "@/lib/services/songService";

export interface SongSelectorProps {
  /** Optional custom class name for styling */
  className?: string;
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Callback when a song is selected */
  onSongSelect?: (song: Song) => void;
  /** Whether to show the artist in the list */
  showArtist?: boolean;
  /** Maximum number of songs to display */
  maxResults?: number;
}

export const SongSelector: FC<SongSelectorProps> = ({
  className = "",
  placeholder = "Search songs...",
  onSongSelect,
  showArtist = true,
  maxResults = 50,
}) => {
  const { currentSong, setCurrentSong, setError } = useLyricsStore();

  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Fetch songs on mount
  useEffect(() => {
    const fetchSongs = async () => {
      setIsLoading(true);
      try {
        const result = await getSongs({ limit: maxResults });
        setSongs(result.data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load songs";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSongs();
  }, [maxResults, setError]);

  // Filter songs based on search query
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) {
      return songs;
    }

    const query = searchQuery.toLowerCase();
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(query) ||
        (song.artist && song.artist.toLowerCase().includes(query))
    );
  }, [songs, searchQuery]);

  // Handle song selection
  const handleSelectSong = (song: Song) => {
    setCurrentSong(song);
    setIsOpen(false);
    setSearchQuery("");
    setSelectedIndex(-1);
    onSongSelect?.(song);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredSongs.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && filteredSongs[selectedIndex]) {
          handleSelectSong(filteredSongs[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Container style
  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth: "400px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "white",
    fontSize: "0.875rem",
    outline: "none",
    transition: "all 0.2s ease",
  };

  const dropdownStyle: React.CSSProperties = {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    right: 0,
    marginTop: "0.5rem",
    maxHeight: "300px",
    overflowY: "auto" as const,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    backdropFilter: "blur(8px)",
    borderRadius: "0.5rem",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
    zIndex: 100,
  };

  const itemStyle: React.CSSProperties = {
    padding: "0.75rem 1rem",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  };

  const selectedStyle: React.CSSProperties = {
    ...itemStyle,
    backgroundColor: "rgba(14, 165, 233, 0.2)",
  };

  const noResultsStyle: React.CSSProperties = {
    ...itemStyle,
    cursor: "default",
    opacity: 0.5,
    textAlign: "center" as const,
  };

  return (
    <div style={containerStyle} className={`song-selector ${className}`}>
      {/* Search Input */}
      <input
        type="text"
        style={inputStyle}
        placeholder={placeholder}
        value={searchQuery || currentSong?.title || ""}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // Delay to allow click events to register
          setTimeout(() => setIsOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        aria-label="Search songs"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-activedescendant={
          selectedIndex >= 0 ? `song-${selectedIndex}` : undefined
        }
      />

      {/* Current Song Indicator */}
      {currentSong && !searchQuery && !isOpen && (
        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.75rem",
            color: "rgba(255, 255, 255, 0.6)",
          }}
        >
          Now playing: {currentSong.title}
          {currentSong.artist && ` - ${currentSong.artist}`}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div style={dropdownStyle} role="listbox">
          {isLoading ? (
            <div style={noResultsStyle}>Loading songs...</div>
          ) : filteredSongs.length === 0 ? (
            <div style={noResultsStyle}>No songs found</div>
          ) : (
            filteredSongs.map((song, index) => (
              <div
                key={song.id}
                id={`song-${index}`}
                role="option"
                aria-selected={currentSong?.id === song.id}
                style={
                  index === selectedIndex
                    ? selectedStyle
                    : currentSong?.id === song.id
                    ? { ...itemStyle, backgroundColor: "rgba(14, 165, 233, 0.1)" }
                    : itemStyle
                }
                onClick={() => handleSelectSong(song)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div
                  style={{
                    fontWeight: currentSong?.id === song.id ? "600" : "400",
                    color: "white",
                  }}
                >
                  {song.title}
                </div>
                {showArtist && song.artist && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    {song.artist}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
