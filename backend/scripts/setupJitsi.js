const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Setup script to add Jitsi columns to events table
 * Run with: node backend/scripts/setupJitsi.js
 */

async function setupJitsi() {
  console.log('🚀 Starting Jitsi integration setup...\n');

  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '../DB/add_jitsi_columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Running database migration...');
    await pool.query(sql);
    console.log('✅ Database migration completed successfully!\n');

    // Verify columns were added
    console.log('🔍 Verifying columns...');
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'events' 
      AND column_name IN ('jitsi_room', 'jitsi_password')
      ORDER BY column_name;
    `);

    if (result.rows.length === 2) {
      console.log('✅ Columns verified:');
      result.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}(${col.character_maximum_length})`);
      });
    } else {
      console.log('⚠️  Warning: Expected 2 columns but found', result.rows.length);
    }

    // Check if any events need Jitsi credentials
    console.log('\n📊 Checking existing approved events...');
    const eventsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM events
      WHERE approval_status = 'approved' 
      AND jitsi_room IS NULL;
    `);

    const eventsNeedingCredentials = parseInt(eventsResult.rows[0].count);
    
    if (eventsNeedingCredentials > 0) {
      console.log(`⚠️  Found ${eventsNeedingCredentials} approved event(s) without Jitsi credentials.`);
      console.log('   These events were approved before Jitsi integration.');
      console.log('   You can either:');
      console.log('   1. Re-approve them through the admin panel');
      console.log('   2. Run the backfill script (if created)');
      console.log('   3. Manually generate credentials for them\n');
    } else {
      console.log('✅ All approved events have Jitsi credentials (or no approved events yet)\n');
    }

    console.log('🎉 Jitsi integration setup completed successfully!');
    console.log('\n📚 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Use the JitsiMeeting component in your frontend');
    console.log('   3. Test by approving a new event');
    console.log('   4. Check JITSI_INTEGRATION.md for usage details\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupJitsi();
