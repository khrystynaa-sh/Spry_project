import type { Meeting, MeetingCreate } from "@/types/meeting";

const BASE = "/api/meetings";

interface ValidationDetail {
  loc: (string | number)[];
  msg: string;
}

export async function listMeetings(): Promise<Meeting[]> {
  const response = await fetch(BASE);
  if (!response.ok) throw new Error(`Could not load meetings (status ${response.status}).`);
  return response.json();
}

export async function createMeeting(input: MeetingCreate): Promise<Meeting> {
  const response = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status === 422) {
    const body = await response.json();
    const details: ValidationDetail[] = Array.isArray(body.detail) ? body.detail : [];
    const message = details
      .map((d) => (d.loc.length > 1 ? `${d.loc.slice(1).join(".")}: ${d.msg}` : d.msg))
      .join("; ");
    throw new Error(message || "The meeting was rejected as invalid.");
  }
  if (!response.ok) throw new Error(`Could not save the meeting (status ${response.status}).`);
  return response.json();
}
