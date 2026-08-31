"use client";

import { useRef, useState } from "react";

interface AudioFileRef {
  ownerDid: string;
  spaceSkey: string;
  rkey: string;
  mimeType?: string;
}

interface Release {
  id: string;
  title: string;
}

export function RecordingAudioUpload({
  recordingUri,
  initialAudioFile,
}: {
  recordingUri: string;
  initialAudioFile?: AudioFileRef;
}) {
  const [audioFile, setAudioFile] = useState<AudioFileRef | undefined>(initialAudioFile);
  const [showUpload, setShowUpload] = useState(false);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [spaceSkey, setSpaceSkey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function openUpload() {
    setShowUpload(true);
    setLoadingReleases(true);
    try {
      const res = await fetch("/api/release");
      const data = await res.json();
      const list: Release[] = (data.releases ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
      }));
      setReleases(list);
      if (list.length === 1) setSpaceSkey(list[0].id.split("/").pop()!);
    } catch {
      setError("Failed to load releases");
    } finally {
      setLoadingReleases(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !spaceSkey) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("spaceSkey", spaceSkey);
    formData.set("recordingUri", recordingUri);
    formData.set("file", file);

    try {
      const res = await fetch("/api/audio-file", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Upload failed");
      setAudioFile({ ownerDid: "", spaceSkey, rkey: data.rkey, mimeType: data.mimeType });
      setShowUpload(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (audioFile) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <span>✓ Audio uploaded</span>
        {audioFile.mimeType && <span className="text-zinc-400">({audioFile.mimeType})</span>}
      </div>
    );
  }

  if (!showUpload) {
    return (
      <button
        type="button"
        onClick={openUpload}
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
      >
        Upload audio
      </button>
    );
  }

  return (
    <div className="space-y-2 mt-1">
      {loadingReleases ? (
        <p className="text-xs text-zinc-500">Loading releases…</p>
      ) : releases.length === 0 ? (
        <p className="text-xs text-zinc-500">No releases found. Create a release first to set up an audio library.</p>
      ) : (
        <>
          {releases.length > 1 && (
            <div>
              <label className="text-xs text-zinc-600 dark:text-zinc-400">Release</label>
              <select
                value={spaceSkey}
                onChange={(e) => setSpaceSkey(e.target.value)}
                className="block w-full mt-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900"
              >
                <option value="">Select a release…</option>
                {releases.map((r) => (
                  <option key={r.id} value={r.id.split("/").pop()}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className={`inline-flex items-center cursor-pointer ${!spaceSkey ? "opacity-50 pointer-events-none" : ""}`}>
            <span className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
              {uploading ? "Uploading…" : "Choose file"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/flac,audio/mpeg,audio/wav,audio/aac,audio/ogg"
              className="sr-only"
              disabled={uploading || !spaceSkey}
              onChange={handleUpload}
            />
          </label>
          <button
            type="button"
            onClick={() => setShowUpload(false)}
            className="text-xs text-zinc-500 hover:text-zinc-700 ml-2"
          >
            Cancel
          </button>
        </>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
