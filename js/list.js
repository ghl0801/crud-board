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
