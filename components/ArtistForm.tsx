"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ArtistProfile {
  id?: string;
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
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function handleDelete() {
    if (!existingArtist?.id) {
      setError("Missing artist URI");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/artist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri: existingArtist.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete artist");
      }

      setExistingArtist(null);
      setShowDeleteModal(false);
      setIsEditing(false);
      setName("");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete artist:", err);
      setError((err as Error).message || "Failed to delete artist");
    } finally {
      setLoading(false);
    }
  }

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
          setExistingArtist({ id: data.uri, ...data.artist });
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
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch("/api/artist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? {
                uri: existingArtist?.id,
                name,
                createdAt: existingArtist?.createdAt,
              }
            : { name }
        ),
      });

      if (!res.ok) {
        throw new Error("Failed to update artist");
      }

      const data = await res.json();
      if (data.artist) {
        setExistingArtist({ id: data.uri || existingArtist?.id, ...data.artist });
      }

      setIsEditing(false);
      setName("");

      router.refresh();
    } catch (err) {
      console.error("Failed to update artist:", err);
      setError((err as Error).message || "Failed to save artist");
    } finally {
      setLoading(false);
    }
  }

  // Show loading state while fetching artist
  if (isLoadingArtist) {
    return <div className="text-zinc-500">Loading artist profile...</div>;
  }

  // Show existing artist profile
  if (existingArtist && !isEditing) {
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setName(existingArtist.name || "");
              setError(null);
              setIsEditing(true);
            }}
            className="inline-flex py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            Edit Artist
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Artist"}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 w-full max-w-sm border border-zinc-200 dark:border-zinc-800">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Delete Artist?
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="py-2 px-3 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleDelete();
                  }}
                  className="py-2 px-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
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

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading || !name}
          className="inline-flex py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : isEditing ? "Update Artist" : "Save Artist"}
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setName("");
              setError(null);
            }}
            className="inline-flex py-2 px-4 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
