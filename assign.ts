// src/utils/assign.ts
// 자동 배정 로직 - 함수 분리로 이후 고도화 가능

import type { ScheduleRow, Teacher, Holiday } from '../types';

const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

// ── 기본 유틸 ─────────────────────────────────────────────
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getDayName(year: number, month: number, day: number): string {
  return DAYS_KR[new Date(year, month - 1, day).getDay()];
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 || dow === 6;
}

export function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── 배정 제외일 체크 ──────────────────────────────────────
export function isBlocked(dateStr: string, holidays: Holiday[]): boolean {
  return holidays.some(h => h.date === dateStr && h.assign === 'N');
}

// ── 핵심: 라운드로빈 자동 배정 ────────────────────────────
// startIdx: 이전 달 마지막 배정자의 다음 인덱스
// 반환: { rows, nextStartIdx }
export function autoAssign(
  year: number,
  month: number,
  teachers: Teacher[],
  holidays: Holiday[],
  startIdx: number = 0,
): { rows: ScheduleRow[]; nextStartIdx: number } {
  const activeTeachers = teachers
    .filter(t => t.active)
    .sort((a, b) => a.order - b.order);

  if (activeTeachers.length === 0) {
    return { rows: [], nextStartIdx: 0 };
  }

  const total = getDaysInMonth(year, month);
  const rows: ScheduleRow[] = [];
  let idx = startIdx;

  for (let d = 1; d <= total; d++) {
    const dateStr = formatDate(year, month, d);
    const dow = getDayName(year, month, d);
    const weekend = isWeekend(year, month, d);
    const blocked = isBlocked(dateStr, holidays);
    const holiday = holidays.find(h => h.date === dateStr);

    if (weekend || blocked) {
      rows.push({
        date: dateStr, year, month, day: d, dow,
        orig: null, current: null,
        status: '제외',
        type: '자동',
        note: weekend ? '주말' : (holiday?.desc ?? '배정제외'),
      });
    } else {
      const teacher = activeTeachers[idx % activeTeachers.length].name;
      idx++;
      rows.push({
        date: dateStr, year, month, day: d, dow,
        orig: teacher, current: teacher,
        status: '정상',
        type: '자동',
        note: '',
      });
    }
  }

  return { rows, nextStartIdx: idx % activeTeachers.length };
}

// ── 향후 고도화: 균등 분배 배정 (현재는 라운드로빈과 동일) ─
// 여기에 더 복잡한 로직을 추가할 수 있음
export function balancedAssign(
  year: number,
  month: number,
  teachers: Teacher[],
  holidays: Holiday[],
  startIdx: number = 0,
) {
  // TODO: 이전 달 배정 횟수를 고려한 균등 분배
  // 현재는 라운드로빈과 동일하게 동작
  return autoAssign(year, month, teachers, holidays, startIdx);
}
