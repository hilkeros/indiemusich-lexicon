"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cleanISRC, isValidISRC, ISRC_ERROR_MESSAGE } from "@/lib/validation";

interface Song {
  id: string;
  title: string;
  iswc?: string;
  interestedParties: any[];
}

interface Artist {
  name: string;
  did?: string;
  artist?: {
    $type?: string;
    name?: string;
  };
}

interface MasterOwnerInfo {
  name?: string;
  did?: string;
  masterOwner?: {
    $type?: string;
    name?: string;
  };
}

interface HandleSuggestion {
  did: string;
  handle: string;
  displayName?: string;
}

interface PartyLookupState {
  handleQuery: string;
  suggestions: HandleSuggestion[];
  searching: boolean;
  lookupLoading: boolean;
  message: string | null;
}

const emptyLookupState = (): PartyLookupState => ({
  handleQuery: "",
  suggestions: [],
  searching: false,
  lookupLoading: false,
  message: null,
});

function formatDurationForInput(seconds?: number): string {
  if (seconds == null || Number.isNaN(seconds)) return "";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function parseDurationInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d+):(\d{2})$/);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (seconds >= 60) return null;

  return minutes * 60 + seconds;
}

interface RecordingToEdit {
  id: string;
  title: string;
  song?: { ref: string };
  artists: Artist[];
  isrc?: string;
  masterOwner?: MasterOwnerInfo;
  duration?: number;
}

export function RecordingForm({
  editingRecording,
  onRecordingSaved,
}: {
  editingRecording?: RecordingToEdit;
  onRecordingSaved?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(editingRecording?.title || "");
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSongId, setSelectedSongId] = useState(editingRecording?.song?.ref || "");
  const [artists, setArtists] = useState<Artist[]>(
    editingRecording?.artists && editingRecording.artists.length > 0
      ? editingRecording.artists
      : [{ name: "" }],
  );
  const [isrc, setIsrc] = useState(editingRecording?.isrc || "");
  const [masterOwner, setMasterOwner] = useState<MasterOwnerInfo>(editingRecording?.masterOwner || {});
  const [duration, setDuration] = useState(formatDurationForInput(editingRecording?.duration));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artistLookups, setArtistLookups] = useState<PartyLookupState[]>(
    editingRecording?.artists
      ? editingRecording.artists.map(() => emptyLookupState())
      : [emptyLookupState()],
  );
  const [masterOwnerLookup, setMasterOwnerLookup] = useState<PartyLookupState>(emptyLookupState());
  const lookupTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    async function fetchSongs() {
      try {
        const res = await fetch("/api/song");
        if (!res.ok) throw new Error("Failed to fetch songs");
        const data = await res.json();
        setSongs(data.songs || []);
      } catch (err) {
        console.error("Failed to fetch songs:", err);
      }
    }

    fetchSongs();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(lookupTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const updateArtist = <K extends keyof Artist>(index: number, field: K, value: Artist[K]) => {
    setArtists((prev) => {
      const updated = [...prev];
      const current = updated[index] || { name: "" };
      updated[index] = { ...current, [field]: value };
      return updated;
    });
  };

  const updateArtistLookup = (index: number, updates: Partial<PartyLookupState>) => {
    setArtistLookups((prev) => {
      const updated = [...prev];
      const current = updated[index] || emptyLookupState();
      updated[index] = { ...current, ...updates };
      return updated;
    });
  };

  const searchHandleSuggestions = async (index: number, query: string) => {
    updateArtistLookup(index, { searching: true, message: null });

    try {
      const res = await fetch(`/api/actor-search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      const suggestions: HandleSuggestion[] = Array.isArray(data.actors)
        ? data.actors
            .filter((actor: any) => typeof actor?.did === "string" && typeof actor?.handle === "string")
            .map((actor: any) => ({
              did: actor.did,
              handle: actor.handle,
              displayName: typeof actor.displayName === "string" ? actor.displayName : undefined,
            }))
        : [];

      updateArtistLookup(index, { suggestions });
    } catch (err) {
      console.error("Failed to search handles:", err);
      updateArtistLookup(index, {
        suggestions: [],
        message: "Handle search failed. Try again.",
      });
    } finally {
      updateArtistLookup(index, { searching: false });
    }
  };

  const fetchArtistForDid = async (index: number, did: string) => {
    updateArtistLookup(index, {
      lookupLoading: true,
      message: "Looking up artist record...",
    });

    try {
      const res = await fetch(`/api/artist?did=${encodeURIComponent(did)}`);
      if (!res.ok) throw new Error("Lookup failed");

      const data = await res.json();
      const record = data.artist || null;

      setArtists((prev) => {
        const updated = [...prev];
        const current = updated[index];
        if (!current) return prev;

        const nextArtist: Artist = {
          ...current,
          did,
        };

        if (record?.name && !nextArtist.name) {
          nextArtist.name = record.name;
        }

        if (record) {
          nextArtist.artist = {
            ...record,
            $type: record.$type || "ch.indiemusi.alpha.actor.artist",
          };
        } else {
          delete nextArtist.artist;
        }

        updated[index] = nextArtist;
        return updated;
      });

      if (record) {
        updateArtistLookup(index, { message: "Artist record linked." });
      } else {
        updateArtistLookup(index, {
          message: "No artist record found for this DID. You can still type a name.",
        });
      }
    } catch (err) {
      console.error("Failed to fetch artist for DID:", err);
      updateArtistLookup(index, {
        message: "Could not load artist record for this DID.",
      });
    } finally {
      updateArtistLookup(index, { lookupLoading: false });
    }
  };

  const onArtistHandleInputChange = (index: number, value: string) => {
    const existingTimer = lookupTimersRef.current[index];
    if (existingTimer) clearTimeout(existingTimer);

    updateArtistLookup(index, {
      handleQuery: value,
      suggestions: [],
      searching: false,
      message: null,
    });

    updateArtist(index, "did", undefined);
    updateArtist(index, "artist", undefined);

    const query = value.trim();
    if (query.length < 2) {
      return;
    }

    lookupTimersRef.current[index] = setTimeout(() => {
      void searchHandleSuggestions(index, query);
    }, 250);
  };

  const onSelectArtistHandle = async (index: number, suggestion: HandleSuggestion) => {
    const existingTimer = lookupTimersRef.current[index];
    if (existingTimer) clearTimeout(existingTimer);

    updateArtistLookup(index, {
      handleQuery: suggestion.handle,
      suggestions: [],
      searching: false,
      message: null,
    });

    updateArtist(index, "did", suggestion.did);
    await fetchArtistForDid(index, suggestion.did);
  };

  const addArtist = () => {
    setArtists((prev) => [...prev, { name: "" }]);
    setArtistLookups((prev) => [...prev, emptyLookupState()]);
  };

  const removeArtist = (index: number) => {
    const existingTimer = lookupTimersRef.current[index];
    if (existingTimer) clearTimeout(existingTimer);

    const reindexedTimers: Record<number, ReturnType<typeof setTimeout>> = {};
    Object.entries(lookupTimersRef.current).forEach(([key, timer]) => {
      const timerIndex = Number(key);
      if (timerIndex < index) reindexedTimers[timerIndex] = timer;
      if (timerIndex > index) reindexedTimers[timerIndex - 1] = timer;
    });
    lookupTimersRef.current = reindexedTimers;

    setArtists((prev) => prev.filter((_, i) => i !== index));
    setArtistLookups((prev) => prev.filter((_, i) => i !== index));
  };

  const onMasterOwnerHandleChange = (value: string) => {
    setMasterOwnerLookup((prev) => ({
      ...prev,
      handleQuery: value,
      suggestions: [],
      searching: false,
      message: null,
    }));
    setMasterOwner((prev) => ({ ...prev, did: undefined, masterOwner: undefined }));

    const query = value.trim();
    if (query.length < 2) return;

    setMasterOwnerLookup((prev) => ({ ...prev, searching: true }));
    setTimeout(() => {
      fetch(`/api/actor-search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          const suggestions: HandleSuggestion[] = Array.isArray(data.actors)
            ? data.actors
                .filter((actor: any) => typeof actor?.did === "string" && typeof actor?.handle === "string")
                .map((actor: any) => ({
                  did: actor.did,
                  handle: actor.handle,
                  displayName: typeof actor.displayName === "string" ? actor.displayName : undefined,
                }))
            : [];
          setMasterOwnerLookup((prev) => ({ ...prev, suggestions, searching: false }));
        })
        .catch(() => {
          setMasterOwnerLookup((prev) => ({
            ...prev,
            suggestions: [],
            searching: false,
            message: "Search failed",
          }));
        });
    }, 250);
  };

  const onSelectMasterOwnerHandle = (suggestion: HandleSuggestion) => {
    setMasterOwnerLookup((prev) => ({
      ...prev,
      handleQuery: suggestion.handle,
      suggestions: [],
      lookupLoading: true,
      message: null,
    }));
    setMasterOwner((prev) => ({ ...prev, did: suggestion.did }));

    fetch(`/api/master-owner?did=${encodeURIComponent(suggestion.did)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.masterOwner) {
          const record = data.masterOwner;
          const name = record.name || "";
          setMasterOwner((prev) => ({
            ...prev,
            name: prev.name || name,
            masterOwner: {
              ...record,
              $type: record.$type || "ch.indiemusi.alpha.actor.masterOwner",
            },
          }));
          setMasterOwnerLookup((prev) => ({
            ...prev,
            lookupLoading: false,
            message: "Master owner record fetched",
          }));
        } else {
          setMasterOwner((prev) => ({ ...prev, masterOwner: undefined }));
          setMasterOwnerLookup((prev) => ({
            ...prev,
            lookupLoading: false,
            message: "No master owner record found for this DID.",
          }));
        }
      })
      .catch(() => {
        setMasterOwner((prev) => ({ ...prev, masterOwner: undefined }));
        setMasterOwnerLookup((prev) => ({
          ...prev,
          lookupLoading: false,
          message: "DID selected",
        }));
      });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (artists.length === 0 || artists.some((a) => !a.name)) {
      setError("All artists must have a name");
      setLoading(false);
      return;
    }

    if (isrc && !isValidISRC(isrc)) {
      setError(ISRC_ERROR_MESSAGE);
      setLoading(false);
      return;
    }

    const parsedDuration = parseDurationInput(duration);
    if (duration && parsedDuration == null) {
      setError("Duration must be in mm:ss format");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title,
        artists: artists.map((a) => {
          const out: any = { name: a.name };
          if (a.did) out.did = a.did;
          if (a.artist?.$type === "ch.indiemusi.alpha.actor.artist") {
            out.artist = a.artist;
          }
          return out;
        }),
      };

      if (selectedSongId) {
        const selectedSong = songs.find((s) => s.id === selectedSongId);
        if (selectedSong) {
          const { id: _id, ...songRecord } = selectedSong;
          (payload as any).song = songRecord;
        }
      }

      if (isrc) (payload as any).isrc = cleanISRC(isrc);
      if (masterOwner?.did || masterOwner?.name || masterOwner?.masterOwner) {
        const nextMasterOwner: any = {};
        if (masterOwner.name) nextMasterOwner.name = masterOwner.name;
        if (masterOwner.did) nextMasterOwner.did = masterOwner.did;
        if (masterOwner.masterOwner?.$type === "ch.indiemusi.alpha.actor.masterOwner") {
          nextMasterOwner.masterOwner = masterOwner.masterOwner;
        }
        (payload as any).masterOwner = nextMasterOwner;
      }
      if (parsedDuration != null) (payload as any).duration = parsedDuration;

      const isEditing = !!editingRecording;
      const res = await fetch("/api/recording", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { ...payload, uri: editingRecording.id } : payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${isEditing ? "update" : "create"} recording`);
      }

      router.refresh();
      onRecordingSaved?.();
    } catch (err) {
      console.error(`Failed to ${editingRecording ? "update" : "create"} recording:`, err);
      setError((err as Error).message || "Failed to save recording");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {editingRecording ? "Edit Recording" : "New Recording"}
      </h2>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Song</label>
        <select
          value={selectedSongId}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedSongId(value);

            if (!value) return;

            const selectedSong = songs.find((song) => song.id === value);
            if (selectedSong) {
              setTitle(selectedSong.title);
            }
          }}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          disabled={loading}
        >
          <option value="">-- Select a song (optional) --</option>
          {songs.map((song) => (
            <option key={song.id} value={song.id}>
              {song.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          disabled={loading}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">ISRC Code</label>
        <input
          type="text"
          value={isrc}
          onChange={(e) => setIsrc(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          disabled={loading}
          placeholder="e.g., USSM12345678"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Duration (mm:ss)
        </label>
        <input
          type="text"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          disabled={loading}
          placeholder="e.g., 03:00"
        />
      </div>

      <div className="space-y-3 pt-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Artists * <span className="text-xs text-zinc-500">(at least one required)</span>
        </label>

        {artists.map((artist, index) => {
          const lookup = artistLookups[index] || emptyLookupState();
          return (
            <div
              key={index}
              className="space-y-2 rounded-lg border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              <div className="relative">
                <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">Handle</label>
                <input
                  type="text"
                  value={lookup.handleQuery}
                  onChange={(e) => onArtistHandleInputChange(index, e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  disabled={loading}
                  placeholder="Type a handle, e.g. alice.bsky.social"
                />

                {lookup.suggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded border border-zinc-300 bg-white shadow dark:border-zinc-700 dark:bg-zinc-900">
                    {lookup.suggestions.map((suggestion) => (
                      <button
                        key={suggestion.did}
                        type="button"
                        onClick={() => {
                          void onSelectArtistHandle(index, suggestion);
                        }}
                        className="w-full px-2 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <div className="text-sm text-zinc-900 dark:text-zinc-100">{suggestion.handle}</div>
                        {suggestion.displayName && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">{suggestion.displayName}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">DID</label>
                <input
                  type="text"
                  value={artist.did || ""}
                  readOnly
                  className="w-full rounded border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">Name *</label>
                <input
                  type="text"
                  value={artist.name}
                  onChange={(e) => updateArtist(index, "name", e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  disabled={loading}
                />
              </div>

              {lookup.message && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {lookup.lookupLoading ? "Fetching record..." : lookup.message}
                </p>
              )}

              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeArtist(index)}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                  disabled={loading}
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addArtist}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          disabled={loading}
        >
          + Add Artist
        </button>
      </div>

      <div className="space-y-3 pt-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Master Owner (optional)
        </label>

        <div className="space-y-2 rounded-lg border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <div className="relative">
            <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">Handle</label>
            <input
              type="text"
              value={masterOwnerLookup.handleQuery}
              onChange={(e) => onMasterOwnerHandleChange(e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              disabled={loading}
              placeholder="Type a handle, e.g. alice.bsky.social"
            />

            {masterOwnerLookup.suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded border border-zinc-300 bg-white shadow dark:border-zinc-700 dark:bg-zinc-900">
                {masterOwnerLookup.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.did}
                    type="button"
                    onClick={() => {
                      onSelectMasterOwnerHandle(suggestion);
                    }}
                    className="w-full px-2 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <div className="text-sm text-zinc-900 dark:text-zinc-100">{suggestion.handle}</div>
                    {suggestion.displayName && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{suggestion.displayName}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">DID</label>
            <input
              type="text"
              value={masterOwner.did || ""}
              readOnly
              className="w-full rounded border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">Name</label>
            <input
              type="text"
              value={masterOwner.name || ""}
              onChange={(e) => setMasterOwner((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              disabled={loading}
            />
          </div>

          {masterOwnerLookup.message && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {masterOwnerLookup.lookupLoading ? "Fetching record..." : masterOwnerLookup.message}
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading || !title || artists.length === 0}
          className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : editingRecording ? "Update Recording" : "Save Recording"}
        </button>
      </div>
    </form>
  );
}
