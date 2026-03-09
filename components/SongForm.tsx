"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface InterestedParty {
  name: string;
  role?: string;
  ipi?: string;
  collectingSociety?: string;
  performanceRoyaltiesPercentage?: number;
  mechanicalRoyaltiesPercentage?: number;
}

interface SongProfile {
  title: string;
  iswc?: string;
  interestedParties: InterestedParty[];
}

export function SongForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [iswc, setIswc] = useState("");
  const [interestedParties, setInterestedParties] = useState<InterestedParty[]>([
    { name: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingSong, setExistingSong] = useState<SongProfile | null>(null);
  const [isLoadingSong, setIsLoadingSong] = useState(true);

  // Fetch existing song on mount
  useEffect(() => {
    async function fetchSong() {
      try {
        const res = await fetch("/api/song");
        if (!res.ok) {
          throw new Error("Failed to fetch song");
        }
        const data = await res.json();
        if (data.song) {
          setExistingSong(data.song);
        }
      } catch (err) {
        console.error("Failed to fetch song:", err);
      } finally {
        setIsLoadingSong(false);
      }
    }

    fetchSong();
  }, []);

  const updateInterestedParty = (index: number, field: string, value: any) => {
    const updated = [...interestedParties];
    updated[index] = { ...updated[index], [field]: value };
    setInterestedParties(updated);
  };

  const addInterestedParty = () => {
    setInterestedParties([...interestedParties, { name: "" }]);
  };

  const removeInterestedParty = (index: number) => {
    setInterestedParties(interestedParties.filter((_, i) => i !== index));
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

    try {
      const res = await fetch("/api/song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          iswc: iswc || undefined,
          interestedParties: interestedParties.map(p => {
            const party: any = { name: p.name };
            if (p.role) party.role = p.role;
            if (p.ipi) party.ipi = p.ipi;
            if (p.collectingSociety) party.collectingSociety = p.collectingSociety;
            if (p.performanceRoyaltiesPercentage) party.performanceRoyaltiesPercentage = p.performanceRoyaltiesPercentage;
            if (p.mechanicalRoyaltiesPercentage) party.mechanicalRoyaltiesPercentage = p.mechanicalRoyaltiesPercentage;
            return party;
          }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create song");
      }

      const data = await res.json();
      if (data.song) {
        setExistingSong(data.song);
      }

      router.refresh();
    } catch (err) {
      console.error("Failed to create song:", err);
      setError((err as Error).message || "Failed to save song");
    } finally {
      setLoading(false);
    }
  }

  // Show loading state while fetching song
  if (isLoadingSong) {
    return <div className="text-zinc-500">Loading song...</div>;
  }

  // Show existing song
  if (existingSong) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            Song Found
          </h3>
          <p className="text-sm text-green-800 dark:text-green-200 mb-2">
            <strong>Title:</strong> {existingSong.title}
          </p>
          {existingSong.iswc && (
            <p className="text-sm text-green-800 dark:text-green-200 mb-2">
              <strong>ISWC:</strong> {existingSong.iswc}
            </p>
          )}
          <div className="text-xs text-green-700 dark:text-green-300">
            <strong>Interested Parties:</strong> {existingSong.interestedParties.length}
          </div>
        </div>
      </div>
    );
  }

  // Show form if no existing song
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
                  maxLength={11}
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
        {loading ? "Saving..." : "Save Song"}
      </button>
    </form>
  );
}
