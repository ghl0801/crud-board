# 순수 CRUD 게시판 (학습용)

로그인/권한 없이 글을 쓰고, 읽고, 수정하고, 삭제하는 것만 하는 게시판입니다. CRUD 흐름과 웹 기본기(HTML/CSS/JS, HTTP, SQL)를 배우기 위한 학습용 프로젝트로, 프레임워크·빌드 도구·ORM을 의도적으로 쓰지 않았습니다.

**배포 주소:** https://crud-board-livid.vercel.app

## 기술 스택

- **프론트엔드**: 순수 HTML/CSS/JavaScript (빌드 도구, 프레임워크 없음)
- **백엔드**: [Vercel Functions](https://vercel.com/docs/functions)의 `/api` 디렉토리 (Express 등 프레임워크 없이 Node.js `handler(request, response)` 함수를 직접 작성)
- **DB**: Postgres ([Vercel Marketplace](https://vercel.com/marketplace)로 생성한 Neon) + [`pg`](https://node-postgres.com/) 패키지로 직접 작성한 SQL (ORM 없음)
- **배포**: Vercel 무료 티어

## 폴더 구조

```
index.html, new.html, post.html, edit.html   # 목록 / 작성 / 상세 / 수정 페이지
css/style.css                                # 공통 스타일
js/api.js                                    # 공통 fetch 헬퍼 (fetchPosts, fetchPost, createPost, updatePost, deletePost)
js/list.js, new.js, post.js, edit.js         # 각 페이지 전용 스크립트
api/_db.js                                   # pg Pool 싱글턴 (내부 헬퍼, `_` 접두사라 라우트로 배포되지 않음)
api/posts.js                                 # GET(목록), POST(생성)
api/posts/[id].js                            # GET(상세), PUT(수정), DELETE(삭제)
```

## API

| CRUD | HTTP | 엔드포인트 | 설명 |
|------|------|-----------|------|
| Create | POST | `/api/posts` | 새 글 생성 |
| Read (목록) | GET | `/api/posts` | 전체 글 목록 조회 |
| Read (상세) | GET | `/api/posts/:id` | 글 하나 조회 |
| Update | PUT | `/api/posts/:id` | 글 수정 |
| Delete | DELETE | `/api/posts/:id` | 글 삭제 |

응답 상태 코드: 성공 200/201, 필수값 누락 400, 존재하지 않는 글 404, 지원하지 않는 메서드 405, 그 외 예외 500.

## 로컬 개발 환경 설정

1. 저장소를 클론하고 의존성 설치

   ```bash
   npm install
   ```

2. Vercel CLI 설치 및 로그인, 프로젝트 연결

   ```bash
   npm install -g vercel
   vercel login
   vercel link
   ```

3. Vercel 대시보드 → 프로젝트 → **Storage** 탭 → **Marketplace**에서 Postgres(Neon 등)를 생성하고 프로젝트에 연결합니다. 이 과정에서 `DATABASE_URL`(또는 `POSTGRES_URL`) 환경변수가 자동으로 등록됩니다.

4. 환경변수를 로컬로 가져옵니다.

   ```bash
   vercel env pull .env.local
   ```

5. `posts` 테이블을 생성합니다 (Vercel 대시보드의 SQL 편집기, 또는 `psql`, 또는 `.env.local`의 연결 문자열로 아무 Postgres 클라이언트를 이용).

   ```sql
   CREATE TABLE IF NOT EXISTS posts (
     id SERIAL PRIMARY KEY,
     title TEXT NOT NULL,
     content TEXT NOT NULL,
     author TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   ```

6. 로컬 서버를 실행합니다. **일반 정적 서버로는 `/api` 함수가 동작하지 않으므로 반드시 `vercel dev`를 사용해야 합니다.**

   ```bash
   vercel dev
   ```

   `http://localhost:3000`에서 확인할 수 있습니다.

## 배포

```bash
vercel --prod
```

프레임워크가 없어 별도 빌드 설정 없이 정적 파일과 `/api` 함수가 그대로 배포됩니다. Postgres 연결 환경변수가 Vercel 프로젝트의 Production 환경에 등록되어 있어야 합니다.

## 알려진 제한사항 (의도된 설계)

- 로그인/회원가입 없음 — 누구나 모든 글을 수정·삭제할 수 있습니다.
- 댓글, 검색, 페이지네이션 없음.
- 자동화 테스트 스위트 없음 — 검증은 curl과 수동 브라우저 확인으로 진행합니다.

더 자세한 설계 배경은 [`docs/superpowers/specs/2026-07-28-crud-board-design.md`](docs/superpowers/specs/2026-07-28-crud-board-design.md)를 참고하세요.
