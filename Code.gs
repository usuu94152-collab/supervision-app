/**
 * 본교무실 감독표 관리 - Google Apps Script Web App
 * 배포: 스프레드시트 → 확장 프로그램 → Apps Script → 배포 → 새 배포
 * 실행: 나 (또는 모든 사용자)
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // ← 실제 ID로 교체

// ── 시트 이름 상수 ─────────────────────────────────────────
const SHEET = {
  TEACHERS:  'teachers',
  SCHEDULE:  'schedule',
  LOGS:      'logs',
  HOLIDAYS:  'holidays_or_blocks',
};

// ── CORS 헤더 포함 응답 생성 ───────────────────────────────
function makeResponse(data, code) {
  const output = ContentService
    .createTextOutput(JSON.stringify({ code: code || 200, data }))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

function makeError(msg, code) {
  return makeResponse({ error: msg }, code || 400);
}

// ── GET 라우터 ─────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  try {
    switch (action) {
      case 'getTeachers':  return makeResponse(getTeachers());
      case 'getSchedule':  return makeResponse(getSchedule(e.parameter.year, e.parameter.month));
      case 'getLogs':      return makeResponse(getLogs());
      case 'getHolidays':  return makeResponse(getHolidays());
      case 'getStats':     return makeResponse(getStats(e.parameter.year, e.parameter.month));
      default:             return makeError('Unknown action');
    }
  } catch(err) {
    return makeError(err.message, 500);
  }
}

// ── POST 라우터 ────────────────────────────────────────────
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch(_) { return makeError('Invalid JSON'); }

  const action = body.action;
  try {
    switch (action) {
      case 'saveSchedule': return makeResponse(saveSchedule(body));
      case 'swapTeacher':  return makeResponse(swapTeacher(body));
      case 'addHoliday':   return makeResponse(addHoliday(body));
      default:             return makeError('Unknown action');
    }
  } catch(err) {
    return makeError(err.message, 500);
  }
}

// ── 시트 접근 헬퍼 ─────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name);
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ── teachers ──────────────────────────────────────────────
function getTeachers() {
  const rows = sheetToObjects(getSheet(SHEET.TEACHERS));
  return rows.filter(r => r['사용여부'] === 'Y')
             .sort((a, b) => a['순서'] - b['순서'])
             .map(r => ({ id: r['id'], name: r['이름'], active: true, order: r['순서'] }));
}

// ── schedule ──────────────────────────────────────────────
function getSchedule(year, month) {
  const rows = sheetToObjects(getSheet(SHEET.SCHEDULE));
  return rows.filter(r => String(r['연도']) === String(year) && String(r['월']) === String(month));
}

function saveSchedule(body) {
  // { year, month, rows: [...], user }
  const sheet = getSheet(SHEET.SCHEDULE);
  const all = sheetToObjects(sheet);

  // 해당 월 행 삭제 후 재삽입 (덮어쓰기)
  const fullData = sheet.getDataRange().getValues();
  const headers = fullData[0];

  // 해당 월 외 행만 남기기
  const kept = fullData.slice(1).filter(row => {
    return !(String(row[1]) === String(body.year) && String(row[2]) === String(body.month));
  });

  // 새 행 생성
  const newRows = body.rows.map(r => [
    r.date, r.year, r.month, r.dow, r.orig || '', r.current || '',
    r.status, r.type, r.note
  ]);

  // 전체 재기록
  sheet.clearContents();
  sheet.appendRow(headers);
  [...kept, ...newRows].forEach(row => sheet.appendRow(row));

  // 로그
  appendLog({
    time: new Date().toLocaleString('ko-KR'),
    type: '월배정',
    target: `${body.year}-${String(body.month).padStart(2,'0')}`,
    prev: '',
    next: '배정완료',
    user: body.user || '미지정',
    reason: '자동배정 저장',
  });

  return { ok: true };
}

// ── swapTeacher ───────────────────────────────────────────
function swapTeacher(body) {
  // { date, newTeacher, reason, user }
  const sheet = getSheet(SHEET.SCHEDULE);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const dateIdx = headers.indexOf('날짜');
  const currIdx = headers.indexOf('현재감독');
  const statusIdx = headers.indexOf('상태');
  const typeIdx = headers.indexOf('배정구분');

  let prev = '';
  let found = false;

  for (let i = 1; i < data.length; i++) {
    if (data[i][dateIdx] === body.date) {
      prev = data[i][currIdx];
      data[i][currIdx] = body.newTeacher;
      data[i][statusIdx] = '변경';
      data[i][typeIdx] = '교체';
      found = true;
      break;
    }
  }

  if (!found) throw new Error('해당 날짜 데이터 없음');

  sheet.clearContents();
  data.forEach(row => sheet.appendRow(row));

  appendLog({
    time: new Date().toLocaleString('ko-KR'),
    type: '교체',
    target: body.date,
    prev,
    next: body.newTeacher,
    user: body.user || '미지정',
    reason: body.reason || '',
  });

  return { ok: true, prev };
}

// ── logs ──────────────────────────────────────────────────
function getLogs() {
  return sheetToObjects(getSheet(SHEET.LOGS)).reverse();
}

function appendLog(logObj) {
  const sheet = getSheet(SHEET.LOGS);
  sheet.appendRow([
    logObj.time, logObj.type, logObj.target,
    logObj.prev, logObj.next, logObj.user, logObj.reason,
  ]);
}

// ── holidays ──────────────────────────────────────────────
function getHolidays() {
  return sheetToObjects(getSheet(SHEET.HOLIDAYS));
}

function addHoliday(body) {
  const sheet = getSheet(SHEET.HOLIDAYS);
  sheet.appendRow([body.date, body.type, body.desc, body.assign || 'N']);
  return { ok: true };
}

// ── stats (서버사이드 계산) ────────────────────────────────
function getStats(year, month) {
  const rows = getSchedule(year, month).filter(r => r['상태'] !== '제외');
  const teachers = getTeachers().map(t => t.name);
  const stats = {};
  teachers.forEach(t => { stats[t] = { name: t, origCount: 0, currCount: 0, removed: 0, added: 0 }; });

  rows.forEach(r => {
    const orig = r['원래감독'];
    const curr = r['현재감독'];
    if (orig && stats[orig]) stats[orig].origCount++;
    if (curr && stats[curr]) stats[curr].currCount++;
    if (orig && curr && orig !== curr) {
      if (stats[orig]) stats[orig].removed++;
      if (stats[curr]) stats[curr].added++;
    }
  });

  return Object.values(stats);
}
