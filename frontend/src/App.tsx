import { useEffect, useState } from "react";
import { listMeetings } from "@/api/meetings";
import { MeetingForm } from "@/components/MeetingForm";
import { MeetingList } from "@/components/MeetingList";
import type { Meeting } from "@/types/meeting";

const byStart = (a: Meeting, b: Meeting) =>
  new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime() || a.id - b.id;

export default function App() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMeetings()
      .then(setMeetings)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (meeting: Meeting) =>
    setMeetings((current) => [...current, meeting].sort(byStart));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Spry</h1>
        <p className="text-muted-foreground">Meeting analytics for teams</p>
      </header>
      <div className="grid items-start gap-6 md:grid-cols-[22rem_1fr]">
        <section className="rounded-2xl border-2 border-dashed border-brand-green bg-brand-green-soft p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand-green">
            New meeting
          </h2>
          <MeetingForm onCreated={handleCreated} />
        </section>
        <section className="rounded-2xl border-2 border-dashed border-brand-blue bg-brand-blue-soft/40 p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand-blue">
            Meetings
          </h2>
          <MeetingList meetings={meetings} loading={loading} error={error} />
        </section>
      </div>
    </main>
  );
}
