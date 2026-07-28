# 순수 CRUD 게시판 (학습용, HTML/CSS/JS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인증 없는 순수 CRUD 게시판을 프레임워크·빌드 도구 없이 HTML/CSS/JS + Vercel Functions + Postgres로 구현하고 Vercel 무료 티어에 배포한다.

**Architecture:** 정적 파일(HTML/CSS/JS)과 서버리스 함수(`/api`)를 같은 Vercel 프로젝트에서 서빙한다. 브라우저의 순수 JS가 `fetch`로 `/api/posts` 계열 엔드포인트를 호출하고, 각 함수는 `pg`로 Postgres에 직접 SQL을 실행한다. 프레임워크·ORM 없이 요청→함수→SQL→DB→응답 흐름 각 단계가 코드에 그대로 드러난다.

**Tech Stack:** 순수 HTML/CSS/JavaScript (빌드 도구 없음), Vercel Functions(Node.js, 프레임워크 없음), `pg`(node-postgres) raw SQL, Postgres(Vercel Marketplace/Neon), Vercel 배포.

## Global Constraints

- 인증/로그인 없음. 권한 제한 없음 (누구나 모든 글 수정/삭제 가능)
- 프레임워크·빌드 도구 금지 (React, Next.js, Express, 번들러 등 사용 안 함) — 정적 HTML/CSS/JS + Vercel Functions만 사용
- ORM 금지 — `pg` 패키지로 SQL을 직접 작성
- 범위는 CRUD 5개 동작(Create, Read-List, Read-Detail, Update, Delete)에 한정. 댓글/검색/페이지네이션 추가 금지
- 데이터 모델은 `posts(id, title, content, author?, created_at, updated_at)` 고정 (스펙: `docs/superpowers/specs/2026-07-28-crud-board-design.md`)
- 자동화 테스트 프레임워크(Jest 등) 도입 안 함 — 검증은 curl과 수동 브라우저 확인으로 수행
- API 응답 상태 코드: 성공 200/201, 검증 실패 400, 미존재 404, 지원하지 않는 메서드 405, 그 외 예외 500
- 로컬 개발은 반드시 `vercel dev`로 실행 (일반 정적 서버는 `/api` 함수를 실행하지 못함)
- DB 연결 문자열 환경변수 이름은 `DATABASE_URL` 또는 `POSTGRES_URL` 둘 다 대비 (Vercel Marketplace 연동에 따라 다를 수 있음) — 코드에서 `process.env.DATABASE_URL || process.env.POSTGRES_URL`로 둘 다 지원

---

### Task 1: 프로젝트 초기화 및 Vercel 프로젝트 연결

**Files:**
- Create: `package.json`
- Create: `.gitignore`

**Interfaces:**
- Consumes: 없음 (최초 작업)
- Produces: `pg` 의존성이 설치된 npm 프로젝트, Vercel에 연결된 프로젝트(`.vercel/project.json`) — Task 2 이후 모든 작업이 이 위에서 진행됨

- [ ] **Step 1: npm 프로젝트 초기화 및 `pg` 설치**

프로젝트 루트(`C:\Claude System\08_Claude관련\계시판`)에서 실행:

```bash
npm init -y
npm install pg
```

- [ ] **Step 2: `.gitignore` 작성**

```
node_modules/
.vercel/
.env*.local
```

- [ ] **Step 3: Vercel CLI 설치 및 로그인/연결**

```bash
npm install -g vercel
vercel login
vercel link
```

`vercel link` 프롬프트에서 새 프로젝트로 연결(또는 기존 프로젝트 선택)한다.

- [ ] **Step 4: 검증**

```bash
cat package.json
```

Expected: `"dependencies": { "pg": "^8.x.x" }` 포함

```bash
ls .vercel
```

Expected: `project.json` 파일 존재 (Vercel 프로젝트에 연결됨을 의미)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: initialize npm project and link Vercel project"
```

(`.vercel/`은 `.gitignore`에 의해 커밋되지 않아야 한다 — `git status`로 확인)

---

### Task 2: Postgres 생성 + `posts` 테이블 + DB 연결 헬퍼

**Files:**
- Create: `api/db.js`
- Create: `.env.example`

**Interfaces:**
- Consumes: Task 1의 Vercel 프로젝트 연결
- Produces: `getPool()` (api/db.js가 export하는 함수, `pg.Pool` 인스턴스 반환) — Task 3, 4의 API 함수가 이 함수를 사용함. `posts` 테이블(id, title, content, author, created_at, updated_at)

- [ ] **Step 1: Vercel 대시보드에서 Postgres 생성**

https://vercel.com 대시보드 → 해당 프로젝트 → **Storage** 탭 → **Marketplace Database Providers** → **Postgres**(Neon 등) 선택 → 생성 후 프로젝트에 연결(Connect). 이 과정에서 `DATABASE_URL` 또는 `POSTGRES_URL` 계열 환경변수가 Vercel 프로젝트 설정에 자동 등록된다.

- [ ] **Step 2: 환경변수 로컬로 가져오기**

```bash
vercel env pull .env.local
```

Expected: `.env.local` 파일 생성. 내용을 확인해 실제 변수 이름이 `DATABASE_URL`인지 `POSTGRES_URL`인지 확인한다:

```bash
cat .env.local
```

- [ ] **Step 3: `.env.example` 작성 (커밋용, 실제 값 없이 자리표시자만)**

```
DATABASE_URL=
```

- [ ] **Step 4: `posts` 테이블 생성**

Vercel 대시보드의 Storage → 해당 DB → **Query** 탭(SQL 편집기)에서 아래 DDL 실행:

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

- [ ] **Step 5: DB 연결 헬퍼 작성**

`api/db.js`:

```js
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    });
  }
  return pool;
}

module.exports = { getPool };
```

- [ ] **Step 6: 연결 및 테이블 검증**

프로젝트 루트에서 임시 검증 스크립트를 실행한다 (커밋하지 않음):

```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { getPool } = require('./api/db');
getPool().query('SELECT * FROM posts').then((r) => {
  console.log('rows:', r.rows.length);
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
"
```

이 명령이 `dotenv` 모듈을 요구하면 먼저 `npm install --no-save dotenv`로 임시 설치한다 (package.json에는 남기지 않음 — 실제 배포 시 Vercel이 환경변수를 자동 주입하므로 `dotenv`는 로컬 검증에만 필요).

Expected: `rows: 0` 출력 (빈 테이블, 에러 없음)

- [ ] **Step 7: Commit**

```bash
git add api/db.js .env.example
git commit -m "feat: add Postgres connection helper and posts table"
```

---

### Task 3: `api/posts.js` — Create + Read(목록)

**Files:**
- Create: `api/posts.js`

**Interfaces:**
- Consumes: `api/db.js`의 `getPool()` (Task 2)
- Produces: `GET /api/posts` (배열 반환), `POST /api/posts` (body: `{title, content, author?}`) — Task 5, 6의 프론트엔드가 이 엔드포인트를 호출함

- [ ] **Step 1: 함수 작성**

`api/posts.js`:

```js
const { getPool } = require('./db');

module.exports = async function handler(request, response) {
  const pool = getPool();

  if (request.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
      return response.status(200).json(result.rows);
    } catch (error) {
      return response.status(500).json({ error: '목록을 불러오지 못했습니다.' });
    }
  }

  if (request.method === 'POST') {
    const { title, content, author } = request.body;

    if (!title || !content) {
      return response.status(400).json({ error: 'title과 content는 필수입니다.' });
    }

    try {
      const result = await pool.query(
        'INSERT INTO posts (title, content, author) VALUES ($1, $2, $3) RETURNING *',
        [title, content, author || null]
      );
      return response.status(201).json(result.rows[0]);
    } catch (error) {
      return response.status(500).json({ error: '글 작성에 실패했습니다.' });
    }
  }

  return response.status(405).json({ error: '지원하지 않는 메서드입니다.' });
};
```

- [ ] **Step 2: 로컬 개발 서버 실행**

```bash
vercel dev
```

Expected: `http://localhost:3000`에서 서버가 뜬다 (첫 실행 시 설정 확인 프롬프트가 나오면 기본값 수락).

- [ ] **Step 3: POST로 글 생성 확인 (curl, 새 터미널에서)**

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"첫 글\",\"content\":\"내용입니다\",\"author\":\"테스터\"}"
```

Expected: HTTP 201, `{"id":1,"title":"첫 글","content":"내용입니다","author":"테스터",...}` 형태 JSON 응답

- [ ] **Step 4: 검증 실패(400) 확인**

```bash
curl -i -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"\"}"
```

Expected: HTTP 400, `{"error":"title과 content는 필수입니다."}`

- [ ] **Step 5: GET으로 목록 조회 확인**

```bash
curl http://localhost:3000/api/posts
```

Expected: HTTP 200, Step 3에서 생성한 글이 포함된 배열 반환

- [ ] **Step 6: 지원하지 않는 메서드(405) 확인**

```bash
curl -i -X PATCH http://localhost:3000/api/posts
```

Expected: HTTP 405

- [ ] **Step 7: Commit**

```bash
git add api/posts.js
git commit -m "feat: add POST/GET /api/posts function"
```

---

### Task 4: `api/posts/[id].js` — Read(상세) + Update + Delete

**Files:**
- Create: `api/posts/[id].js`

**Interfaces:**
- Consumes: `api/db.js`의 `getPool()` (Task 2)
- Produces: `GET /api/posts/:id`, `PUT /api/posts/:id`(body: `{title, content, author?}`), `DELETE /api/posts/:id` — Task 7, 8의 프론트엔드가 이 엔드포인트를 호출함

- [ ] **Step 1: 함수 작성**

`api/posts/[id].js`:

```js
const { getPool } = require('../db');

module.exports = async function handler(request, response) {
  const pool = getPool();
  const { id } = request.query;

  if (request.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return response.status(404).json({ error: '글을 찾을 수 없습니다.' });
      }
      return response.status(200).json(result.rows[0]);
    } catch (error) {
      return response.status(500).json({ error: '글을 불러오지 못했습니다.' });
    }
  }

  if (request.method === 'PUT') {
    const { title, content, author } = request.body;

    if (!title || !content) {
      return response.status(400).json({ error: 'title과 content는 필수입니다.' });
    }

    try {
      const existing = await pool.query('SELECT id FROM posts WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return response.status(404).json({ error: '글을 찾을 수 없습니다.' });
      }

      const result = await pool.query(
        'UPDATE posts SET title = $1, content = $2, author = $3, updated_at = now() WHERE id = $4 RETURNING *',
        [title, content, author || null, id]
      );
      return response.status(200).json(result.rows[0]);
    } catch (error) {
      return response.status(500).json({ error: '수정에 실패했습니다.' });
    }
  }

  if (request.method === 'DELETE') {
    try {
      const existing = await pool.query('SELECT id FROM posts WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return response.status(404).json({ error: '글을 찾을 수 없습니다.' });
      }

      await pool.query('DELETE FROM posts WHERE id = $1', [id]);
      return response.status(200).json({ success: true });
    } catch (error) {
      return response.status(500).json({ error: '삭제에 실패했습니다.' });
    }
  }

  return response.status(405).json({ error: '지원하지 않는 메서드입니다.' });
};
```

- [ ] **Step 2: 개발 서버 실행 (아직 안 떠 있다면)**

```bash
vercel dev
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
git add "api/posts/[id].js"
git commit -m "feat: add GET/PUT/DELETE /api/posts/[id] function"
```

---

### Task 5: 목록 페이지 (Read - List)

**Files:**
- Create: `css/style.css`
- Create: `js/api.js`
- Create: `js/list.js`
- Create: `index.html`

**Interfaces:**
- Consumes: `GET /api/posts` (Task 3)
- Produces: `js/api.js`의 전역 함수 `fetchPosts()`, `fetchPost(id)`, `createPost(data)`, `updatePost(id, data)`, `deletePost(id)` — Task 6, 7, 8이 그대로 재사용함. `index.html`, `new.html`/`post.html`로의 링크

- [ ] **Step 1: 공통 CSS 작성**

`css/style.css`:

```css
body {
  font-family: sans-serif;
  max-width: 600px;
  margin: 40px auto;
  padding: 0 16px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

textarea {
  min-height: 120px;
}

#error {
  color: red;
}

ul#post-list {
  list-style: none;
  padding: 0;
}

ul#post-list li {
  padding: 8px 0;
  border-bottom: 1px solid #ddd;
}
```

- [ ] **Step 2: 공통 fetch 헬퍼 작성**

`js/api.js`:

```js
const API_BASE = '/api/posts';

async function fetchPosts() {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('목록을 불러오지 못했습니다.');
  return res.json();
}

async function fetchPost(id) {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('글을 찾을 수 없습니다.');
  return res.json();
}

async function createPost(data) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || '작성에 실패했습니다.');
  return body;
}

async function updatePost(id, data) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || '수정에 실패했습니다.');
  return body;
}

async function deletePost(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('삭제에 실패했습니다.');
  return res.json();
}
```

- [ ] **Step 3: 목록 페이지 스크립트 작성**

`js/list.js`:

```js
async function renderList() {
  const listEl = document.getElementById('post-list');
  const errorEl = document.getElementById('error');

  try {
    const posts = await fetchPosts();
    listEl.innerHTML = posts
      .map(
        (post) =>
          `<li><a href="post.html?id=${post.id}">${post.title}</a> - ${post.author ?? '익명'}</li>`
      )
      .join('');
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

renderList();
```

- [ ] **Step 4: 목록 페이지 HTML 작성**

`index.html`:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>게시판</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <main>
    <h1>게시판</h1>
    <a href="new.html">글쓰기</a>
    <p id="error"></p>
    <ul id="post-list"></ul>
  </main>
  <script src="js/api.js"></script>
  <script src="js/list.js"></script>
</body>
</html>
```

- [ ] **Step 5: 수동 확인**

```bash
vercel dev
```

브라우저에서 `http://localhost:3000` 접속 (없다면 curl로 글 하나를 다시 생성한 뒤 새로고침).

Expected: Task 3~4에서 만든 글 목록이 표시됨. "글쓰기" 링크가 보임.

- [ ] **Step 6: Commit**

```bash
git add css/style.css js/api.js js/list.js index.html
git commit -m "feat: add post list page"
```

---

### Task 6: 글쓰기 폼 (Create)

**Files:**
- Create: `js/new.js`
- Create: `new.html`

**Interfaces:**
- Consumes: `js/api.js`의 `createPost()` (Task 5)
- Produces: `new.html` — Task 5의 "글쓰기" 링크가 연결하는 대상

- [ ] **Step 1: 스크립트 작성**

`js/new.js`:

```js
document.getElementById('new-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('error');

  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;
  const author = document.getElementById('author').value;

  try {
    await createPost({ title, content, author });
    window.location.href = 'index.html';
  } catch (error) {
    errorEl.textContent = error.message;
  }
});
```

- [ ] **Step 2: HTML 작성**

`new.html`:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>글쓰기</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <main>
    <h1>글쓰기</h1>
    <form id="new-form">
      <input id="title" placeholder="제목" />
      <textarea id="content" placeholder="내용"></textarea>
      <input id="author" placeholder="작성자 (선택)" />
      <p id="error"></p>
      <button type="submit">등록</button>
    </form>
  </main>
  <script src="js/api.js"></script>
  <script src="js/new.js"></script>
</body>
</html>
```

- [ ] **Step 3: 수동 확인**

`vercel dev` 실행 중인 상태에서 브라우저로 `http://localhost:3000/new.html` 접속 → 제목/내용 입력 후 "등록" 클릭.

Expected: `index.html`로 리다이렉트되고 목록에 새 글이 나타남. 제목을 비운 채 등록 시 에러 메시지가 화면에 표시됨.

- [ ] **Step 4: Commit**

```bash
git add js/new.js new.html
git commit -m "feat: add post creation form page"
```

---

### Task 7: 상세 페이지 (Read - Detail + Delete)

**Files:**
- Create: `js/post.js`
- Create: `post.html`

**Interfaces:**
- Consumes: `js/api.js`의 `fetchPost()`, `deletePost()` (Task 5)
- Produces: `post.html?id=` — Task 5의 목록 링크가 연결하는 대상, Task 8이 연결받는 대상

- [ ] **Step 1: 스크립트 작성**

`js/post.js`:

```js
const params = new URLSearchParams(window.location.search);
const id = params.get('id');

async function renderPost() {
  const errorEl = document.getElementById('error');

  try {
    const post = await fetchPost(id);
    document.getElementById('title').textContent = post.title;
    document.getElementById('author').textContent = `작성자: ${post.author ?? '익명'}`;
    document.getElementById('content').textContent = post.content;
    document.getElementById('edit-link').href = `edit.html?id=${id}`;
  } catch (error) {
    errorEl.textContent = error.message;
    document.getElementById('post-view').style.display = 'none';
  }
}

document.getElementById('delete-btn').addEventListener('click', async () => {
  try {
    await deletePost(id);
    window.location.href = 'index.html';
  } catch (error) {
    document.getElementById('error').textContent = error.message;
  }
});

renderPost();
```

- [ ] **Step 2: HTML 작성**

`post.html`:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>글 상세</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <main>
    <p id="error"></p>
    <div id="post-view">
      <h1 id="title"></h1>
      <p id="author"></p>
      <p id="content"></p>
      <a id="edit-link" href="#">수정</a>
      <button id="delete-btn">삭제</button>
    </div>
  </main>
  <script src="js/api.js"></script>
  <script src="js/post.js"></script>
</body>
</html>
```

- [ ] **Step 3: 수동 확인**

브라우저에서 목록 페이지의 글 제목을 클릭 → 상세 페이지 이동.

Expected: 제목/작성자/내용이 정확히 표시됨. "삭제" 클릭 시 목록으로 돌아가고 해당 글이 목록에서 사라짐.

- [ ] **Step 4: Commit**

```bash
git add js/post.js post.html
git commit -m "feat: add post detail page with delete action"
```

---

### Task 8: 수정 폼 (Update)

**Files:**
- Create: `js/edit.js`
- Create: `edit.html`

**Interfaces:**
- Consumes: `js/api.js`의 `fetchPost()`, `updatePost()` (Task 5)
- Produces: `edit.html?id=` — Task 7의 "수정" 링크가 연결하는 대상

- [ ] **Step 1: 스크립트 작성**

`js/edit.js`:

```js
const params = new URLSearchParams(window.location.search);
const id = params.get('id');

async function loadPost() {
  const errorEl = document.getElementById('error');
  try {
    const post = await fetchPost(id);
    document.getElementById('title').value = post.title;
    document.getElementById('content').value = post.content;
    document.getElementById('author').value = post.author ?? '';
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

document.getElementById('edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('error');

  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;
  const author = document.getElementById('author').value;

  try {
    await updatePost(id, { title, content, author });
    window.location.href = `post.html?id=${id}`;
  } catch (error) {
    errorEl.textContent = error.message;
  }
});

loadPost();
```

- [ ] **Step 2: HTML 작성**

`edit.html`:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>글 수정</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <main>
    <h1>글 수정</h1>
    <form id="edit-form">
      <input id="title" />
      <textarea id="content"></textarea>
      <input id="author" />
      <p id="error"></p>
      <button type="submit">저장</button>
    </form>
  </main>
  <script src="js/api.js"></script>
  <script src="js/edit.js"></script>
</body>
</html>
```

- [ ] **Step 3: 수동 확인**

상세 페이지에서 "수정" 클릭 → 폼에 기존 값이 채워져 있는지 확인 → 제목/내용 변경 후 "저장" 클릭.

Expected: 상세 페이지(`post.html?id=`)로 돌아가고 변경된 내용이 반영되어 표시됨.

- [ ] **Step 4: Commit**

```bash
git add js/edit.js edit.html
git commit -m "feat: add post edit form page"
```

---

### Task 9: Vercel 배포 및 배포 확인

**Files:**
- 없음 (배포 및 검증만 수행)

**Interfaces:**
- Consumes: Task 1~8에서 완성된 전체 애플리케이션
- Produces: 배포된 프로덕션 URL — 이 계획의 최종 산출물

- [ ] **Step 1: 프로덕션 배포**

```bash
vercel --prod
```

Expected: 빌드/배포 로그가 성공적으로 완료되고 최종 프로덕션 URL이 출력됨. (프레임워크가 없으므로 별도 빌드 스크립트 없이 정적 파일과 `/api` 함수가 그대로 배포된다)

- [ ] **Step 2: 배포된 앱에서 환경변수 확인**

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables에서 Task 2의 Postgres 연결 변수(`DATABASE_URL` 또는 `POSTGRES_URL`)가 Production 환경에 등록되어 있는지 확인한다.

- [ ] **Step 3: 배포된 앱에서 5가지 CRUD 흐름 수동 확인**

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
