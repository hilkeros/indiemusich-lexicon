"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isValidIPI, IPI_ERROR_MESSAGE, cleanIPI } from "@/lib/validation";

interface PublishingOwnerProfile {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  ipi?: string;
  collectingSociety?: string;
}

export function PublishingOwnerForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [ipi, setIpi] = useState("");
  const [collectingSociety, setCollectingSociety] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingOwner, setExistingOwner] = useState<PublishingOwnerProfile | null>(null);
  const [existingOwnerUri, setExistingOwnerUri] = useState<string | null>(null);
  const [isLoadingOwner, setIsLoadingOwner] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch existing publishing owner profile on mount
  useEffect(() => {
    async function fetchOwner() {
      try {
        const res = await fetch("/api/publishing-owner");
        if (!res.ok) {
          throw new Error("Failed to fetch publishing owner");
        }
        const data = await res.json();
        if (data.publishingOwner) {
          setExistingOwner(data.publishingOwner);
          setExistingOwnerUri(typeof data.uri === "string" ? data.uri : null);
        }
      } catch (err) {
        console.error("Failed to fetch publishing owner:", err);
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

    // Validate IPI format before submitting
    if (!isValidIPI(ipi)) {
      setError(IPI_ERROR_MESSAGE);
      setLoading(false);
      return;
    }

    try {
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch("/api/publishing-owner", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditing ? { uri: existingOwnerUri } : {}),
          firstName,
          lastName,
          companyName,
          ipi: cleanIPI(ipi),
          collectingSociety,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update publishing owner");
      }

      const data = await res.json();
      if (data.publishingOwner) {
        setExistingOwner(data.publishingOwner);
        setExistingOwnerUri(data.uri || existingOwnerUri);
      }

      setIsEditing(false);
      setFirstName("");
      setLastName("");
      setCompanyName("");
      setIpi("");
      setCollectingSociety("");

      router.refresh();
    } catch (err) {
      console.error("Failed to update publishing owner:", err);
      setError((err as Error).message || "Failed to save publishing owner information");
    } finally {
      setLoading(false);
    }
  }

  // Show loading state while fetching owner
  if (isLoadingOwner) {
    return <div className="text-zinc-500">Loading publishing owner profile...</div>;
  }

  // Show existing owner profile
  if (existingOwner && !isEditing) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            Publishing Owner Profile Found
          </h3>
          <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
            {existingOwner.firstName && <p><strong>First Name:</strong> {existingOwner.firstName}</p>}
            {existingOwner.lastName && <p><strong>Last Name:</strong> {existingOwner.lastName}</p>}
            {existingOwner.companyName && <p><strong>Company:</strong> {existingOwner.companyName}</p>}
            {existingOwner.ipi && <p><strong>IPI:</strong> {existingOwner.ipi}</p>}
            {existingOwner.collectingSociety && <p><strong>Collecting Society:</strong> {existingOwner.collectingSociety}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFirstName(existingOwner.firstName || "");
            setLastName(existingOwner.lastName || "");
            setCompanyName(existingOwner.companyName || "");
            setIpi(existingOwner.ipi || "");
            setCollectingSociety(existingOwner.collectingSociety || "");
            setError(null);
            setIsEditing(true);
          }}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Edit Publishing Owner
        </button>
      </div>
    );
  }

  // Show form if no existing owner
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            First Name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Last Name
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Company Name
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            IPI Number
          </label>
          <input
            type="text"
            value={ipi}
            onChange={(e) => setIpi(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 ${
              ipi && !/^\d{0,11}(\s*\d{0,11})*$/.test(ipi.replace(/\s/g, ''))
                ? "border-red-300 dark:border-red-700"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
            disabled={loading}
            placeholder="11 digits"
          />
          {ipi && !/^\d{11}$/.test(ipi.replace(/\s/g, '')) && (
            <p className="text-red-500 text-xs mt-1">
              Must be exactly 11 digits
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Collecting Society
          </label>
          <input
            type="text"
            value={collectingSociety}
            onChange={(e) => setCollectingSociety(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            disabled={loading}
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading || (!firstName && !lastName && !companyName) || (ipi && !/^\d{11}$/.test(ipi.replace(/\s/g, '')))}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : isEditing ? "Update Publishing Owner" : "Save Publishing Owner"}
      </button>

      {isEditing && (
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setFirstName("");
            setLastName("");
            setCompanyName("");
            setIpi("");
            setCollectingSociety("");
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
