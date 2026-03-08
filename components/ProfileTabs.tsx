"use client";

import { useState } from "react";
import { ArtistForm } from "@/components/ArtistForm";
import { PublishingOwnerForm } from "@/components/PublishingOwnerForm";

export function ProfileTabs() {
  const [activeTab, setActiveTab] = useState<"artist" | "owner">("artist");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("artist")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "artist"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Artist
        </button>
        <button
          onClick={() => setActiveTab("owner")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "owner"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Publishing Owner
        </button>
      </div>

      <div>
        {activeTab === "artist" && <ArtistForm />}
        {activeTab === "owner" && <PublishingOwnerForm />}
      </div>
    </div>
  );
}
