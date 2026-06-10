export interface Guest {
  id: string;
  name: string;
  avatar: string;
  assigned: boolean;
}

export interface Seat {
  row: number;
  col: number;
  guestId: string | null;
  checkedIn: boolean;
}

export interface ConfirmBubbleState {
  visible: boolean;
  guestId: string | null;
  row: number;
  col: number;
}

export interface CheckInModalState {
  visible: boolean;
  row: number;
  col: number;
}

export interface PulsingSeat {
  row: number;
  col: number;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  guests: Guest[];
  seats: Seat[][];
  gridConfig: { rows: number; cols: number };
}
