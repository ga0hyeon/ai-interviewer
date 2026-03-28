## AI Interviewer

LM Studio에 올린 로컬 LLM을 OpenAI 호환 API로 호출해서, 브라우저에서 바로 모의 인터뷰를 진행할 수 있는 Next.js 앱입니다.

### 주요 기능

- `LM Studio /v1/models`를 통해 로컬 모델 목록 조회
- `LM Studio /v1/chat/completions`를 통한 인터뷰 턴 생성
- 역할, 경력, 기술 스택, 집중 영역, 인터뷰 스타일 설정
- 한 화면에서 질문/답변을 이어가는 인터뷰 콘솔 UI

### 실행 방법

1. LM Studio에서 원하는 모델을 로드합니다.
2. Developer 탭에서 OpenAI compatible local server를 실행합니다.
3. 기본 주소가 `http://127.0.0.1:1234/v1`이 아니면 `.env.local`에 아래 값을 넣습니다.

```bash
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
# 필요할 때만
LM_STUDIO_API_KEY=lm-studio
```

4. 앱을 실행합니다.

```bash
pnpm install
pnpm dev
```

5. 브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

### 인터뷰 흐름

1. 오른쪽 패널에서 로컬 모델을 선택합니다.
2. 인터뷰 역할, 경력, 스택, 집중 영역을 조정합니다.
3. `인터뷰 시작`을 누르면 첫 질문이 생성됩니다.
4. 답변을 입력하면 다음 꼬리질문이 이어집니다.

### 스크립트

```bash
pnpm dev
pnpm lint
pnpm build
```
