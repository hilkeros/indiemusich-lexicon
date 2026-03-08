import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/LoginForm";
import { LogoutButton } from "@/components/LogoutButton";
import { ArtistForm } from "@/components/ArtistForm";

export default async function Home() {
  const session = await getSession();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="w-full max-w-md mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            indiemusi.ch
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage your music catalogue in the Atmosphere
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          {session ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Signed in
                </p>
                <LogoutButton />
              </div>
              <ArtistForm />
            </div>
          ) : (
            <LoginForm />
          )}
        </div>
      </main>
    </div>
  );
}
