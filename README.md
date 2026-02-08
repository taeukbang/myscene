# MyScene - 사진 중심 여행 장소 추천

여행지에서 최고의 사진을 얻을 수 있는 장소를 찾아보세요.

## 프로젝트 소개

MyScene은 사진 촬영을 중시하는 여행자를 위한 장소 추천 서비스입니다. 단순한 장소 정보가 아닌, **어떤 사진을 찍을 수 있는지**, **언제 가야 하는지**, **어떻게 찍어야 하는지**를 알려줍니다.

### 주요 기능

- 📸 **사진 중심 피드**: 장소가 아닌 사진 결과물 중심 추천
- 🎯 **상황 기반 추천**: 현재 위치와 시간을 고려한 맞춤 추천
- 📝 **촬영 가이드**: 최적의 시간, 위치, 구도 정보 제공
- ⚠️ **실패 조건 안내**: 대기 시간, 역광 등 주의사항 표시
- 🗺️ **지도 뷰**: 사진 썸네일 핀으로 한눈에 보기
- 📅 **일정 저장**: 여행 계획에 장소 추가

## 시작하기

### 1. 환경 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
# .env.local 파일을 열어 Supabase 정보 입력
```

### 2. Supabase 설정

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 마이그레이션 파일 실행:
   - `supabase/migrations/009_places_module_schema.sql`
   - `supabase/migrations/010_places_indexes.sql`
   - `supabase/migrations/011_places_functions.sql`

3. `.env.local`에 프로젝트 정보 입력:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

### 3. 샘플 데이터 추가

```bash
# 샘플 장소 및 사진 데이터 추가
npx tsx scripts/places/seed-places.ts
```

### 4. 개발 서버 실행

```bash
npm run dev
```

앱이 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

## 프로젝트 구조

```
MyScene/
├── app/                    # Next.js App Router
│   ├── places/            # 장소 모듈 라우트
│   │   ├── page.tsx       # 피드 페이지
│   │   ├── [photoId]/     # 사진 상세
│   │   ├── map/           # 지도 뷰
│   │   └── itinerary/     # 일정 관리
│   ├── api/               # API 라우트
│   │   └── places/        # 장소 API 엔드포인트
│   └── admin/             # 관리자 페이지
│       └── review/        # 사진 리뷰 인터페이스
├── components/            # React 컴포넌트
│   ├── places/           # 장소 관련 컴포넌트
│   └── ui/               # UI 컴포넌트
├── lib/                  # 유틸리티 및 비즈니스 로직
│   ├── places/          # 장소 모듈 로직
│   └── supabase.ts      # Supabase 클라이언트
├── scripts/             # 데이터 관리 스크립트
│   └── places/
│       ├── seed-places.ts        # 시드 데이터
│       └── scraper/              # 스크래핑 도구
├── supabase/            # 데이터베이스 마이그레이션
│   └── migrations/
└── public/              # 정적 파일
```

## 개발 로드맵

### ✅ Phase 1: Foundation (현재)
- [x] 프로젝트 구조 설정
- [x] 데이터베이스 스키마 설계
- [x] Supabase 연동
- [ ] 스크래핑 파이프라인 구축
- [ ] 샘플 데이터 수집 (20개 장소, 60개 사진)

### 🔄 Phase 2: Core API (진행 예정)
- [ ] 컨텍스트 기반 추천 API
- [ ] 사진/장소 상세 API
- [ ] 지도 뷰 API
- [ ] 캐싱 레이어 구현

### 📋 Phase 3-8: UI & Features
- 상세 일정은 [계획 파일](./.claude/plans/partitioned-swimming-jellyfish.md) 참고

## 데이터 수집 가이드

### 수동 큐레이션
1. Instagram에서 해시태그 검색: `#도쿄카페`, `#도쿄뷰`
2. 높은 참여도(좋아요 1000+) 게시물 선택
3. 장소 정보 및 사진 메타데이터 수집
4. `scripts/places/seed-places.ts`에 데이터 추가

### 자동 스크래핑 (향후)
- Apify Instagram Scraper 활용
- 수동 리뷰 후 승인
- 저작권 준수 (출처 표기, 저해상도 사용)

## 기술 스택

- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Map**: Leaflet + React-Leaflet
- **Deployment**: Vercel

## 라이선스

MIT

## 문의

프로젝트에 대한 문의사항이나 피드백은 이슈를 생성해주세요.
