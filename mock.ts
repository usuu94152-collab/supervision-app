// src/services/api.ts
// 서비스 인터페이스 - mock ↔ 실제 Google Sheets 자유롭게 교체 가능

import type { ScheduleRow, Log, Holiday, TeacherStats, Teacher, SwapResult } from '../types';

export interface ScheduleService {
  getTeachers(): Promise<Teacher[]>;
  getSchedule(year: number, month: number): Promise<ScheduleRow[]>;
  saveSchedule(rows: ScheduleRow[], year: number, month: number, user: string): Promise<boolean>;
  swapTeacher(date: string, newTeacher: string, reason: string, user: string): Promise<SwapResult>;
  getLogs(): Promise<Log[]>;
  getHolidays(): Promise<Holiday[]>;
  getStats(year: number, month: number): Promise<TeacherStats[]>;
}

// ──────────────────────────────────────────────────────────────────
// src/services/mock.ts - 더미 데이터 서비스
// ──────────────────────────────────────────────────────────────────

import type { ScheduleService as IScheduleService } from './api';

const TEACHERS_DATA: Teacher[] = [
  { id: 1, name: '신현주', active: true, order: 1 },
  { id: 2, name: '이용주', active: true, order: 2 },
  { id: 3, name: '강성자', active: true, order: 3 },
  { id: 4, name: '유성욱', active: true, order: 4 },
  { id: 5, name: '이다원', active: true, order: 5 },
  { id: 6, name: '이애정', active: true, order: 6 },
  { id: 7, name: '최진영', active: true, order: 7 },
];

const HOLIDAYS_DATA: Holiday[] = [
  { date: '2026-04-14', type: '공휴일', desc: '임시공휴일', assign: 'N' },
  { date: '2026-04-21', type: '시험기간', desc: '중간고사 1일', assign: 'N' },
  { date: '2026-04-22', type: '시험기간', desc: '중간고사 2일', assign: 'N' },
  { date: '2026-04-23', type: '시험기간', desc: '중간고사 3일', assign: 'N' },
];

// 인메모리 store
const store: {
  schedule: ScheduleRow[];
  logs: Log[];
  holidays: Holiday[];
  lastAssignIndex: number;
} = {
  schedule: [],
  logs: [],
  holidays: [...HOLIDAYS_DATA],
  lastAssignIndex: -1,
};

function delay<T>(data: T, ms = 120): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(data), ms));
}

function nowStr(): string {
  return new Date().toLocaleString('ko-KR');
}

export const mockService: IScheduleService = {
  async getTeachers() {
    return delay([...TEACHERS_DATA]);
  },

  async getSchedule(year, month) {
    return delay(store.schedule.filter(r => r.year === year && r.month === month));
  },

  async saveSchedule(rows, year, month, user) {
    store.schedule = store.schedule.filter(r => !(r.year === year && r.month === month));
    store.schedule.push(...rows);
    store.logs.unshift({
      time: nowStr(), type: '월배정',
      target: `${year}-${String(month).padStart(2, '0')}`,
      prev: '', next: '배정완료', user, reason: '자동배정 저장',
    });
    return delay(true);
  },

  async swapTeacher(date, newTeacher, reason, user) {
    const row = store.schedule.find(r => r.date === date);
    if (!row) return delay({ ok: false, msg: '해당 날짜 데이터 없음' });
    if (row.status === '제외') return delay({ ok: false, msg: '해당 날짜는 교체할 수 없습니다.' });
    if (row.current === newTeacher) return delay({ ok: false, msg: '현재 감독자와 동일한 이름은 선택할 수 없습니다.' });
    const prev = row.current ?? '';
    row.current = newTeacher;
    row.status = '변경';
    row.type = '교체';
    store.logs.unshift({ time: nowStr(), type: '교체', target: date, prev, next: newTeacher, user, reason });
    return delay({ ok: true });
  },

  async getLogs() {
    return delay([...store.logs]);
  },

  async getHolidays() {
    return delay([...store.holidays]);
  },

  async getStats(year, month) {
    const rows = store.schedule.filter(r => r.year === year && r.month === month && r.status !== '제외');
    const stats: Record<string, TeacherStats> = {};
    TEACHERS_DATA.forEach(t => {
      stats[t.name] = { name: t.name, origCount: 0, currCount: 0, removed: 0, added: 0 };
    });
    rows.forEach(r => {
      if (r.orig && stats[r.orig]) stats[r.orig].origCount++;
      if (r.current && stats[r.current]) stats[r.current].currCount++;
      if (r.orig && r.current && r.orig !== r.current) {
        if (stats[r.orig]) stats[r.orig].removed++;
        if (stats[r.current]) stats[r.current].added++;
      }
    });
    return delay(Object.values(stats));
  },
};
