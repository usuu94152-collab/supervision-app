# 본교무실 감독표 관리 시스템

대진고등학교 본교무실 감독 일정 관리 웹앱

## 기능

| 탭 | 설명 |
|---|---|
| 월간 감독표 | 연/월별 감독 일정 조회, 상태 시각화 |
| 월별 배정 | 자동/수동 감독자 배정, Google Sheets 저장 |
| 교체 관리 | 감독자 교체 신청, 확인 모달, 로그 자동 기록 |
| 월별 통계 | 인당 배정 횟수, 교체 추가/차감 집계 |
| 변경 로그 | 모든 배정·교체 이력 조회 |

## 빠른 시작 (MVP - 단일 HTML)

1. `index.html` 파일을 브라우저에서 열면 바로 동작합니다.
2. 더미 데이터로 모든 기능 테스트 가능합니다.

## React 프로젝트 실행

```bash
npm install
npm run dev
```

환경변수 설정 (`env.local` 파일 생성):

```
VITE_USE_MOCK=true          # true: 더미 데이터, false: 실제 Sheets
VITE_GAS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

## Google Sheets 연동 방법

### 1. 스프레드시트 준비

1. Google Sheets 새 파일 생성
2. `docs/sheets_initial_data.txt` 참고하여 4개 시트 생성:
   - `teachers`
   - `schedule`
   - `logs`
   - `holidays_or_blocks`
3. 각 시트에 헤더 행 입력

### 2. Apps Script 배포

1. 스프레드시트 → 확장 프로그램 → Apps Script
2. `gas/Code.gs` 내용을 붙여넣기
3. `SPREADSHEET_ID` 변수를 실제 ID로 교체
4. 배포 → 새 배포 → 웹 앱
5. 실행 대상: **나** (또는 모든 사용자)
6. 배포된 URL을 `VITE_GAS_URL`에 설정

### 3. 서비스 교체

`src/services/index.ts` 에서 한 줄만 바꾸면 됩니다:

```typescript
// 더미 데이터
export { mockService as service } from './mock';

// 실제 Google Sheets
export { sheetsService as service } from './sheets';
```

## 폴더 구조

```
src/
├── types/          # TypeScript 타입 정의
│   └── index.ts
├── services/       # 데이터 레이어
│   ├── api.ts      # 인터페이스 정의
│   ├── mock.ts     # 더미 데이터 구현
│   └── sheets.ts   # Google Sheets 연동
├── hooks/          # 커스텀 훅
│   ├── useSchedule.ts
│   └── useTeachers.ts
├── utils/
│   └── assign.ts   # 자동 배정 로직
├── components/     # 공통 컴포넌트
│   ├── Modal.tsx
│   ├── StatusBadge.tsx
│   └── Toast.tsx
└── pages/          # 화면별 컴포넌트
    ├── ScheduleView.tsx
    ├── AssignPage.tsx
    ├── SwapPage.tsx
    ├── StatsPage.tsx
    └── LogPage.tsx
```

## 향후 확장 아이디어

- **Google OAuth 로그인**: 작업자 자동 인식, 권한 분리
- **교체 요청 승인 워크플로우**: 신청 → 부장 승인 → 반영
- **KakaoTalk 알림**: 교체 확정 시 당사자에게 자동 메시지
- **월별 감독 균등도 차트**: Bar 차트로 시각화
- **모바일 PWA**: 오프라인 캐시, 홈화면 추가
- **CSV/Excel 내보내기**: 월별 감독표 출력

## 감독자 목록 수정

`teachers` 시트의 `사용여부` 컬럼을 N으로 변경하면 배정에서 제외됩니다.
React 앱에서는 `src/services/mock.ts`의 `TEACHERS_DATA` 배열을 수정하세요.
