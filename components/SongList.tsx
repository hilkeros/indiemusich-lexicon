import React, { useState, useEffect } from "react";

function formatPercentage(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "";
  return `${(Number(value) / 100).toFixed(2)} %`;
}

interface Song {
  id: string;
  title: string;
  iswc?: string;
  interestedParties: any[];
}

export default function SongList({ onNewSong, onEditSong, refreshTrigger }: { onNewSong: () => void; onEditSong: (song: Song) => void; refreshTrigger?: number }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSongId, setDeletingSongId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);

  async function handleDelete(song: Song) {
    setDeletingSongId(song.id);
    try {
      const res = await fetch("/api/song", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri: song.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete song");
      }

      // Refresh the list
      const songsRes = await fetch("/api/song");
      const songsData = await songsRes.json();
      setSongs(songsData.songs || []);
      setShowDeleteModal(false);
      setSongToDelete(null);
    } catch (err) {
      console.error("Failed to delete song:", err);
      alert("Failed to delete song");
    } finally {
      setDeletingSongId(null);
    }
  }

  useEffect(() => {
    async function fetchSongs() {
      setLoading(true);
      const res = await fetch("/api/song");
      const data = await res.json();
      // TODO: adapt to new API returning all songs
      setSongs(data.songs || []);
      setLoading(false);
    }
    fetchSongs();
  }, [refreshTrigger]);

  if (loading) return <div>Loading songs...</div>;

  return (
    <div>
      <button onClick={onNewSong} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded">New Song</button>
      <div className="space-y-4">
        {songs.map((song) => (
          <SongCard
            key={song.id}
            song={song}
            onEdit={onEditSong}
            onDelete={(song) => {
              setSongToDelete(song);
              setShowDeleteModal(true);
            }}
            isDeleting={deletingSongId === song.id}
          />
        ))}
      </div>

      {showDeleteModal && songToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 w-full max-w-sm border border-zinc-200 dark:border-zinc-800">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Delete Song?
            </h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              <strong>{songToDelete.title}</strong>
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSongToDelete(null);
                }}
                className="py-2 px-3 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                disabled={deletingSongId !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDelete(songToDelete);
                }}
                className="py-2 px-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={deletingSongId !== null}
              >
                {deletingSongId === songToDelete.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SongCard({ song, onEdit, onDelete, isDeleting }: { song: Song; onEdit: (song: Song) => void; onDelete: (song: Song) => void; isDeleting: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded p-4 bg-white shadow">
      <div className="flex justify-between items-center">
        <div className="flex-1 cursor-pointer" onClick={() => setOpen((v) => !v)}>
          <div className="font-bold">{song.title}</div>
          <div className="text-xs text-gray-500">ISWC: {song.iswc || "-"}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(song);
            }}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2 py-1"
            disabled={isDeleting}
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(song);
            }}
            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 px-2 py-1 disabled:opacity-50"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <span className="cursor-pointer" onClick={() => setOpen((v) => !v)}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div className="mt-2 text-sm">
          <div className="font-semibold mb-2">Interested Parties:</div>
          <div className="overflow-x-auto">
            <table className="min-w-full border text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 border">Name</th>
                  <th className="px-2 py-1 border">Role</th>
                  <th className="px-2 py-1 border">IPI</th>
                  <th className="px-2 py-1 border">Collecting Society</th>
                  <th className="px-2 py-1 border text-right">Performance %</th>
                  <th className="px-2 py-1 border text-right">Mechanical %</th>
                </tr>
              </thead>
              <tbody>
                {song.interestedParties.map((p, i) => (
                  <tr key={i} className="even:bg-gray-50">
                    <td className="px-2 py-1 border">{p.name}</td>
                    <td className="px-2 py-1 border">{p.role || ""}</td>
                    <td className="px-2 py-1 border">{p.ipi || ""}</td>
                    <td className="px-2 py-1 border">{p.collectingSociety || ""}</td>
                    <td className="px-2 py-1 border text-right">{formatPercentage(p.performanceRoyaltiesPercentage)}</td>
                    <td className="px-2 py-1 border text-right">{formatPercentage(p.mechanicalRoyaltiesPercentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
