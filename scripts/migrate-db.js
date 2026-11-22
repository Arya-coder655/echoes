import { pool } from '../server/db.js';

async function runMigration() {
  try {
    console.log('Running TiDB Cloud schema migration for My Echo...');

    // 1. anonymous_identities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS anonymous_identities (
        id VARCHAR(64) PRIMARY KEY,
        secret_hash VARCHAR(128) NOT NULL,
        salt VARCHAR(32) NOT NULL,
        created_at BIGINT NOT NULL,
        last_seen BIGINT NOT NULL,
        INDEX idx_identities_last_seen (last_seen)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ anonymous_identities table verified/created');

    // 2. echoes.author_id column
    const [echoCols] = await pool.query('DESCRIBE echoes');
    if (!echoCols.some(c => c.Field === 'author_id')) {
      await pool.query('ALTER TABLE echoes ADD COLUMN author_id VARCHAR(64) DEFAULT NULL');
      await pool.query('ALTER TABLE echoes ADD INDEX idx_echoes_author (author_id)');
      console.log('✓ added author_id and index to echoes');
    } else {
      console.log('✓ author_id already present in echoes');
    }

    // 3. comments.author_id & comments.parent_id columns
    const [commCols] = await pool.query('DESCRIBE comments');
    if (!commCols.some(c => c.Field === 'author_id')) {
      await pool.query('ALTER TABLE comments ADD COLUMN author_id VARCHAR(64) DEFAULT NULL');
      await pool.query('ALTER TABLE comments ADD INDEX idx_comments_author (author_id)');
      console.log('✓ added author_id and index to comments');
    } else {
      console.log('✓ author_id already present in comments');
    }

    if (!commCols.some(c => c.Field === 'parent_id')) {
      await pool.query('ALTER TABLE comments ADD COLUMN parent_id VARCHAR(64) DEFAULT NULL');
      await pool.query('ALTER TABLE comments ADD INDEX idx_comments_parent (parent_id)');
      console.log('✓ added parent_id and index to comments');
    } else {
      console.log('✓ parent_id already present in comments');
    }

    // 4. bookmarks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id VARCHAR(64) PRIMARY KEY,
        identity_id VARCHAR(64) NOT NULL,
        echo_id VARCHAR(64) NOT NULL,
        created_at BIGINT NOT NULL,
        UNIQUE KEY uq_identity_echo (identity_id, echo_id),
        INDEX idx_bookmarks_identity (identity_id),
        INDEX idx_bookmarks_echo (echo_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ bookmarks table verified/created');

    // 5. notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(64) PRIMARY KEY,
        recipient_id VARCHAR(64) NOT NULL,
        actor_id VARCHAR(64) DEFAULT NULL,
        type VARCHAR(32) NOT NULL,
        echo_id VARCHAR(64) NOT NULL,
        comment_id VARCHAR(64) DEFAULT NULL,
        snippet TEXT,
        is_read TINYINT(1) DEFAULT 0,
        created_at BIGINT NOT NULL,
        INDEX idx_notif_recipient (recipient_id, is_read),
        INDEX idx_notif_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ notifications table verified/created');

    console.log('🎉 TiDB Cloud Migration for My Echo completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
