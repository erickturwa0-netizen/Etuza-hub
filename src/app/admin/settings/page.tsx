export const metadata = { title: "Settings – ETUZA HUB Admin" };

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-sm text-slate-500 mb-8">Platform configuration</p>

      <div className="glass-card p-5 sm:p-6 space-y-6 max-w-xl">
        <div>
          <h2 className="font-semibold mb-1">Database</h2>
          <p className="text-sm text-slate-500 mb-3">
            Connected via Prisma Postgres (Accelerate). Env: <code className="text-violet-400">DATABASE_URL</code>
          </p>
          <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            ● Connected
          </div>
        </div>

        <div className="border-t border-white/5 pt-6">
          <h2 className="font-semibold mb-1">Site</h2>
          <p className="text-sm text-slate-500">
            Production:{" "}
            <a
              href="https://etuza-hub-v2.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="text-violet-400 hover:underline"
            >
              etuza-hub-v2.vercel.app
            </a>
          </p>
        </div>

        <div className="border-t border-white/5 pt-6">
          <h2 className="font-semibold mb-1">Coming soon</h2>
          <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
            <li>Auth (login / admin roles)</li>
            <li>Real Prisma CRUD for content</li>
            <li>Payments integration</li>
            <li>Cover image upload</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
