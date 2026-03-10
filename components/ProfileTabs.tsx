"use client";

import { useState } from "react";
import { ArtistForm } from "@/components/ArtistForm";
import { PublishingOwnerForm } from "@/components/PublishingOwnerForm";
import { MasterOwnerForm } from "@/components/MasterOwnerForm";
import { SongForm } from "@/components/SongForm";
import SongList from "@/components/SongList";
import { RecordingForm } from "@/components/RecordingForm";
import { RecordingList } from "@/components/RecordingList";

interface Song {
  id: string;
  title: string;
  iswc?: string;
  interestedParties: any[];
}

interface Recording {
  id: string;
  title: string;
  song?: any;
  artists: any[];
  isrc?: string;
  masterOwner?: any;
  duration?: number;
}

export function ProfileTabs() {
  const [activeTab, setActiveTab] = useState<"artist" | "owner" | "master" | "song" | "recording">("artist");
  const [showSongForm, setShowSongForm] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [songListRefresh, setSongListRefresh] = useState(0);
  const [showRecordingForm, setShowRecordingForm] = useState(false);
  const [editingRecording, setEditingRecording] = useState<Recording | null>(null);
  const [recordingListRefresh, setRecordingListRefresh] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab("artist")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "artist"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Artist
        </button>
        <button
          onClick={() => setActiveTab("owner")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "owner"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Publishing Owner
        </button>
        <button
          onClick={() => setActiveTab("master")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "master"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Master Owner
        </button>
        <button
          onClick={() => setActiveTab("song")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "song"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Songs
        </button>
        <button
          onClick={() => setActiveTab("recording")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "recording"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Recordings
        </button>
      </div>

      <div>
        {activeTab === "artist" && <ArtistForm />}
        {activeTab === "owner" && <PublishingOwnerForm />}
        {activeTab === "master" && <MasterOwnerForm />}
        {activeTab === "song" && (
          <>
            <SongList 
              onNewSong={() => {
                setEditingSong(null);
                setShowSongForm(true);
              }}
              onEditSong={(song) => {
                setEditingSong(song);
                setShowSongForm(true);
              }}
              refreshTrigger={songListRefresh}
            />
            {showSongForm && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto relative">
                  <button
                    className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-900"
                    onClick={() => {
                      setShowSongForm(false);
                      setEditingSong(null);
                    }}
                  >
                    ✕
                  </button>
                  <SongForm 
                    editingSong={editingSong || undefined}
                    onSongSaved={() => {
                      setSongListRefresh(prev => prev + 1);
                      setShowSongForm(false);
                      setEditingSong(null);
                    }} 
                  />
                </div>
              </div>
            )}
          </>
        )}
        {activeTab === "recording" && (
          <>
            <div className="mb-4">
              <button
                onClick={() => {
                  setEditingRecording(null);
                  setShowRecordingForm(true);
                }}
                className="inline-flex py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + New Recording
              </button>
            </div>
            <RecordingList 
              onEditRecording={(recording) => {
                setEditingRecording(recording);
                setShowRecordingForm(true);
              }}
              refreshTrigger={recordingListRefresh}
            />
            {showRecordingForm && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto relative">
                  <button
                    className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-900"
                    onClick={() => {
                      setShowRecordingForm(false);
                      setEditingRecording(null);
                    }}
                  >
                    ✕
                  </button>
                  <RecordingForm 
                    editingRecording={editingRecording || undefined}
                    onRecordingSaved={() => {
                      setRecordingListRefresh(prev => prev + 1);
                      setShowRecordingForm(false);
                      setEditingRecording(null);
                    }} 
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
