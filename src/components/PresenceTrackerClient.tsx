"use client";

import PresenceTracker from "@/components/PresenceTracker";

export default function PresenceTrackerClient({
  section,
  title,
}: {
  section: string;
  title?: string;
}) {
  return <PresenceTracker section={section} title={title} />;
}
