# MyScene - Photo-first Place Module

## 프로젝트 개요

30-40대 한국 여성 여행자를 위한 사진 중심 여행지 추천 서비스

### 핵심 가치
- 사진이 중심이 되는 장소 발견
- 맥락 기반 추천 (위치 + 시간)
- 간편한 여정 관리 (로그인 불필요)

## 기술 스택

### Frontend
- Next.js 15 (App Router)
- TypeScript 5
- TailwindCSS + shadcn/ui
- Leaflet (무료 지도 라이브러리)

### Backend
- Supabase PostgreSQL
- Server Actions
- Edge Functions (필요시)

### Data Collection
- ~~Instagram 스크래핑 (포기)~~ → 웹 스크래핑으로 전환 예정
- Puppeteer + Cheerio
- 자동화 + 수동 리뷰 워크플로우

## 데이터베이스 구조

### 핵심 테이블 (5개)

1. **places** - 장소 정보
   - 이름, 카테고리, 위치(lat/lng)
   - 영업시간, 주소
   - 메트릭 (평점, 조회수, 저장수)

2. **place_photos** - 장소 사진
   - URL, 순서, 설명
   - 승인 상태
   - 메트릭 (조회수, 좋아요, 저장수)

3. **user_itineraries** - 사용자 여정
   - 세션 기반 (인증 불필요)
   - 제목, 날짜
   - Context ID로 추적

4. **itinerary_items** - 여정 항목
   - 순서, 방문 시간
   - 메모, 상태

5. **photo_interactions** - 사진 상호작용
   - 좋아요, 저장, 조회
   - 세션 기반 추적

### 주요 기능

- **get_context_photos()**: 맥락 기반 추천 엔진
  - 현재 위치에서 5km 이내
  - 현재 시간에 영업 중
  - 거리순 + 인기도 정렬

- **calculate_distance_km()**: Haversine 거리 계산

## 현재 상태

### ✅ 완료
- Next.js 프로젝트 구조 설정
- 데이터베이스 스키마 생성 (migration 009, 010, 011)
- PostGIS 의존성 제거 (단순 lat/lng 인덱스 사용)
- Puppeteer 기반 스크래퍼 기본 구조
- Admin 리뷰 인터페이스 (/admin/review)
- Place Matcher (자동 장소 매칭)
- **새로운 사진 수집 시스템**
  - Admin 사진 관리 페이지 (/admin/photos)
    - 장소별 그리드 뷰 (50장씩)
    - 일괄 선택/승인/거부
    - 키보드 단축키 지원
  - 사진 크롤러 (Pinterest/Google Images)
    - 카페당 ~50장 자동 수집
    - 출처 URL 저장
    - Puppeteer + Stealth 플러그인

### ⚠️ 문제 및 해결
1. **PostgreSQL IMMUTABLE 함수 오류**
   - 원인: NOW() 함수는 IMMUTABLE이 아님
   - 해결: 인덱스 WHERE 절 제거

2. **PostGIS 확장 없음**
   - 원인: Supabase에서 PostGIS 미사용
   - 해결: 단순 lat/lng 인덱스로 대체

3. **환경변수 로딩 문제**
   - 원인: tsx에서 .env.local 로딩 안됨
   - 해결: run-scraper.js wrapper 생성

4. **Instagram 로그인 실패**
   - 원인: 봇 감지 + 계정 정보 오류
   - 결정: Instagram 포기, 웹 스크래핑으로 전환

### 🔄 진행 중
- **데이터 수집 준비**
  1. Claude/Gemini로 25년 1월 이후 추천 도쿄 카페 목록 생성 (다음 단계)
  2. 카페 목록으로 크롤러 실행
  3. Admin 페이지에서 사진 피킹

### 📋 예정
1. **카페 목록 생성** (Claude/Gemini에서 추천 받기)
   - "25년 1월 이후 발행된 웹 게시물에서 추천하는 도쿄 카페"
   - 10-15개 카페 선정

2. **사진 크롤링 실행**
   - `npm run crawl-photos` 실행
   - 카페당 50장씩 수집

3. **사진 피킹**
   - `npm run dev` → http://localhost:3000/admin/photos
   - 장소별로 사진 선택 및 승인

4. **프론트엔드 UI 구현**
   - 메인 피드 (사진 그리드)
   - 장소 상세 페이지
   - 여정 관리

5. **추천 엔진 테스트**

## 주요 파일 구조

```
MyScene/
├── app/
│   ├── admin/review/page.tsx           # 사진 승인 인터페이스
│   └── api/admin/                      # Admin API 엔드포인트
│       ├── staging-photos/route.ts
│       ├── approve-photo/route.ts
│       └── reject-photo/route.ts
│
├── scripts/places/scraper/
│   ├── instagram-scraper.ts            # Instagram 스크래퍼 (사용 중단)
│   ├── place-matcher.ts                # 자동 장소 매칭
│   └── run-scraper.js                  # 환경변수 로더
│
├── supabase/migrations/
│   ├── 009_places_module_schema.sql    # 테이블 스키마
│   ├── 010_places_indexes.sql          # 성능 인덱스
│   └── 011_places_functions.sql        # 추천 엔진 함수
│
├── .env.local                          # 환경변수 (Git 제외)
├── PROJECT_CONTEXT.md                  # 이 파일
└── PRD.md                              # 제품 요구사항 문서
```

## 핵심 결정 사항

### 1. 무료 도구만 사용
- Mapbox ❌ → Leaflet ✅
- Paid API ❌ → 웹 스크래핑 ✅

### 2. 병렬 처리 우선
- 작업 가능한 것은 모두 병렬로 처리
- 효율성과 속도 중시

### 3. 자동화 우선, 샘플 데이터 거부
- 실제 데이터 수집 자동화
- 수동 리뷰로 품질 관리

### 4. 인증 없는 사용자 경험
- 세션 기반 여정 관리
- Context ID로 추적

## 다음 단계

### 즉시 할 일
1. 웹 스크래핑 대안 조사 및 구현
   - Naver 블로그 "도쿄 카페"
   - 여행 리뷰 사이트
   - 공개 API 활용 가능 여부

2. 스크래퍼 재구현
   - 간단한 웹 페이지 스크래핑
   - 사진 + 장소 정보 추출

3. 데이터 수집 및 리뷰
   - 40+ 장소 사진 수집
   - Admin 인터페이스에서 승인

4. 프론트엔드 구현
   - 메인 피드 (사진 그리드)
   - 장소 상세 페이지
   - 여정 관리

## 기술적 도전 과제

### 해결됨
- ✅ PostgreSQL 함수 immutability
- ✅ PostGIS 의존성 제거
- ✅ 환경변수 로딩
- ✅ TypeScript 스크립트 실행

### 진행 중
- 🔄 데이터 수집 방법 (Instagram → Web)

### 예정
- 📋 추천 알고리즘 최적화
- 📋 프론트엔드 성능
- 📋 이미지 최적화

## 개발 명령어

```bash
# 개발 서버
npm run dev

# 데이터베이스 마이그레이션
npm run db:migrate

# 스크래퍼 실행 (재구현 필요)
npm run scrape

# Place Matcher 실행
npm run match
```

## 환경변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Scraping (Instagram 사용 중단)
# INSTAGRAM_USERNAME=
# INSTAGRAM_PASSWORD=
```

## 참고 사항

- 모든 대화는 한국어로 진행
- 샘플 데이터 사용 금지
- 무료 도구만 사용
- 병렬 처리 우선
- 실용성과 속도 중시

## 마지막 업데이트

- 날짜: 2026-02-05
- 상태: 사진 수집 시스템 구축 완료 (Admin 페이지 + 크롤러)
- 다음: Claude/Gemini로 카페 목록 생성 후 크롤러 실행
