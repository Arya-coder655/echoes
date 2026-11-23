import { pool } from '../server/db.js';

async function run() {
  console.log('Running TiDB Cloud migration to remove Candle feature and add is_deleted...');

  try {
    // 1. Remove candle notifications from notifications table
    const [notifResult] = await pool.query("DELETE FROM notifications WHERE type = 'comment_candle'");
    console.log(`✓ Removed ${notifResult.affectedRows || 0} candle notifications`);

    // 2. Drop comment_candles table
    await pool.query('DROP TABLE IF EXISTS comment_candles');
    console.log('✓ Successfully dropped comment_candles table');

    // 3. Inspect comments columns
    const [cols] = await pool.query('DESCRIBE comments');
    const colNames = new Set(cols.map(c => c.Field));

    if (colNames.has('candle_count')) {
      await pool.query('ALTER TABLE comments DROP COLUMN candle_count');
      console.log('✓ Successfully dropped candle_count column from comments');
    } else {
      console.log('✓ candle_count column already absent from comments');
    }

    if (!colNames.has('is_deleted')) {
      await pool.query('ALTER TABLE comments ADD COLUMN is_deleted TINYINT(1) DEFAULT 0');
      console.log('✓ Successfully added is_deleted column to comments');
    } else {
      console.log('✓ is_deleted column already present in comments');
    }

    console.log('🎉 TiDB Cloud migration to remove Candle completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
