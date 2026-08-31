"use client";

import { useState, useEffect } from "react";

type SpaceState =
  | { status: "loading" }
  | { status: "error"; message: string; pdsUrl?: string }
  | { status: "not-supported"; pdsUrl: string }
  | { status: "not-exists"; pdsUrl: string }
  | { status: "exists"; allowList: string[]; pdsUrl: string };

export function AudioSpaceManager({ skey }: { skey: string }) {
  const [space, setSpace] = useState<SpaceState>({ status: "loading" });
  const [newClientId, setNewClientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/audio-space?skey=${encodeURIComponent(skey)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          const msg = data.detail
            ? `${data.error}: ${data.detail} (HTTP ${data.httpStatus})`
            : data.error;
          setSpace({ status: "error", message: msg, pdsUrl: data.pdsUrl });
        } else if (data.notSupported) {
          setSpace({ status: "not-supported", pdsUrl: data.pdsUrl });
        } else if (data.exists) {
          setSpace({ status: "exists", allowList: data.allowList ?? [], pdsUrl: data.pdsUrl });
        } else {
          setSpace({ status: "not-exists", pdsUrl: data.pdsUrl });
        }
      })
      .catch(() => setSpace({ status: "error", message: "Could not load space info" }));
  }, [skey]);

  async function createSpace() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/audio-space", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skey, allowList: [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create space");
      const pdsUrl = space.status === "not-exists" ? space.pdsUrl : "";
      setSpace({ status: "exists", allowList: data.allowList ?? [], pdsUrl });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to create space");
    } finally {
      setSaving(false);
    }
  }

  async function updateAllowList(newList: string[]) {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/audio-space", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skey, allowList: newList }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      const pdsUrl = space.status === "exists" ? space.pdsUrl : "";
      setSpace({ status: "exists", allowList: newList, pdsUrl });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  function addEntry() {
    const trimmed = newClientId.trim();
    if (!trimmed || space.status !== "exists") return;
    if (space.allowList.includes(trimmed)) {
      setSaveError("This app is already on the list.");
      return;
    }
    setSaveError(null);
    setNewClientId("");
    updateAllowList([...space.allowList, trimmed]);
  }

  function removeEntry(clientId: string) {
    if (space.status !== "exists") return;
    updateAllowList(space.allowList.filter((id) => id !== clientId));
  }

  if (space.status === "loading") {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (space.status === "error") {
    return (
      <div className="space-y-1">
        <p className="text-sm text-red-500">{space.message}</p>
        {space.pdsUrl && (
          <p className="text-xs text-zinc-500">PDS: {space.pdsUrl}</p>
        )}
      </div>
    );
  }

  if (space.status === "not-supported") {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Your PDS does not support spaces yet.
      </p>
    );
  }

  if (space.status === "not-exists") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No audio library for this release yet.
        </p>
        {saveError && <p className="text-sm text-red-500">{saveError}</p>}
        <button
          onClick={createSpace}
          disabled={saving}
          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create audio library"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          App access
        </p>
        {space.allowList.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
            No apps have access yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {space.allowList.map((clientId) => (
              <li
                key={clientId}
                className="flex items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2"
              >
                <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 break-all min-w-0">
                  {clientId}
                </span>
                <button
                  onClick={() => removeEntry(clientId)}
                  disabled={saving}
                  className="shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Add app
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://example.com/oauth-client-metadata.json"
            value={newClientId}
            onChange={(e) => {
              setNewClientId(e.target.value);
              setSaveError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && addEntry()}
            disabled={saving}
            className="flex-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 disabled:opacity-50 min-w-0"
          />
          <button
            onClick={addEntry}
            disabled={saving || !newClientId.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0"
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
        {saveError && <p className="text-xs text-red-500">{saveError}</p>}
      </div>
    </div>
  );
}
