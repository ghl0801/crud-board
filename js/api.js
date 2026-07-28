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
