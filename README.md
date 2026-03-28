## AI Interviewer

LM Studio 기반 모의 인터뷰 앱에 역할 기반 로그인(`admin`, `interviewer`, `interviewee`)을 추가한 Next.js 프로젝트입니다.

### 모드 및 권한

- `admin`: 인터뷰 템플릿/프롬프트 관리 화면 접근
- `interviewer`: AI 인터뷰 결과 리뷰 화면 접근
- `interviewee`: 실제 인터뷰 진행 화면 접근

권한이 없는 화면/API에 접근하면 차단됩니다.

### 구성 요소

- Next.js App Router
- PostgreSQL: 사용자/세션/인터뷰 데이터 저장
- Redis: 세션 캐시
- LM Studio OpenAI 호환 API 연동

### 빠른 시작

1. 환경 파일을 준비합니다.

```bash
cp .env.example .env.local
```

2. DB/캐시 컨테이너를 실행합니다.

```bash
pnpm db:up
```

3. 의존성을 설치하고 계정을 시드합니다.

```bash
pnpm install
pnpm seed:auth
```

4. 앱을 실행합니다.

```bash
pnpm dev
```

5. 브라우저에서 [http://localhost:3000](http://localhost:3000) 접속 후 로그인합니다.

### 기본 시드 계정

- `admin@ai-interviewer.local` / `admin1234!`
- `interviewer@ai-interviewer.local` / `interviewer1234!`
- `interviewee@ai-interviewer.local` / `interviewee1234!`

필요하면 `.env.local`의 `SEED_*` 값으로 변경 가능합니다.

### LM Studio 설정

1. LM Studio에서 원하는 모델을 로드합니다.
2. Developer 탭에서 OpenAI compatible local server를 실행합니다.
3. 기본 주소가 다르면 `.env.local`에서 `LM_STUDIO_BASE_URL`을 수정합니다.

### 주요 스크립트

```bash
pnpm dev
pnpm lint
pnpm build
pnpm db:up
pnpm db:down
pnpm seed:auth
```
