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
