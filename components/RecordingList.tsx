"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Artist {
  name: string;
  did?: string;
}

interface MasterOwnerInfo {
  name?: string;
  did?: string;
}

interface Recording {
  id: string;
  title: string;
  song?: any;
  artists: Artist[];
  isrc?: string;
  masterOwner?: MasterOwnerInfo;
  duration?: number;
}

function formatDuration(seconds?: number): string {
  if (seconds == null || Number.isNaN(seconds)) return "";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function RecordingList({
  refreshTrigger,
  onEditRecording,
}: {
  refreshTrigger?: number;
  onEditRecording?: (recording: Recording) => void;
}) {
  const router = useRouter();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecordings();
  }, [refreshTrigger]);

  async function fetchRecordings() {
    try {
      const res = await fetch("/api/recording");
      if (!res.ok) throw new Error("Failed to fetch recordings");
      const data = await res.json();
      setRecordings(data.recordings || []);
    } catch (err) {
      console.error("Failed to fetch recordings:", err);
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/recording", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri: deletingId }),
      });

      if (!res.ok) throw new Error("Failed to delete recording");

      setRecordings((prev) => prev.filter((r) => r.id !== deletingId));
      setShowDeleteModal(false);
      setDeletingId(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to delete recording:", err);
    } finally {
      setLoading(false);
    }
  };

  if (recordings.length === 0) {
    return <p className="text-zinc-500 dark:text-zinc-400">No recordings yet.</p>;
  }

  return (
    <div className="space-y-3">
      {recordings.map((recording) => (
        <div
          key={recording.id}
          className="border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 bg-white dark:bg-zinc-900"
        >
          <div
            className="flex items-center justify-between"
            onClick={() => setExpandedId(expandedId === recording.id ? null : recording.id)}
          >
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{recording.title}</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {recording.artists.map((a) => a.name).join(", ")}
              </p>
            </div>
            <button
              type="button"
              className="text-xl text-zinc-600 dark:text-zinc-400"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedId(expandedId === recording.id ? null : recording.id);
              }}
            >
              {expandedId === recording.id ? "▲" : "▼"}
            </button>
          </div>

          {expandedId === recording.id && (
            <div className="mt-4 space-y-3 border-t border-zinc-300 dark:border-zinc-700 pt-3">
              {recording.song && (
                <div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">Song Ref</p>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">{recording.song.ref}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Artists</p>
                <div className="space-y-1">
                  {recording.artists.map((artist, idx) => (
                    <div key={idx} className="text-sm text-zinc-900 dark:text-zinc-100">
                      <p>{artist.name}</p>
                      {artist.did && <p className="text-xs text-zinc-500 dark:text-zinc-500">{artist.did}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {recording.isrc && (
                <div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">ISRC</p>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">{recording.isrc}</p>
                </div>
              )}

              {recording.masterOwner && (
                <div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">Master Owner</p>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">{recording.masterOwner.name || recording.masterOwner.did}</p>
                </div>
              )}

              {recording.duration != null && (
                <div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">Duration</p>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">{formatDuration(recording.duration)}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditRecording?.(recording);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  disabled={loading}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(recording.id);
                    setShowDeleteModal(true);
                  }}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showDeleteModal && deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-sm">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Delete Recording?</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Are you sure you want to delete this recording? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingId(null);
                }}
                className="flex-1 py-2 px-4 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
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
