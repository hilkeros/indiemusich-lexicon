"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Artist {
  name: string;
  did?: string;
  artist?: {
    $type?: string;
    name?: string;
  };
}

interface Recording {
  id: string;
  title: string;
  song?: any;
  artists?: any[];
  isrc?: string;
  masterOwner?: any;
  duration?: number;
}

interface Release {
  id: string;
  title: string;
  artists: any[];
  gtin?: string;
  releaseDate?: string;
  recordings?: any[];
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

export function ReleaseForm({
  editingRelease,
  onReleaseSaved,
}: {
  editingRelease?: Release;
  onReleaseSaved?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(editingRelease?.title || "");
  const [gtin, setGtin] = useState(editingRelease?.gtin || "");
  const [releaseDate, setReleaseDate] = useState(
    editingRelease?.releaseDate ? editingRelease.releaseDate.split("T")[0] : ""
  );
  const [artists, setArtists] = useState<Artist[]>(
    editingRelease && editingRelease.artists?.length > 0 ? editingRelease.artists : [{ name: "" }]
  );
  const [artistLookups, setArtistLookups] = useState<PartyLookupState[]>(
    editingRelease && editingRelease.artists?.length > 0
      ? editingRelease.artists.map(() => emptyLookupState())
      : [emptyLookupState()]
  );
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [allRecordings, setAllRecordings] = useState<Recording[]>([]);
  const [selectedRecordings, setSelectedRecordings] = useState<Recording[]>(
    editingRelease && editingRelease.recordings
      ? editingRelease.recordings.map((r: any) => {
          // If it's a URI string, we need to fetch the full object later
          if (typeof r === "string") {
            return { id: r, title: "Unknown" };
          }
          // Otherwise it's already a full object
          return r as Recording;
        })
      : []
  );
  const [showRecordingDropdown, setShowRecordingDropdown] = useState(false);
  const [recordingSearchQuery, setRecordingSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const lookupTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(lookupTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const res = await fetch("/api/recording");
        if (!res.ok) throw new Error("Failed to fetch recordings");
        const data = await res.json();
        setAllRecordings(Array.isArray(data.recordings) ? data.recordings : []);
      } catch (err) {
        console.error("Failed to fetch recordings:", err);
      }
    };
    void fetchRecordings();
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

  const addRecording = (recording: Recording) => {
    if (!selectedRecordings.find((r) => r.id === recording.id)) {
      setSelectedRecordings((prev) => [...prev, recording]);
      setRecordingSearchQuery("");
      setShowRecordingDropdown(false);
    }
  };

  const removeRecording = (recordingId: string) => {
    setSelectedRecordings((prev) => prev.filter((r) => r.id !== recordingId));
  };

  const handleRecordingDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleRecordingDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleRecordingDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    setSelectedRecordings((prev) => {
      const updated = [...prev];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      updated.splice(dropIndex, 0, draggedItem);
      return updated;
    });

    setDraggedIndex(null);
  };

  const filteredRecordings = allRecordings.filter(
    (rec) =>
      !selectedRecordings.find((s) => s.id === rec.id) &&
      (rec.title.toLowerCase().includes(recordingSearchQuery.toLowerCase()) ||
        rec.isrc?.toLowerCase().includes(recordingSearchQuery.toLowerCase()))
  );

  const handleSaveRelease = async () => {
    if (!title.trim() || artists.some((a) => !a.name.trim()) || selectedRecordings.length === 0) {
      setError("Please fill in all required fields: title, at least one artist, and at least one recording.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const releaseData = {
        ...(editingRelease && { uri: editingRelease.id }),
        title: title.trim(),
        gtin: gtin.trim() || undefined,
        releaseDate: releaseDate ? `${releaseDate}T00:00:00Z` : undefined,
        artists: artists.map((a) => ({
          name: a.name,
          did: a.did,
          artist: a.artist,
        })),
        recordings: selectedRecordings.map((r) => {
          const { id: _id, ...recordingRecord } = r as any;
          return {
            ...recordingRecord,
            $type: "ch.indiemusi.alpha.recording",
          };
        }),
      };

      const method = editingRelease ? "PUT" : "POST";
      const res = await fetch("/api/release", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(releaseData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save release");
      }

      setTitle("");
      setGtin("");
      setReleaseDate("");
      setArtists([{ name: "" }]);
      setArtistLookups([emptyLookupState()]);
      setSelectedRecordings([]);
      if (onReleaseSaved) onReleaseSaved();
      router.refresh();
    } catch (err) {
      console.error("Failed to save release:", err);
      setError(err instanceof Error ? err.message : "Failed to save release");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {editingRelease ? "Edit Release" : "New Release"}
      </h2>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          placeholder="Release title"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          GTIN
        </label>
        <input
          type="text"
          value={gtin}
          onChange={(e) => setGtin(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          placeholder="e.g. 0123456789012"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Release Date
        </label>
        <input
          type="date"
          value={releaseDate}
          onChange={(e) => setReleaseDate(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
        >
          + Add Artist
        </button>
      </div>

      <div className="space-y-3 pt-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Recordings * <span className="text-xs text-zinc-500">(at least one required)</span>
        </label>

        {selectedRecordings.length > 0 && (
          <div className="space-y-2">
            {selectedRecordings.map((recording, index) => (
              <div
                key={recording.id || `${recording.title || "recording"}-${index}`}
                draggable
                onDragStart={() => handleRecordingDragStart(index)}
                onDragOver={handleRecordingDragOver}
                onDrop={() => handleRecordingDrop(index)}
                onDragLeave={() => {}}
                className={`flex items-center justify-between rounded-lg border-2 p-3 transition-all ${
                  draggedIndex === index
                    ? "border-blue-400 bg-blue-50 opacity-50 dark:border-blue-600 dark:bg-blue-950/30"
                    : draggedIndex !== null
                      ? "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
                      : "border-zinc-300 bg-zinc-50 cursor-move hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-blue-700"
                }`}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{recording.title}</p>
                  {recording.isrc && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">ISRC: {recording.isrc}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRecording(recording.id)}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            value={recordingSearchQuery}
            onChange={(e) => {
              setRecordingSearchQuery(e.target.value);
              setShowRecordingDropdown(true);
            }}
            onFocus={() => setShowRecordingDropdown(true)}
            placeholder="Search recordings by title or ISRC..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />

          {showRecordingDropdown && filteredRecordings.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {filteredRecordings.slice(0, 5).map((recording) => (
                <button
                  key={recording.id}
                  type="button"
                  onClick={() => addRecording(recording)}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">{recording.title}</p>
                  {recording.isrc && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">ISRC: {recording.isrc}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {showRecordingDropdown && allRecordings.length > 0 && filteredRecordings.length === 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-300 bg-white p-2 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              No recordings available
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          onClick={handleSaveRelease}
          disabled={isSaving || title.trim() === "" || artists.some((a) => !a.name.trim()) || selectedRecordings.length === 0}
          className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {isSaving ? "Saving..." : editingRelease ? "Update Release" : "Save Release"}
        </button>
      </div>
    </form>
  );
}
