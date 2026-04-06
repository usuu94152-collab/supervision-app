// src/types/index.ts

export type Status = '정상' | '변경' | '제외';
export type AssignType = '자동' | '수동' | '교체';
export type LogType = '월배정' | '교체' | '수동수정';

export interface Teacher {
  id: number;
  name: string;
  active: boolean;
  order: number;
}

export interface ScheduleRow {
  date: string;        // "2026-04-01"
  year: number;
  month: number;
  day: number;
  dow: string;         // "월"
  orig: string | null;
  current: string | null;
  status: Status;
  type: AssignType;
  note: string;
}

export interface Log {
  time: string;
  type: LogType;
  target: string;
  prev: string;
  next: string;
  user: string;
  reason: string;
}

export interface Holiday {
  date: string;
  type: string;
  desc: string;
  assign: 'Y' | 'N';
}

export interface TeacherStats {
  name: string;
  origCount: number;
  currCount: number;
  removed: number;
  added: number;
}

// 향후 교체 승인 워크플로우 확장용
export interface SwapRequest {
  id: string;
  date: string;
  fromTeacher: string;
  toTeacher: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
}

export interface SwapResult {
  ok: boolean;
  msg?: string;
}
