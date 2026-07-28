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
