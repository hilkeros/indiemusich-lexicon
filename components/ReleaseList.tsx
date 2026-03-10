"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Artist {
  name: string;
  did?: string;
}

interface Release {
  id: string;
  title: string;
  artists: Artist[];
  gtin?: string;
  releaseDate?: string;
  recordings?: any[];
}

interface RecordingSummary {
  title?: string;
  isrc?: string;
  duration?: number;
}

export function ReleaseList({
  refreshTrigger,
  onEditRelease,
}: {
  refreshTrigger?: number;
  onEditRelease?: (release: Release) => void;
}) {
  const router = useRouter();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recordingByUri, setRecordingByUri] = useState<Record<string, RecordingSummary>>({});

  useEffect(() => {
    fetchReleases();
  }, [refreshTrigger]);

  async function fetchReleases() {
    try {
      const [releaseRes, recordingRes] = await Promise.all([
        fetch("/api/release"),
        fetch("/api/recording"),
      ]);

      if (!releaseRes.ok) throw new Error("Failed to fetch releases");

      const releaseData = await releaseRes.json();
      setReleases(releaseData.releases || []);

      if (recordingRes.ok) {
        const recordingData = await recordingRes.json();
        const recordingMap: Record<string, RecordingSummary> = {};
        const recordings = Array.isArray(recordingData.recordings)
          ? recordingData.recordings
          : [];

        recordings.forEach((recording: any) => {
          if (typeof recording?.id === "string") {
            recordingMap[recording.id] = {
              title: typeof recording?.title === "string" ? recording.title : undefined,
              isrc: typeof recording?.isrc === "string" ? recording.isrc : undefined,
              duration: typeof recording?.duration === "number" ? recording.duration : undefined,
            };
          }
        });

        setRecordingByUri(recordingMap);
      }
    } catch (err) {
      console.error("Failed to fetch releases:", err);
    }
  }

  const formatDuration = (seconds?: number): string => {
    if (seconds == null || Number.isNaN(seconds)) return "";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getRecordingDetails = (recording: any): RecordingSummary => {
    if (typeof recording === "string") {
      return {
        title: recordingByUri[recording]?.title || recording,
        isrc: recordingByUri[recording]?.isrc,
        duration: recordingByUri[recording]?.duration,
      };
    }

    if (recording && typeof recording.ref === "string") {
      return {
        title:
          (typeof recording?.title === "string" && recording.title.trim())
            ? recording.title
            : (recordingByUri[recording.ref]?.title || recording.ref),
        isrc:
          typeof recording?.isrc === "string"
            ? recording.isrc
            : recordingByUri[recording.ref]?.isrc,
        duration:
          typeof recording?.duration === "number"
            ? recording.duration
            : recordingByUri[recording.ref]?.duration,
      };
    }

    if (recording && typeof recording === "object") {
      return {
        title: typeof recording?.title === "string" ? recording.title : "Unknown",
        isrc: typeof recording?.isrc === "string" ? recording.isrc : undefined,
        duration: typeof recording?.duration === "number" ? recording.duration : undefined,
      };
    }

    return { title: "Unknown" };
  };

  const formatReleaseDate = (value: string): string => {
    const datePart = value.split("T")[0];
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);

    if (!match) {
      return value;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    });
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/release", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri: deletingId }),
      });

      if (!res.ok) throw new Error("Failed to delete release");

      setReleases((prev) => prev.filter((r) => r.id !== deletingId));
      setShowDeleteModal(false);
      setDeletingId(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to delete release:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {releases.length === 0 ? (
        <p className="text-sm text-zinc-500">No releases yet.</p>
      ) : (
        releases.map((release) => {
          const isExpanded = expandedId === release.id;

          return (
            <div
              key={release.id}
              className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : release.id)}
                >
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {release.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {release.artists.map((a) => a.name).join(", ")}
                  </p>
                  {release.gtin && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">GTIN: {release.gtin}</p>
                  )}
                  {release.releaseDate && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Released: {formatReleaseDate(release.releaseDate)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onEditRelease) {
                        onEditRelease(release);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setDeletingId(release.id);
                      setShowDeleteModal(true);
                    }}
                    className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                  {release.recordings && release.recordings.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Recordings ({release.recordings.length})
                      </p>
                      <ul className="mt-2 space-y-2">
                        {release.recordings.map((rec, idx) => {
                          const details = getRecordingDetails(rec);
                          const itemKey =
                            (typeof rec === "string" && rec) ||
                            (typeof rec?.ref === "string" && rec.ref) ||
                            (typeof rec?.id === "string" && rec.id) ||
                            (typeof details.title === "string" && details.title) ||
                            `recording-${idx}`;
                          return (
                            <li
                              key={itemKey}
                              className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800/40"
                            >
                              <div className="font-medium text-zinc-700 dark:text-zinc-200">{details.title || "Unknown"}</div>
                              <div className="text-zinc-500 dark:text-zinc-400">
                                ISRC: {details.isrc || "-"} | Duration: {formatDuration(details.duration) || "-"}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {showDeleteModal && deletingId === release.id && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 p-4 z-50">
                  <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900">
                    <p className="mb-6 text-sm text-zinc-900 dark:text-zinc-100">
                      Are you sure you want to delete "{release.title}"?
                    </p>
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          setShowDeleteModal(false);
                          setDeletingId(null);
                        }}
                        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {loading ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
