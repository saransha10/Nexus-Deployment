const pool = require('../config/database');

async function verifyUser() {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.log('Usage: node scripts/verifyUser.js <email>');
      console.log('Example: node scripts/verifyUser.js user@example.com');
      process.exit(1);
    }

    // Find user
    const result = await pool.query(
      'SELECT user_id, name, email, email_verified, verification_token FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found with email:', email);
      process.exit(1);
    }

    const user = result.rows[0];
    
    console.log('\n📋 User Information:');
    console.log('User ID:', user.user_id);
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    console.log('Email Verified:', user.email_verified);
    console.log('Has Verification Token:', !!user.verification_token);

    if (user.email_verified) {
      console.log('\n✅ Email is already verified!');
      process.exit(0);
    }

    // Verify the user
    await pool.query(
      'UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expiry = NULL WHERE user_id = $1',
      [user.user_id]
    );

    console.log('\n✅ Email verified successfully!');
    console.log('User can now log in without email verification.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyUser();
