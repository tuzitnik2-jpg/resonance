"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getPreviewUrl } from "@/lib/api-client";

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
}

interface PlayerState {
  current: PlayerTrack | null;
  playing: boolean;
  loading: boolean;
  /** No preview was available for the last track we tried. */
  unavailable: boolean;
  play: (track: PlayerTrack) => void;
  toggle: () => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within <PlayerProvider>");
  return ctx;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<PlayerTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onEnded = () => setPlaying(false);
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, []);

  async function play(track: PlayerTrack) {
    const audio = audioRef.current;
    if (!audio) return;
    // Same track: just toggle.
    if (current?.id === track.id && audio.src) {
      if (audio.paused) audio.play().catch(() => undefined);
      else audio.pause();
      return;
    }
    setCurrent(track);
    setUnavailable(false);
    setLoading(true);
    try {
      const { previewUrl } = await getPreviewUrl(track.artist, track.title);
      if (!previewUrl) {
        setUnavailable(true);
        setPlaying(false);
        return;
      }
      audio.src = previewUrl;
      await audio.play();
    } catch {
      setUnavailable(true);
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) audio.play().catch(() => undefined);
    else audio.pause();
  }

  return (
    <PlayerContext.Provider value={{ current, playing, loading, unavailable, play, toggle }}>
      {children}
    </PlayerContext.Provider>
  );
}
