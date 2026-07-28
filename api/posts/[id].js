const { getPool } = require('../_db');

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
    const { title, content, author } = request.body || {};

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
