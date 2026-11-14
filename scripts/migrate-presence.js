import { pool } from '../server/db.js';

async function migrate() {
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM active_sessions LIKE 'created_at'");
    if (cols.length === 0) {
      console.log('Adding created_at column to active_sessions in TiDB Cloud...');
      await pool.query('ALTER TABLE active_sessions ADD COLUMN created_at BIGINT NOT NULL DEFAULT 0');
      await pool.query('UPDATE active_sessions SET created_at = last_seen WHERE created_at = 0');
      console.log('✅ created_at column added successfully!');
    } else {
      console.log('ℹ️ created_at column already exists in active_sessions.');
    }

    const [desc] = await pool.query('DESCRIBE active_sessions');
    console.log('Active Sessions Schema:', desc);

    const [indexes] = await pool.query('SHOW INDEX FROM active_sessions');
    console.log('Indexes:', indexes.map(i => ({ name: i.Key_name, col: i.Column_name })));

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
