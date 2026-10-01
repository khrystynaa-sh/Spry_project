import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Meeting } from "@/types/meeting";

const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function MeetingCard({ meeting }: { meeting: Meeting }) {
  const start = new Date(meeting.starts_at);
  const end = new Date(meeting.ends_at);
  const sameDay = start.toDateString() === end.toDateString();
  const when = sameDay
    ? `${dayFormat.format(start)}, ${timeFormat.format(start)} to ${timeFormat.format(end)}`
    : `${dayFormat.format(start)} ${timeFormat.format(start)} to ${dayFormat.format(end)} ${timeFormat.format(end)}`;

  return (
    <Card className="rounded-2xl border-2 border-brand-blue bg-brand-blue-soft text-center shadow-none">
      <CardHeader className="items-center">
        <CardTitle className="text-xl font-bold">{meeting.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="italic text-muted-foreground">{when}</p>
        <p className="font-bold text-brand-blue">
          {meeting.attendee_count} {meeting.attendee_count === 1 ? "attendee" : "attendees"}
        </p>
      </CardContent>
    </Card>
  );
}
