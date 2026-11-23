import { pool } from '../server/db.js';

async function runMigration() {
  try {
    console.log('Running TiDB Cloud schema migration for Advanced Comment System...');

    // 1. Migrate comments table columns
    const [commCols] = await pool.query('DESCRIBE comments');
    const existingCols = new Set(commCols.map(c => c.Field));

    if (!existingCols.has('gif_url')) {
      await pool.query('ALTER TABLE comments ADD COLUMN gif_url TEXT DEFAULT NULL');
      console.log('✓ added gif_url to comments');
    }
    if (!existingCols.has('candle_count')) {
      await pool.query('ALTER TABLE comments ADD COLUMN candle_count INT DEFAULT 0');
      console.log('✓ added candle_count to comments');
    }
    if (!existingCols.has('is_reported')) {
      await pool.query('ALTER TABLE comments ADD COLUMN is_reported TINYINT(1) DEFAULT 0');
      console.log('✓ added is_reported to comments');
    }
    if (!existingCols.has('report_count')) {
      await pool.query('ALTER TABLE comments ADD COLUMN report_count INT DEFAULT 0');
      console.log('✓ added report_count to comments');
    }
    if (!existingCols.has('is_hidden')) {
      await pool.query('ALTER TABLE comments ADD COLUMN is_hidden TINYINT(1) DEFAULT 0');
      console.log('✓ added is_hidden to comments');
    }
    if (!existingCols.has('is_warmth')) {
      await pool.query('ALTER TABLE comments ADD COLUMN is_warmth TINYINT(1) DEFAULT 0');
      console.log('✓ added is_warmth to comments');
    }

    // 2. Create comment_reactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comment_reactions (
        id VARCHAR(64) PRIMARY KEY,
        comment_id VARCHAR(64) NOT NULL,
        identity_id VARCHAR(64) NOT NULL,
        reaction_type VARCHAR(32) NOT NULL,
        created_at BIGINT NOT NULL,
        UNIQUE KEY uq_comment_identity (comment_id, identity_id),
        INDEX idx_comm_rx_comment (comment_id),
        INDEX idx_comm_rx_identity (identity_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ comment_reactions table verified/created');

    // 3. Create comment_candles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comment_candles (
        id VARCHAR(64) PRIMARY KEY,
        comment_id VARCHAR(64) NOT NULL,
        identity_id VARCHAR(64) NOT NULL,
        created_at BIGINT NOT NULL,
        UNIQUE KEY uq_comment_candle (comment_id, identity_id),
        INDEX idx_comm_candle_comment (comment_id),
        INDEX idx_comm_candle_identity (identity_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ comment_candles table verified/created');

    // 4. Create comment_reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comment_reports (
        id VARCHAR(64) PRIMARY KEY,
        comment_id VARCHAR(64) NOT NULL,
        echo_id VARCHAR(64) NOT NULL,
        reporter_id VARCHAR(64) DEFAULT NULL,
        reason VARCHAR(255) NOT NULL,
        details TEXT,
        created_at BIGINT NOT NULL,
        INDEX idx_cr_comment (comment_id),
        INDEX idx_cr_echo (echo_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ comment_reports table verified/created');

    console.log('🎉 Advanced Comment System TiDB migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
