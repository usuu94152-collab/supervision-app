// src/services/sheets.ts
// Google Apps Script Web App과 통신하는 실제 서비스
// mock.ts 대신 이 파일을 import하면 실제 데이터로 동작

import type { ScheduleService } from './api';
import type { ScheduleRow, Log, Holiday, TeacherStats, Teacher, SwapResult } from '../types';

// .env 또는 환경변수에서 Apps Script URL 주입
const GAS_URL = import.meta.env.VITE_GAS_URL as string;

if (!GAS_URL) {
  console.warn('[sheets.ts] VITE_GAS_URL 환경변수가 설정되지 않았습니다.');
}

async function gasGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.data?.error ?? '서버 오류');
  return json.data as T;
}

async function gasPost<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.data?.error ?? '서버 오류');
  return json.data as T;
}

export const sheetsService: ScheduleService = {
  async getTeachers(): Promise<Teacher[]> {
    return gasGet<Teacher[]>('getTeachers');
  },

  async getSchedule(year: number, month: number): Promise<ScheduleRow[]> {
    return gasGet<ScheduleRow[]>('getSchedule', {
      year: String(year),
      month: String(month),
    });
  },

  async saveSchedule(rows: ScheduleRow[], year: number, month: number, user: string): Promise<boolean> {
    const result = await gasPost<{ ok: boolean }>({ action: 'saveSchedule', rows, year, month, user });
    return result.ok;
  },

  async swapTeacher(date: string, newTeacher: string, reason: string, user: string): Promise<SwapResult> {
    return gasPost<SwapResult>({ action: 'swapTeacher', date, newTeacher, reason, user });
  },

  async getLogs(): Promise<Log[]> {
    return gasGet<Log[]>('getLogs');
  },

  async getHolidays(): Promise<Holiday[]> {
    return gasGet<Holiday[]>('getHolidays');
  },

  async getStats(year: number, month: number): Promise<TeacherStats[]> {
    return gasGet<TeacherStats[]>('getStats', {
      year: String(year),
      month: String(month),
    });
  },
};
