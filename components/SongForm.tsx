"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isValidIPI, IPI_ERROR_MESSAGE, cleanIPI } from "@/lib/validation";

interface PublishingOwnerProfile {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  ipi?: string;
  collectingSociety?: string;
}

interface InterestedParty {
  name: string;
  role?: string;
  ipi?: string;
  collectingSociety?: string;
  performanceRoyaltiesPercentage?: number;
  mechanicalRoyaltiesPercentage?: number;
  did?: string;
  publishingOwner?: PublishingOwnerProfile;
}

interface SongProfile {
  title: string;
  iswc?: string;
  interestedParties: InterestedParty[];
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

function getPublishingOwnerLabel(owner: PublishingOwnerProfile) {
  if (owner.companyName) return owner.companyName;
  const fullName = [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
  return fullName || "Publishing owner linked";
}

function getPublishingOwnerNameForParty(owner: PublishingOwnerProfile) {
  if (owner.companyName) return owner.companyName;
  return [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
}

interface SongToEdit {
  id: string;
  title: string;
  iswc?: string;
  interestedParties: InterestedParty[];
}

export function SongForm({ editingSong, onSongSaved }: { editingSong?: SongToEdit; onSongSaved?: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(editingSong?.title || "");
  const [iswc, setIswc] = useState(editingSong?.iswc || "");
  const [interestedParties, setInterestedParties] = useState<InterestedParty[]>(
    editingSong?.interestedParties && editingSong.interestedParties.length > 0
      ? editingSong.interestedParties
      : [{ name: "" }]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partyLookups, setPartyLookups] = useState<PartyLookupState[]>(
    editingSong?.interestedParties
      ? editingSong.interestedParties.map(() => emptyLookupState())
      : [emptyLookupState()]
  );
  const lookupTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(lookupTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const updateInterestedParty = <K extends keyof InterestedParty>(
    index: number,
    field: K,
    value: InterestedParty[K],
  ) => {
    setInterestedParties((prev) => {
      const updated = [...prev];
      const current = updated[index] || { name: "" };
      updated[index] = { ...current, [field]: value };
      return updated;
    });
  };

  const updatePartyLookup = (index: number, updates: Partial<PartyLookupState>) => {
    setPartyLookups((prev) => {
      const updated = [...prev];
      const current = updated[index] || emptyLookupState();
      updated[index] = { ...current, ...updates };
      return updated;
    });
  };

  const searchHandleSuggestions = async (index: number, query: string) => {
    updatePartyLookup(index, { searching: true, message: null });

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

      updatePartyLookup(index, { suggestions });
    } catch (err) {
      console.error("Failed to search handles:", err);
      updatePartyLookup(index, {
        suggestions: [],
        message: "Handle search failed. Try again.",
      });
    } finally {
      updatePartyLookup(index, { searching: false });
    }
  };

  const fetchPublishingOwnerForDid = async (index: number, did: string) => {
    updatePartyLookup(index, {
      lookupLoading: true,
      message: "Looking up publishing owner...",
    });

    try {
      const res = await fetch(`/api/publishing-owner?did=${encodeURIComponent(did)}`);
      if (!res.ok) throw new Error("Lookup failed");

      const data = await res.json();
      const owner: PublishingOwnerProfile | null = data.publishingOwner || null;

      setInterestedParties((prev) => {
        const updated = [...prev];
        const current = updated[index];
        if (!current) return prev;

        const nextParty: InterestedParty = {
          ...current,
          did,
          publishingOwner: owner || undefined,
        };

        if (owner) {
          const ownerName = getPublishingOwnerNameForParty(owner);
          if (!nextParty.name && ownerName) nextParty.name = ownerName;
          if (!nextParty.ipi && owner.ipi) nextParty.ipi = owner.ipi;
          if (!nextParty.collectingSociety && owner.collectingSociety) {
            nextParty.collectingSociety = owner.collectingSociety;
          }
        }

        updated[index] = nextParty;
        return updated;
      });

      if (owner) {
        updatePartyLookup(index, { message: "Publishing owner linked." });
      } else {
        updatePartyLookup(index, {
          message: "No publishing owner record found for this DID.",
        });
      }
    } catch (err) {
      console.error("Failed to fetch publishing owner for DID:", err);
      updatePartyLookup(index, {
        message: "Could not load publishing owner for this DID.",
      });
    } finally {
      updatePartyLookup(index, { lookupLoading: false });
    }
  };

  const onHandleInputChange = (index: number, value: string) => {
    const existingTimer = lookupTimersRef.current[index];
    if (existingTimer) clearTimeout(existingTimer);

    updatePartyLookup(index, {
      handleQuery: value,
      suggestions: [],
      searching: false,
      message: null,
    });

    updateInterestedParty(index, "did", undefined);
    updateInterestedParty(index, "publishingOwner", undefined);

    const query = value.trim();
    if (query.length < 2) {
      return;
    }

    lookupTimersRef.current[index] = setTimeout(() => {
      void searchHandleSuggestions(index, query);
    }, 250);
  };

  const onSelectHandle = async (index: number, suggestion: HandleSuggestion) => {
    const existingTimer = lookupTimersRef.current[index];
    if (existingTimer) clearTimeout(existingTimer);

    updatePartyLookup(index, {
      handleQuery: suggestion.handle,
      suggestions: [],
      searching: false,
      message: null,
    });

    updateInterestedParty(index, "did", suggestion.did);
    await fetchPublishingOwnerForDid(index, suggestion.did);
  };

  const addInterestedParty = () => {
    setInterestedParties((prev) => [...prev, { name: "" }]);
    setPartyLookups((prev) => [...prev, emptyLookupState()]);
  };

  const removeInterestedParty = (index: number) => {
    const existingTimer = lookupTimersRef.current[index];
    if (existingTimer) clearTimeout(existingTimer);

    const reindexedTimers: Record<number, ReturnType<typeof setTimeout>> = {};
    Object.entries(lookupTimersRef.current).forEach(([key, timer]) => {
      const timerIndex = Number(key);
      if (timerIndex < index) reindexedTimers[timerIndex] = timer;
      if (timerIndex > index) reindexedTimers[timerIndex - 1] = timer;
    });
    lookupTimersRef.current = reindexedTimers;

    setInterestedParties((prev) => prev.filter((_, i) => i !== index));
    setPartyLookups((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate interested parties
    if (interestedParties.length === 0 || interestedParties.some(p => !p.name)) {
      setError("All interested parties must have a name");
      setLoading(false);
      return;
    }

    // Validate IPI numbers
    for (const party of interestedParties) {
      if (party.ipi && !isValidIPI(party.ipi)) {
        setError(`${IPI_ERROR_MESSAGE} for ${party.name}`);
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        title,
        iswc: iswc || undefined,
        interestedParties: interestedParties.map(p => {
          const party: any = { name: p.name };
          if (p.role) party.role = p.role;
          if (p.ipi) party.ipi = cleanIPI(p.ipi);
          if (p.collectingSociety) party.collectingSociety = p.collectingSociety;
          if (p.performanceRoyaltiesPercentage != null) party.performanceRoyaltiesPercentage = p.performanceRoyaltiesPercentage;
          if (p.mechanicalRoyaltiesPercentage != null) party.mechanicalRoyaltiesPercentage = p.mechanicalRoyaltiesPercentage;
          if (p.did) party.did = p.did;
          if (p.publishingOwner) party.publishingOwner = p.publishingOwner;
          return party;
        }),
      };

      const isEditing = !!editingSong;
      const res = await fetch("/api/song", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { ...payload, uri: editingSong.id } : payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} song`);
      }

      router.refresh();
      onSongSaved?.();
    } catch (err) {
      console.error(`Failed to ${editingSong ? 'update' : 'create'} song:`, err);
      setError((err as Error).message || "Failed to save song");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        {editingSong ? 'Edit Song' : 'New Song'}
      </h2>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Song Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          disabled={loading}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          ISWC Code
        </label>
        <input
          type="text"
          value={iswc}
          onChange={(e) => setIswc(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          disabled={loading}
          placeholder="e.g., T-123.456.789-0"
          maxLength={13}
        />
      </div>

      {/* Interested Parties */}
      <div className="space-y-3 pt-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Interested Parties * <span className="text-xs text-zinc-500">(at least one required)</span>
        </label>

        {interestedParties.map((party, index) => (
          <div key={index} className="p-3 border border-zinc-300 dark:border-zinc-700 rounded-lg space-y-2 bg-zinc-50 dark:bg-zinc-800/50">
            {(() => {
              const lookup = partyLookups[index] || emptyLookupState();
              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="relative">
                      <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                        Atproto Handle
                      </label>
                      <input
                        type="text"
                        value={lookup.handleQuery}
                        onChange={(e) => onHandleInputChange(index, e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800"
                        disabled={loading}
                        placeholder="Type a handle, e.g. alice.bsky.social"
                      />

                      {lookup.suggestions.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 shadow">
                          {lookup.suggestions.map((suggestion) => (
                            <button
                              key={suggestion.did}
                              type="button"
                              onClick={() => { void onSelectHandle(index, suggestion); }}
                              className="w-full text-left px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              <div className="text-sm text-zinc-900 dark:text-zinc-100">{suggestion.handle}</div>
                              {suggestion.displayName && (
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {suggestion.displayName}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                        DID
                      </label>
                      <input
                        type="text"
                        value={party.did || ""}
                        readOnly
                        className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                        placeholder="Will populate from selected handle"
                      />
                    </div>
                  </div>

                  {(lookup.searching || lookup.lookupLoading || lookup.message) && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {lookup.searching
                        ? "Searching handles..."
                        : lookup.lookupLoading
                        ? "Looking up publishing owner..."
                        : lookup.message}
                    </p>
                  )}

                  {party.publishingOwner && (
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Linked publishing owner: {getPublishingOwnerLabel(party.publishingOwner)}
                    </p>
                  )}
                </>
              );
            })()}

            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Party {index + 1}
              </span>
              {interestedParties.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeInterestedParty(index)}
                  disabled={loading}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={party.name}
                  onChange={(e) => updateInterestedParty(index, "name", e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800"
                  disabled={loading}
                  maxLength={255}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={party.role || ""}
                  onChange={(e) => updateInterestedParty(index, "role", e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800"
                  disabled={loading}
                  placeholder="e.g., composer"
                  maxLength={255}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                  IPI
                </label>
                <input
                  type="text"
                  value={party.ipi || ""}
                  onChange={(e) => updateInterestedParty(index, "ipi", e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                  Collecting Society
                </label>
                <input
                  type="text"
                  value={party.collectingSociety || ""}
                  onChange={(e) => updateInterestedParty(index, "collectingSociety", e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800"
                  disabled={loading}
                  maxLength={255}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                  Performance %
                </label>
                <input
                  type="number"
                  value={party.performanceRoyaltiesPercentage || ""}
                  onChange={(e) => updateInterestedParty(index, "performanceRoyaltiesPercentage", e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800"
                  disabled={loading}
                  placeholder="10000 = 100%"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                  Mechanical %
                </label>
                <input
                  type="number"
                  value={party.mechanicalRoyaltiesPercentage || ""}
                  onChange={(e) => updateInterestedParty(index, "mechanicalRoyaltiesPercentage", e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800"
                  disabled={loading}
                  placeholder="10000 = 100%"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addInterestedParty}
          disabled={loading}
          className="w-full py-2 px-3 text-sm border border-dashed border-zinc-300 dark:border-zinc-700 rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        >
          + Add Interested Party
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading || !title || interestedParties.length === 0 || interestedParties.some(p => !p.name)}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : editingSong ? "Update Song" : "Save Song"}
      </button>
    </form>
  );
}
