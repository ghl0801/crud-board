# 순수 CRUD 게시판 (학습용) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인증 없는 순수 CRUD 게시판을 Next.js + Prisma + Vercel Postgres로 구현하고 Vercel 무료 티어에 배포한다.

**Architecture:** 단일 Next.js(App Router) 프로젝트. 프론트엔드는 Client Component에서 `fetch`로 REST API(Route Handler)를 호출하고, Route Handler는 Prisma를 통해 Vercel Postgres의 `Post` 테이블에 접근한다. 인증, 권한 제한, 댓글, 검색, 페이지네이션 없음.

**Tech Stack:** Next.js (App Router, TypeScript), Prisma ORM, Vercel Postgres, Vercel 배포.

## Global Constraints

- 인증/로그인 없음. 권한 제한 없음 (누구나 모든 글 수정/삭제 가능)
- 범위는 CRUD 5개 동작(Create, Read-List, Read-Detail, Update, Delete)에 한정. 댓글/검색/페이지네이션 추가 금지
- 데이터 모델은 `Post { id, title, content, author?, createdAt, updatedAt }` 고정 (스펙: `docs/superpowers/specs/2026-07-28-crud-board-design.md`)
- 자동화 테스트 프레임워크(Jest 등) 도입 안 함 — 검증은 curl과 수동 브라우저 확인으로 수행 (설계 문서에 명시된 범위)
- API 응답 상태 코드: 성공 200/201, 검증 실패 400, 미존재 404
- Route Handler의 동적 params는 Next.js 15+ 기준 `Promise`이므로 반드시 `await params`로 처리

---

### Task 1: Next.js 프로젝트 초기화 및 실행 확인

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `.gitignore` (모두 `create-next-app`이 생성)

**Interfaces:**
- Consumes: 없음 (최초 작업)
- Produces: `app/` 디렉토리 구조, `npm run dev` 스크립트 — 이후 모든 작업이 이 위에 파일을 추가함

- [ ] **Step 1: Next.js 프로젝트 생성**

프로젝트 루트(`C:\Claude System\08_Claude관련\계시판`)에서 실행:

```bash
npx create-next-app@latest . --typescript --eslint --app --no-tailwind --no-src-dir --import-alias "@/*" --use-npm
```

폴더가 비어있지 않다는 경고(`docs/` 폴더 존재)가 뜨면 계속 진행(`y`)을 선택한다.

- [ ] **Step 2: git 저장소 확인**

`create-next-app`은 상위 디렉토리에 git 저장소가 없으면 자동으로 `git init`을 실행한다. 확인:

```bash
git status
```

Expected: `On branch main` 등 정상적인 git 저장소 상태 출력. 저장소가 없다는 오류가 나오면 `git init`을 수동 실행한다.

- [ ] **Step 3: 개발 서버 실행 확인**

```bash
npm run dev
```

Expected: `http://localhost:3000`에서 Next.js 기본 시작 페이지가 정상적으로 뜬다. 확인 후 서버 종료(Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: initialize Next.js project"
```

---

### Task 2: Vercel Postgres 연결 + Prisma 스키마 + 마이그레이션

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`
- Create: `.env.example`
- Modify: `.gitignore` (`.env*.local` 제외 확인 — create-next-app이 기본 포함하므로 대부분 불필요)

**Interfaces:**
- Consumes: Task 1의 프로젝트 구조
- Produces: `prisma.post` (Prisma Client의 Post 모델 접근자), `lib/prisma.ts`의 `prisma` export — Task 3, 4의 Route Handler가 이 두 가지를 사용함

- [ ] **Step 1: Prisma 설치**

```bash
npm install prisma --save-dev
npm install @prisma/client
npx prisma init
```

- [ ] **Step 2: Vercel 프로젝트 연결 및 Postgres 스토리지 추가**

```bash
npm install -g vercel
vercel login
vercel link
```

프롬프트에 따라 새 프로젝트로 연결(또는 기존 프로젝트 선택)한다.

이후 https://vercel.com 대시보드 → 해당 프로젝트 → **Storage** 탭 → **Create Database** → **Postgres** 선택 → 프로젝트에 연결(Connect). 이 과정에서 `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` 등 환경변수가 Vercel 프로젝트 설정에 자동 등록된다.

- [ ] **Step 3: 환경변수 로컬로 가져오기**

```bash
vercel env pull .env.local
```

Expected: `.env.local` 파일이 생성되고 `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` 값이 채워짐.

- [ ] **Step 4: `.env.example` 작성 (커밋용, 실제 값 없이 자리표시자만)**

```
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
```

- [ ] **Step 5: Prisma 스키마 작성**

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String
  author    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 6: Prisma Client 싱글턴 헬퍼 작성**

`lib/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 7: 로컬 마이그레이션 생성 및 적용**

```bash
npx prisma migrate dev --name init
```

Expected: `prisma/migrations/` 아래 마이그레이션 폴더 생성, "Your database is now in sync with your schema" 메시지 출력.

- [ ] **Step 8: DB 연결 및 스키마 검증**

```bash
npx prisma studio
```

Expected: 브라우저에 Prisma Studio가 열리고 `Post` 테이블이 빈 상태로 보임 (컬럼: id, title, content, author, createdAt, updatedAt). 확인 후 종료(Ctrl+C).

- [ ] **Step 9: Commit**

```bash
git add prisma lib/prisma.ts .env.example package.json package-lock.json
git commit -m "feat: add Prisma schema and Vercel Postgres connection"
```

(`.env.local`은 `.gitignore`에 의해 자동 제외되어야 한다 — `git status`로 포함되지 않았는지 확인)

---

### Task 3: `/api/posts` Route Handler — Create + Read(목록)

**Files:**
- Create: `app/api/posts/route.ts`

**Interfaces:**
- Consumes: `lib/prisma.ts`의 `prisma` (Task 2)
- Produces: `GET /api/posts` (Post[] 반환), `POST /api/posts` (Post 생성, body: `{title, content, author?}`) — Task 5, 6의 프론트엔드 페이지가 이 엔드포인트를 호출함

- [ ] **Step 1: Route Handler 작성**

`app/api/posts/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(posts);
  } catch {
    return NextResponse.json({ error: "목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, content, author } = body;

  if (!title || !content) {
    return NextResponse.json(
      { error: "title과 content는 필수입니다." },
      { status: 400 }
    );
  }

  try {
    const post = await prisma.post.create({
      data: { title, content, author: author || null },
    });
    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json({ error: "글 작성에 실패했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 2: 개발 서버 실행**

```bash
npm run dev
```

- [ ] **Step 3: POST로 글 생성 확인 (curl)**

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"첫 글\",\"content\":\"내용입니다\",\"author\":\"테스터\"}"
```

Expected: HTTP 201, `{"id":1,"title":"첫 글","content":"내용입니다","author":"테스터",...}` 형태 JSON 응답

- [ ] **Step 4: 검증 실패(400) 확인**

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"\"}"
```

Expected: HTTP 400, `{"error":"title과 content는 필수입니다."}`

- [ ] **Step 5: GET으로 목록 조회 확인**

```bash
curl http://localhost:3000/api/posts
```

Expected: HTTP 200, Step 3에서 생성한 글이 포함된 배열 반환

- [ ] **Step 6: Commit**

```bash
git add app/api/posts/route.ts
git commit -m "feat: add POST/GET /api/posts route handler"
```

---

### Task 4: `/api/posts/[id]` Route Handler — Read(상세) + Update + Delete

**Files:**
- Create: `app/api/posts/[id]/route.ts`

**Interfaces:**
- Consumes: `lib/prisma.ts`의 `prisma` (Task 2)
- Produces: `GET /api/posts/:id`, `PUT /api/posts/:id` (body: `{title, content, author?}`), `DELETE /api/posts/:id` — Task 7, 8의 프론트엔드 페이지가 이 엔드포인트를 호출함

- [ ] **Step 1: Route Handler 작성**

`app/api/posts/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const post = await prisma.post.findUnique({ where: { id: Number(id) } });
    if (!post) {
      return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "글을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const { title, content, author } = body;

  if (!title || !content) {
    return NextResponse.json(
      { error: "title과 content는 필수입니다." },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.post.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
    }

    const updated = await prisma.post.update({
      where: { id: Number(id) },
      data: { title, content, author: author || null },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const existing = await prisma.post.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
    }

    await prisma.post.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "삭제에 실패했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 2: 개발 서버 실행**

```bash
npm run dev
```

- [ ] **Step 3: GET 상세 조회 확인 (Task 3에서 만든 id=1 사용)**

```bash
curl http://localhost:3000/api/posts/1
```

Expected: HTTP 200, `{"id":1,"title":"첫 글",...}`

- [ ] **Step 4: 존재하지 않는 id 조회 시 404 확인**

```bash
curl -i http://localhost:3000/api/posts/9999
```

Expected: HTTP 404, `{"error":"글을 찾을 수 없습니다."}`

- [ ] **Step 5: PUT 수정 확인**

```bash
curl -X PUT http://localhost:3000/api/posts/1 \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"수정된 글\",\"content\":\"수정된 내용\",\"author\":\"테스터\"}"
```

Expected: HTTP 200, `{"id":1,"title":"수정된 글",...}`

- [ ] **Step 6: DELETE 삭제 확인**

```bash
curl -X DELETE http://localhost:3000/api/posts/1
```

Expected: HTTP 200, `{"success":true}`. 이후 `curl http://localhost:3000/api/posts/1`은 404를 반환해야 함

- [ ] **Step 7: Commit**

```bash
git add "app/api/posts/[id]/route.ts"
git commit -m "feat: add GET/PUT/DELETE /api/posts/[id] route handler"
```

---

### Task 5: 목록 페이지 UI (Read - List)

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `GET /api/posts` (Task 3)
- Produces: `/` 경로 페이지, `/posts/new`와 `/posts/[id]`로의 링크 — Task 6, 7이 연결 대상

- [ ] **Step 1: 목록 페이지 작성**

`app/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Post = {
  id: number;
  title: string;
  author: string | null;
  createdAt: string;
};

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/posts")
      .then((res) => res.json())
      .then(setPosts)
      .catch(() => setError("목록을 불러오지 못했습니다."));
  }, []);

  return (
    <main>
      <h1>게시판</h1>
      <Link href="/posts/new">글쓰기</Link>
      {error && <p>{error}</p>}
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/posts/${post.id}`}>{post.title}</Link>
            {" - "}
            {post.author ?? "익명"}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: 개발 서버 실행 후 수동 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

Expected: Task 3~4에서 curl로 만든 글 목록이 표시됨 (없다면 curl로 글 하나를 다시 생성한 뒤 새로고침). "글쓰기" 링크가 보임.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add post list page"
```

---

### Task 6: 글쓰기 폼 UI (Create)

**Files:**
- Create: `app/posts/new/page.tsx`

**Interfaces:**
- Consumes: `POST /api/posts` (Task 3)
- Produces: `/posts/new` 경로 페이지 — Task 5의 "글쓰기" 링크가 연결하는 대상

- [ ] **Step 1: 작성 폼 작성**

`app/posts/new/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, author }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "작성에 실패했습니다.");
      return;
    }

    router.push("/");
  }

  return (
    <main>
      <h1>글쓰기</h1>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <input
          placeholder="작성자 (선택)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        {error && <p>{error}</p>}
        <button type="submit">등록</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: 수동 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000/posts/new` 접속 → 제목/내용 입력 후 "등록" 클릭.

Expected: `/`로 리다이렉트되고 목록에 새 글이 나타남. 제목을 비운 채 등록 시 에러 메시지가 화면에 표시됨.

- [ ] **Step 3: Commit**

```bash
git add app/posts/new/page.tsx
git commit -m "feat: add post creation form page"
```

---

### Task 7: 상세 페이지 UI (Read - Detail + Delete)

**Files:**
- Create: `app/posts/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/posts/:id`, `DELETE /api/posts/:id` (Task 4)
- Produces: `/posts/[id]` 경로 페이지, `/posts/[id]/edit`로의 링크 — Task 5의 목록 링크가 연결하는 대상, Task 8이 연결받는 대상

- [ ] **Step 1: 상세 페이지 작성**

`app/posts/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Post = {
  id: number;
  title: string;
  content: string;
  author: string | null;
};

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setPost)
      .catch(() => setError("글을 찾을 수 없습니다."));
  }, [id]);

  async function handleDelete() {
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    router.push("/");
  }

  if (error) return <p>{error}</p>;
  if (!post) return <p>불러오는 중...</p>;

  return (
    <main>
      <h1>{post.title}</h1>
      <p>작성자: {post.author ?? "익명"}</p>
      <p>{post.content}</p>
      <Link href={`/posts/${id}/edit`}>수정</Link>
      <button onClick={handleDelete}>삭제</button>
    </main>
  );
}
```

- [ ] **Step 2: 수동 확인**

브라우저에서 목록 페이지의 글 제목을 클릭 → 상세 페이지 이동.

Expected: 제목/작성자/내용이 정확히 표시됨. "삭제" 클릭 시 목록으로 돌아가고 해당 글이 목록에서 사라짐.

- [ ] **Step 3: Commit**

```bash
git add "app/posts/[id]/page.tsx"
git commit -m "feat: add post detail page with delete action"
```

---

### Task 8: 수정 폼 UI (Update)

**Files:**
- Create: `app/posts/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `GET /api/posts/:id`, `PUT /api/posts/:id` (Task 4)
- Produces: `/posts/[id]/edit` 경로 페이지 — Task 7의 "수정" 링크가 연결하는 대상

- [ ] **Step 1: 수정 폼 작성**

`app/posts/[id]/edit/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then((res) => res.json())
      .then((post) => {
        setTitle(post.title);
        setContent(post.content);
        setAuthor(post.author ?? "");
        setLoaded(true);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, author }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "수정에 실패했습니다.");
      return;
    }

    router.push(`/posts/${id}`);
  }

  if (!loaded) return <p>불러오는 중...</p>;

  return (
    <main>
      <h1>글 수정</h1>
      <form onSubmit={handleSubmit}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} />
        <input value={author} onChange={(e) => setAuthor(e.target.value)} />
        {error && <p>{error}</p>}
        <button type="submit">저장</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: 수동 확인**

상세 페이지에서 "수정" 클릭 → 폼에 기존 값이 채워져 있는지 확인 → 제목/내용 변경 후 "저장" 클릭.

Expected: 상세 페이지(`/posts/[id]`)로 돌아가고 변경된 내용이 반영되어 표시됨.

- [ ] **Step 3: Commit**

```bash
git add "app/posts/[id]/edit/page.tsx"
git commit -m "feat: add post edit form page"
```

---

### Task 9: Vercel 배포 설정 및 배포 확인

**Files:**
- Modify: `package.json` (`vercel-build` 스크립트 추가)

**Interfaces:**
- Consumes: Task 1~8에서 완성된 전체 애플리케이션
- Produces: 배포된 프로덕션 URL — 이 계획의 최종 산출물

- [ ] **Step 1: `vercel-build` 스크립트 추가**

`package.json`의 `scripts`에 추가:

```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

(Vercel은 빌드 시 `vercel-build` 스크립트가 있으면 `next build` 대신 이를 우선 실행하므로, 배포마다 마이그레이션이 자동 적용된다.)

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add vercel-build script for automatic migration deploy"
```

- [ ] **Step 3: Vercel에 배포**

```bash
vercel --prod
```

Expected: 빌드 로그에 `prisma generate`, `prisma migrate deploy`, `next build`가 순서대로 성공하고, 최종적으로 프로덕션 URL이 출력됨.

- [ ] **Step 4: 배포된 앱에서 5가지 CRUD 흐름 수동 재확인**

배포 URL에 접속하여 확인:
1. 글쓰기(Create) → 목록에 반영되는지
2. 목록(Read-List) → 상세 페이지 이동
3. 상세(Read-Detail) → 내용이 정확히 표시되는지
4. 수정(Update) → 변경 사항이 저장/반영되는지
5. 삭제(Delete) → 목록에서 사라지는지

Expected: 로컬에서 확인한 것과 동일하게 5가지 흐름이 모두 정상 동작함.

---

## 구현 완료 후 다음 단계 (이 계획의 범위 밖)

전체 Task가 끝나면 `code-tutorial-builder` 스킬을 사용해 완성된 코드베이스를 기반으로 CRUD 흐름을 설명하는 학습용 마크다운 교재를 생성한다 (설계 문서 "학습 문서화" 섹션 참조). 이 작업은 별도 요청 시 진행한다.
