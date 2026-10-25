import Link from "next/link";

export const metadata = {
  title: "Terms of Service – ETUZA HUB",
  description: "Masharti ya matumizi ya ETUZA HUB",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 prose prose-invert prose-sm">
      <Link href="/" className="text-violet-400 text-sm no-underline">
        ← ETUZA HUB
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">Terms of Service</h1>
      <p className="text-slate-400 text-sm">Last updated: October 25, 2026</p>

      <p>
        By using ETUZA HUB at{" "}
        <a href="https://etuza-hub-v2.vercel.app">etuza-hub-v2.vercel.app</a>
        {" "}("the Service"), you agree to these terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        ETUZA HUB provides a web hub for browsing and accessing links related to
        movies, TV channels, drama, music, radio, games, and VPN configurations.
        Features may change or be discontinued at any time.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must provide accurate information when creating an account.</li>
        <li>You are responsible for activity under your account.</li>
        <li>
          We may suspend accounts that abuse the Service, attempt to break
          security, or violate these terms.
        </li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Attack, scrape excessively, or disrupt the Service</li>
        <li>Upload malware or attempt unauthorized access</li>
        <li>Use the Service for unlawful purposes in your jurisdiction</li>
        <li>Misrepresent identity or abuse invitation / points systems</li>
      </ul>

      <h2>4. Third-party content &amp; links</h2>
      <p>
        The Service may list or embed links, streams, or files hosted by third
        parties. We do not control those sources. Availability, legality, and
        quality of third-party content are the responsibility of those providers
        and of you as the user under local law.
      </p>

      <h2>5. Points</h2>
      <p>
        Points (if any) are a feature of the Service only. They have no cash
        value, are non-transferable outside the Service, and may be adjusted or
        removed.
      </p>

      <h2>6. Disclaimer</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind.
        We are not liable for downtime, data loss, or damages arising from use of
        the Service or third-party links to the fullest extent permitted by law.
      </p>

      <h2>7. Changes</h2>
      <p>
        We may update these terms. Continued use after changes means you accept
        the updated terms. The date above shows the latest revision.
      </p>

      <h2>8. Contact</h2>
      <p>
        <a href="mailto:erickturwa0@gmail.com">erickturwa0@gmail.com</a>
      </p>

      <p className="mt-8">
        <Link href="/privacy" className="text-violet-400">
          Privacy Policy
        </Link>
      </p>
    </main>
  );
}
