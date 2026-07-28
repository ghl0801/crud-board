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
