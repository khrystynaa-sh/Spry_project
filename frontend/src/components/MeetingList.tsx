import { MeetingCard } from "@/components/MeetingCard";
import type { Meeting } from "@/types/meeting";

interface Props {
  meetings: Meeting[];
  loading: boolean;
  error: string | null;
}

export function MeetingList({ meetings, loading, error }: Props) {
  if (loading) return <p className="text-muted-foreground">Loading meetings…</p>;
  if (error)
    return (
      <p role="alert" className="text-destructive">
        {error} Reload the page to try again.
      </p>
    );
  if (meetings.length === 0) {
    return (
      <p className="text-muted-foreground">No meetings yet. Add your first one using the form.</p>
    );
  }
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <MeetingCard meeting={meeting} />
        </li>
      ))}
    </ul>
  );
}
