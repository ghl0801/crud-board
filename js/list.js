async function renderList() {
  const listEl = document.getElementById('post-list');
  const errorEl = document.getElementById('error');

  try {
    const posts = await fetchPosts();
    listEl.innerHTML = '';
    for (const post of posts) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `post.html?id=${post.id}`;
      a.textContent = post.title;
      li.appendChild(a);
      li.appendChild(document.createTextNode(` - ${post.author ?? '익명'}`));
      listEl.appendChild(li);
    }
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

renderList();
