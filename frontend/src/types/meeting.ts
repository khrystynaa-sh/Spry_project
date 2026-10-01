export interface Meeting {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  attendee_count: number;
}

export type MeetingCreate = Omit<Meeting, "id">;
