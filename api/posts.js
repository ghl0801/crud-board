const { getPool } = require('./_db');

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
    const { title, content, author } = request.body || {};

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
