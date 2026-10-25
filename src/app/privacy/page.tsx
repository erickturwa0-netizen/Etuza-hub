import Link from "next/link";

export const metadata = {
  title: "Privacy Policy – ETUZA HUB",
  description: "Sera ya faragha ya ETUZA HUB",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 prose prose-invert prose-sm">
      <Link href="/" className="text-violet-400 text-sm no-underline">
        ← ETUZA HUB
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">Privacy Policy</h1>
      <p className="text-slate-400 text-sm">Last updated: October 25, 2026</p>

      <p>
        ETUZA HUB ("we", "our", "the Service") operates the website at{" "}
        <a href="https://etuza-hub-v2.vercel.app">etuza-hub-v2.vercel.app</a>.
        This policy explains how we collect, use, and protect your information.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> email address, display name, and (if you
          choose email signup) a password hash. If you sign in with Google, we
          receive your Google account email and name from Google.
        </li>
        <li>
          <strong>Usage data:</strong> pages viewed, content interactions, and
          approximate technical logs needed to run the Service.
        </li>
        <li>
          <strong>Points / activity:</strong> points balance and related logs for
          features inside the app.
        </li>
      </ul>

      <h2>2. How we use information</h2>
      <ul>
        <li>To create and manage your account and sessions</li>
        <li>To provide movies, TV, music, radio, games, and VPN listings</li>
        <li>To improve reliability, security, and user experience</li>
        <li>To contact you about your account if necessary</li>
      </ul>

      <h2>3. Google Sign-In</h2>
      <p>
        When you use Google Sign-In, Google shares your email and basic profile
        with us according to Google&apos;s policies. We use this only to create
        or log into your ETUZA HUB account. We do not sell this data.
      </p>

      <h2>4. Cookies</h2>
      <p>
        We use an HTTP-only session cookie to keep you logged in. You can clear
        cookies in your browser to end the session.
      </p>

      <h2>5. Data sharing</h2>
      <p>
        We do not sell personal data. We may use infrastructure providers (for
        example hosting and database services) that process data only to run the
        Service.
      </p>

      <h2>6. Data retention</h2>
      <p>
        We keep account data while your account is active. You may request
        deletion by contacting the support email below.
      </p>

      <h2>7. Security</h2>
      <p>
        We use reasonable technical measures (HTTPS, hashed passwords, session
        cookies) to protect your account. No method of transmission is 100%
        secure.
      </p>

      <h2>8. Children</h2>
      <p>
        The Service is not directed at children under 13. If you believe a child
        has provided data, contact us to remove it.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about this policy:{" "}
        <a href="mailto:erickturwa0@gmail.com">erickturwa0@gmail.com</a>
      </p>

      <p className="mt-8">
        <Link href="/terms" className="text-violet-400">
          Terms of Service
        </Link>
      </p>
    </main>
  );
}
