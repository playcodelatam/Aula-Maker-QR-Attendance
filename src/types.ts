export interface Student {
  id: string;
  name: string;
  studentId: string; // Unique identifier for QR
  email?: string;
  group?: string;
  createdAt: number;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  timestamp: number;
  type: 'entry' | 'exit';
}

export interface Notification {
  id: string;
  message: string;
  timestamp: number;
  type: 'success' | 'info' | 'warning';
}
