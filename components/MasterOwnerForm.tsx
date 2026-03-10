"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MasterOwnerProfile {
  name: string;
}

export function MasterOwnerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingOwner, setExistingOwner] = useState<MasterOwnerProfile | null>(null);
  const [existingOwnerUri, setExistingOwnerUri] = useState<string | null>(null);
  const [isLoadingOwner, setIsLoadingOwner] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch existing master owner profile on mount
  useEffect(() => {
    async function fetchOwner() {
      try {
        const res = await fetch("/api/master-owner");
        if (!res.ok) {
          throw new Error("Failed to fetch master owner");
        }
        const data = await res.json();
        if (data.masterOwner) {
          setExistingOwner(data.masterOwner);
          setExistingOwnerUri(typeof data.uri === "string" ? data.uri : null);
        }
      } catch (err) {
        console.error("Failed to fetch master owner:", err);
      } finally {
        setIsLoadingOwner(false);
      }
    }

    fetchOwner();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch("/api/master-owner", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { uri: existingOwnerUri, name } : { name }),
      });

      if (!res.ok) {
        throw new Error("Failed to update master owner");
      }

      const data = await res.json();
      if (data.masterOwner) {
        setExistingOwner(data.masterOwner);
        setExistingOwnerUri(data.uri || existingOwnerUri);
      }

      setIsEditing(false);
      setName("");

      router.refresh();
    } catch (err) {
      console.error("Failed to update master owner:", err);
      setError((err as Error).message || "Failed to save master owner");
    } finally {
      setLoading(false);
    }
  }

  // Show loading state while fetching owner
  if (isLoadingOwner) {
    return <div className="text-zinc-500">Loading master owner profile...</div>;
  }

  // Show existing owner profile
  if (existingOwner && !isEditing) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            Master Owner Profile Found
          </h3>
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>Name:</strong> {existingOwner.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setName(existingOwner.name || "");
            setError(null);
            setIsEditing(true);
          }}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Edit Master Owner
        </button>
      </div>
    );
  }

  // Show form if no existing owner
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Master owner name
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
        {loading ? "Saving..." : isEditing ? "Update Master Owner" : "Save Master Owner"}
      </button>

      {isEditing && (
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setName("");
            setError(null);
          }}
          className="w-full py-2 px-4 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      )}
    </form>
  );
}
