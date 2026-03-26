import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/LoginForm";
import { LogoutButton } from "@/components/LogoutButton";
import { ArtistForm } from "@/components/ArtistForm";
import { PublishingOwnerForm } from "@/components/PublishingOwnerForm";
import { ProfileTabs } from "@/components/ProfileTabs";
import { getActorProfile } from "@/lib/atproto-actors";

export default async function Home() {
  const session = await getSession();
  const isLoggedIn = !!session;
  const viewerProfile = session ? await getActorProfile(session.did) : null;
  const viewerHandle = viewerProfile?.handle;
  const viewerDisplayName = viewerProfile?.displayName;
  const viewerLabel = viewerDisplayName || viewerHandle || session?.did;
  const showDidLine = !!session && viewerLabel !== session.did;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            indiemusi.ch
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage your music catalogue in the Atmosphere
          </p>
        </div>

        <div
          className={`mx-auto max-w-xl bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 ${
            isLoggedIn
              ? "p-6 sm:p-8"
              : "p-5 sm:p-7 shadow-sm"
          }`}
        >
          {session ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="min-w-0">
                  {viewerHandle ? (
                    <p className="truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
                      @{viewerHandle}
                    </p>
                  ) : (
                    <p className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {viewerLabel}
                    </p>
                  )}
                  {viewerDisplayName && (
                    <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                      {viewerDisplayName}
                    </p>
                  )}
                  {showDidLine && (
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {session.did}
                    </p>
                  )}
                </div>
                <LogoutButton />
              </div>
              <ProfileTabs />
            </div>
          ) : (
            <LoginForm />
          )}
        </div>

        {!session && (
          <div className="mt-12 mx-auto max-w-4xl">
            <video
              controls
              className="w-full rounded-lg shadow-lg dark:shadow-zinc-900/50"
            >
              <source src="/alpha%20indiemusi.ch%20demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>
    </div>
  );
}
