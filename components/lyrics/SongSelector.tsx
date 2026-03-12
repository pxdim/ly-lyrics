/**
 * SongSelector Component
 *
 * Song selection dropdown with search/filter functionality.
 * Fetches songs from API and updates the store when a song is selected.
 * Design System v2.0 - Dark Tech Edition
 */

"use client";

import { type FC, useEffect, useState, useMemo } from "react";
import { Search, Music, Loader2 } from "lucide-react";
import { useLyricsStore } from "@/lib/store";
import { fetchSongs, type ClientSong } from "@/lib/api/songs";

export interface SongSelectorProps {
  /** Optional custom class name for styling */
  className?: string;
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Callback when a song is selected */
  onSongSelect?: (song: ClientSong) => void;
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

  const [songs, setSongs] = useState<ClientSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // 從 API 取得歌曲列表
  useEffect(() => {
    const loadSongs = async () => {
      setIsLoading(true);
      try {
        const result = await fetchSongs({ limit: maxResults });
        setSongs(result.data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load songs";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadSongs();
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
  const handleSelectSong = (song: ClientSong) => {
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
    padding: "0.75rem 1rem 0.75rem 2.75rem",
    borderRadius: "0.75rem",
    border: "1px solid " + "rgba(0, 217, 255, 0.3)",
    backgroundColor: "rgba(3, 3, 4, 0.8)",
    color: "#FFFFFF",
    fontSize: "0.875rem",
    fontFamily: "'Exo 2', sans-serif",
    outline: "none",
    transition: "all 200ms ease-out",
  };

  const dropdownStyle: React.CSSProperties = {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    right: 0,
    marginTop: "0.5rem",
    maxHeight: "320px",
    overflowY: "auto" as const,
    backgroundColor: "rgba(3, 3, 4, 0.95)",
    backdropFilter: "blur(12px)",
    borderRadius: "0.75rem",
    border: "1px solid " + "rgba(0, 217, 255, 0.3)",
    boxShadow: "0 0 20px rgba(0, 217, 255, 0.15), 0 10px 25px rgba(0, 0, 0, 0.5)",
    zIndex: 100,
  };

  const itemStyle: React.CSSProperties = {
    padding: "0.875rem 1rem",
    cursor: "pointer",
    transition: "all 150ms ease-out",
    borderBottom: "1px solid " + "rgba(255, 255, 255, 0.05)",
  };

  const selectedStyle: React.CSSProperties = {
    ...itemStyle,
    backgroundColor: "rgba(0, 217, 255, 0.15)",
    borderLeft: "3px solid #00D9FF",
  };

  const noResultsStyle: React.CSSProperties = {
    ...itemStyle,
    cursor: "default",
    opacity: 0.5,
    textAlign: "center" as const,
  };

  return (
    <div style={containerStyle} className={`song-selector ${className}`}>
      {/* Search Input with Icon */}
      <div style={{ position: "relative" }}>
        <Search
          size={18}
          style={{
            position: "absolute",
            left: "0.875rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#00D9FF",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          style={inputStyle}
          placeholder={placeholder}
          value={searchQuery || currentSong?.title || ""}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={(e) => {
            setIsOpen(true);
            e.currentTarget.style.borderColor = "#00D9FF";
            e.currentTarget.style.boxShadow = "0 0 10px rgba(0, 217, 255, 0.3)";
          }}
          onBlur={(e) => {
            // Delay to allow click events to register
            setTimeout(() => setIsOpen(false), 150);
            e.currentTarget.style.borderColor = "rgba(0, 217, 255, 0.3)";
            e.currentTarget.style.boxShadow = "none";
          }}
          onKeyDown={handleKeyDown}
          aria-label="Search songs"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-activedescendant={
            selectedIndex >= 0 ? `song-${selectedIndex}` : undefined
          }
        />
      </div>

      {/* Current Song Indicator */}
      {currentSong && !searchQuery && !isOpen && (
        <div
          className="flex items-center gap-2 font-body text-sm"
          style={{
            marginTop: "0.5rem",
            color: "#8A8F98",
          }}
        >
          <Music size={14} style={{ color: "#00FF88" }} />
          <span className="text-muted">
            Now playing: <span className="text-primary font-medium">{currentSong.title}</span>
            {currentSong.artist && ` - ${currentSong.artist}`}
          </span>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div style={dropdownStyle} role="listbox">
          {isLoading ? (
            <div
              style={noResultsStyle}
              className="flex items-center justify-center gap-2 font-body"
            >
              <Loader2 size={16} className="animate-spin" style={{ color: "#00D9FF" }} />
              <span style={{ color: "#8A8F98" }}>Loading songs...</span>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div
              style={noResultsStyle}
              className="flex items-center justify-center gap-2 font-body"
            >
              <Music size={16} style={{ color: "#8A8F98" }} />
              <span style={{ color: "#8A8F98" }}>No songs found</span>
            </div>
          ) : (
            filteredSongs.map((song, index) => {
              const isSelected = currentSong?.id === song.id;
              const isHighlighted = index === selectedIndex;
              return (
                <div
                  key={song.id}
                  id={`song-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  style={
                    isHighlighted
                      ? selectedStyle
                      : isSelected
                      ? { ...itemStyle, backgroundColor: "rgba(0, 217, 255, 0.08)", borderLeft: "3px solid rgba(0, 217, 255, 0.5)" }
                      : itemStyle
                  }
                  onClick={() => handleSelectSong(song)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onMouseLeave={() => setSelectedIndex(-1)}
                  className="group"
                >
                  <div className="flex items-center gap-3">
                    <Music
                      size={16}
                      style={{
                        color: isSelected ? "#00D9FF" : "#8A8F98",
                        transition: "all 150ms ease-out",
                      }}
                      className="group-hover:scale-110"
                    />
                    <div className="flex-1">
                      <div
                        className="font-body"
                        style={{
                          fontWeight: isSelected ? "600" : "400",
                          color: isSelected ? "#00D9FF" : "#FFFFFF",
                        }}
                      >
                        {song.title}
                      </div>
                      {showArtist && song.artist && (
                        <div
                          className="font-body text-xs"
                          style={{
                            color: isSelected ? "#6B7280" : "#8A8F98",
                          }}
                        >
                          {song.artist}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
