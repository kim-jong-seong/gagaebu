# gagaebu (가계부)

## 개요
개인 가계부 웹 앱. 수입/지출 거래 기록, 예산 관리, 통계 시각화를 제공한다.

## 기술 스택
- **백엔드**: Node.js + Express.js
- **데이터베이스**: SQLite (better-sqlite3)
- **프론트엔드**: React (Create React App)
- **프로세스 관리**: PM2 (프로덕션 배포)
- **환경 변수**: dotenv

## 프로젝트 구조
```
gagaebu/
├── src/                      # Express 백엔드
│   ├── app.js                # 서버 진입점
│   ├── db/
│   │   ├── index.js          # DB 연결 및 초기화
│   │   └── schema.sql        # 테이블 스키마
│   └── routes/
│       ├── transactions.js   # 거래 내역 API
│       ├── categories.js     # 카테고리 API
│       ├── paymentMethods.js # 결제수단 API
│       ├── budgets.js        # 예산 API
│       └── settings.js       # 설정 API
├── frontend/src/             # React 프론트엔드
│   ├── App.js                # 루트 컴포넌트 (탭 네비게이션)
│   ├── api.js                # API 클라이언트
│   ├── constants.js          # 색상, 상수, 포매터
│   ├── Toast.js              # 토스트 알림
│   ├── Portal.js             # React Portal 유틸
│   └── pages/
│       ├── DashboardPage.js  # 대시보드 (월별/주차별 차트, 최근 거래)
│       ├── TransactionsPage.js # 거래 내역 목록/검색/필터
│       ├── BudgetPage.js     # 예산 관리 (이월 기능 포함)
│       ├── StatsPage.js      # 통계 (도넛 차트, 월별 분석)
│       ├── SettingsPage.js   # 설정 (카테고리, 결제수단, 기본 수입)
│       └── LoginPage.js      # 로그인
├── data/
│   └── gagaebu.db            # SQLite DB 파일
├── ecosystem.config.js       # PM2 설정
└── .env                      # 환경 변수 (PORT, DB_PATH)
```

## 주요 기능
- 거래 내역 추가/수정/삭제 (수입·지출 분류, 카테고리, 결제수단, 메모)
- 월별 예산 설정 및 이월 예산 계산 (이전 월 잔액 누적)
- 대시보드: 월별 수입/지출 흐름 바 차트, 주차별 라인 차트, 카테고리별 지출 분석
- 통계 페이지: 도넛 차트, 월별 비교
- 카테고리/결제수단 관리 (설정 페이지)
- 기본 수입 자동 불러오기
- DB 파일 직접 다운로드 (`GET /api/database/download`)
- 세션 기반 간이 로그인
- 반응형 UI (모바일 하단 탭바 / 데스크톱 사이드바)

## 환경 변수 (.env)
```
PORT=3002
DB_PATH=./data/gagaebu.db
```

## 실행 방법

### 개발
```bash
# 백엔드
npm run dev

# 프론트엔드
cd frontend && npm start
```

### 프로덕션 배포
```bash
git pull && cd frontend && npm run build && cd .. && pm2 restart gagaebu
```

## 변경 이력
- 2026-05-28: README 초기 정리
- 2026-05-28: 이월 내역 카드 표시 수정 — 전월 1행으로 단순화, 이월 최대 기간 설정 제거
- 2026-05-xx: 이월 누적 계산 방식 변경 - 적자 월 차감 반영
- 2026-05-xx: 예산 페이지 모바일 이월 수식 줄바꿈 및 이월 토글 카드 위치 변경
- 2026-05-xx: 모바일 확대/축소 비활성화
