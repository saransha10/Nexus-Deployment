const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Enhanced setup script to add Jitsi columns AND meeting_type to events table
 * Run with: node backend/scripts/setupJitsiWithMeetingType.js
 */

async function setupJitsiWithMeetingType() {
  console.log('🚀 Starting enhanced Jitsi integration setup...\n');

  try {
    // Step 1: Add Jitsi columns
    console.log('📝 Step 1: Adding Jitsi columns...');
    const jitsiSql = fs.readFileSync(path.join(__dirname, '../DB/add_jitsi_columns.sql'), 'utf8');
    await pool.query(jitsiSql);
    console.log('✅ Jitsi columns added\n');

    // Step 2: Add meeting_type column
    console.log('📝 Step 2: Adding meeting_type column...');
    const meetingTypeSql = fs.readFileSync(path.join(__dirname, '../DB/add_meeting_type.sql'), 'utf8');
    await pool.query(meetingTypeSql);
    console.log('✅ Meeting type column added\n');

    // Step 3: Verify all columns
    console.log('🔍 Step 3: Verifying columns...');
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'events' 
      AND column_name IN ('jitsi_room', 'jitsi_password', 'meeting_type')
      ORDER BY column_name;
    `);

    if (result.rows.length === 3) {
      console.log('✅ All columns verified:');
      result.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
      });
    } else {
      console.log(`⚠️  Warning: Expected 3 columns but found ${result.rows.length}`);
    }

    // Step 4: Check existing events
    console.log('\n📊 Step 4: Analyzing existing events...');
    
    const stats = await pool.query(`
      SELECT 
        meeting_type,
        COUNT(*) as count
      FROM events
      GROUP BY meeting_type
      ORDER BY meeting_type;
    `);

    console.log('Event distribution by meeting type:');
    stats.rows.forEach(row => {
      console.log(`   - ${row.meeting_type || 'NULL'}: ${row.count} event(s)`);
    });

    // Check for events needing Jitsi credentials
    const needsCredentials = await pool.query(`
      SELECT COUNT(*) as count
      FROM events
      WHERE meeting_type = 'jitsi' 
      AND (jitsi_room IS NULL OR jitsi_password IS NULL);
    `);

    const count = parseInt(needsCredentials.rows[0].count);
    if (count > 0) {
      console.log(`\n⚠️  Found ${count} event(s) with meeting_type='jitsi' but no credentials.`);
      console.log('   Run: node backend/scripts/backfillJitsiCredentials.js');
    } else {
      console.log('\n✅ All Jitsi events have credentials');
    }

    console.log('\n🎉 Enhanced Jitsi integration setup completed successfully!');
    console.log('\n📚 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Organizers can now choose between:');
    console.log('      - Jitsi Meet (integrated video conferencing)');
    console.log('      - External streaming URL (Zoom, Google Meet, etc.)');
    console.log('      - No video meeting');
    console.log('   3. Test by creating a new event');
    console.log('   4. Check documentation for usage details\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupJitsiWithMeetingType();
