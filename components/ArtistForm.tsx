"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ArtistProfile {
  name: string;
  createdAt: string;
}

export function ArtistForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingArtist, setExistingArtist] = useState<ArtistProfile | null>(null);
  const [isLoadingArtist, setIsLoadingArtist] = useState(true);

  // Fetch existing artist profile on mount
  useEffect(() => {
    async function fetchArtist() {
      try {
        const res = await fetch("/api/artist");
        if (!res.ok) {
          throw new Error("Failed to fetch artist");
        }
        const data = await res.json();
        if (data.artist) {
          setExistingArtist(data.artist);
        }
      } catch (err) {
        console.error("Failed to fetch artist:", err);
      } finally {
        setIsLoadingArtist(false);
      }
    }

    fetchArtist();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/artist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        throw new Error("Failed to update artist");
      }

      const data = await res.json();
      if (data.artist) {
        setExistingArtist(data.artist);
      }

      router.refresh();
    } catch (err) {
      console.error("Failed to update artist:", err);
    //   setSelected(currentStatus ?? null);
    } finally {
      setLoading(false);
    }
  }

  // Show loading state while fetching artist
  if (isLoadingArtist) {
    return <div className="text-zinc-500">Loading artist profile...</div>;
  }

  // Show existing artist profile
  if (existingArtist) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            Artist Profile Found
          </h3>
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>Name:</strong> {existingArtist.name}
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            Created: {new Date(existingArtist.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }

  // Show form if no existing artist
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Artist name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          disabled={loading}
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading || !name}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Artist"}
      </button>
    </form>
  );
}
