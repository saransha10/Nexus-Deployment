const pool = require('../config/database');
const { generateJitsiCredentials } = require('../utils/jitsiRoom');

/**
 * Backfill script to generate Jitsi credentials for existing approved events
 * Run with: node backend/scripts/backfillJitsiCredentials.js
 * 
 * This is useful if you have events that were approved before Jitsi integration
 */

async function backfillJitsiCredentials() {
  console.log('🚀 Starting Jitsi credentials backfill...\n');

  try {
    // Find approved events with meeting_type='jitsi' but no Jitsi credentials
    const result = await pool.query(`
      SELECT event_id, title, organizer_id, meeting_type
      FROM events
      WHERE approval_status = 'approved' 
      AND meeting_type = 'jitsi'
      AND (jitsi_room IS NULL OR jitsi_password IS NULL)
      ORDER BY event_id;
    `);

    const events = result.rows;

    if (events.length === 0) {
      console.log('✅ No events need backfilling. All Jitsi events have credentials!\n');
      return;
    }

    console.log(`📋 Found ${events.length} Jitsi event(s) that need credentials:\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const event of events) {
      try {
        // Generate credentials
        const { roomName, password } = generateJitsiCredentials(event.event_id);

        // Update event
        await pool.query(`
          UPDATE events
          SET jitsi_room = $1,
              jitsi_password = $2
          WHERE event_id = $3
        `, [roomName, password, event.event_id]);

        console.log(`✅ Event #${event.event_id}: "${event.title}"`);
        console.log(`   Room: ${roomName}`);
        console.log(`   Password: ${password}\n`);

        successCount++;
      } catch (error) {
        console.error(`❌ Failed to update event #${event.event_id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Backfill Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount}`);
    }
    console.log('\n🎉 Backfill completed!\n');

  } catch (error) {
    console.error('❌ Backfill failed:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the backfill
backfillJitsiCredentials();
