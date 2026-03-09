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

export default function SongList({ onNewSong }: { onNewSong: () => void }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  if (loading) return <div>Loading songs...</div>;

  return (
    <div>
      <button onClick={onNewSong} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded">New Song</button>
      <div className="space-y-4">
        {songs.map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
      </div>
    </div>
  );
}

function SongCard({ song }: { song: Song }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded p-4 bg-white shadow">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <div>
          <div className="font-bold">{song.title}</div>
          <div className="text-xs text-gray-500">ISWC: {song.iswc || "-"}</div>
        </div>
        <span>{open ? "▲" : "▼"}</span>
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
