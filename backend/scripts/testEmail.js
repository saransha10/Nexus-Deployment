require('dotenv').config();
const { sendEmail } = require('../utils/email');

async function testEmail() {
  try {
    const recipientEmail = process.argv[2];
    
    if (!recipientEmail) {
      console.log('Usage: node scripts/testEmail.js <recipient-email>');
      console.log('Example: node scripts/testEmail.js user@example.com');
      process.exit(1);
    }

    console.log('\n🔧 Email Configuration:');
    console.log('Host:', process.env.EMAIL_HOST);
    console.log('Port:', process.env.EMAIL_PORT);
    console.log('User:', process.env.EMAIL_USER);
    console.log('Password:', process.env.EMAIL_PASSWORD ? '***' + process.env.EMAIL_PASSWORD.slice(-4) : 'NOT SET');
    console.log('');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('❌ Email credentials not configured in .env file');
      process.exit(1);
    }

    console.log('📧 Sending test email to:', recipientEmail);
    console.log('');

    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Email Test Successful!</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>This is a test email from Nexus Events. If you're reading this, your email configuration is working correctly!</p>
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>Sent at: ${new Date().toLocaleString()}</li>
              <li>From: ${process.env.EMAIL_USER}</li>
              <li>To: ${recipientEmail}</li>
            </ul>
            <p>Best regards,<br/>Nexus Events Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(recipientEmail, 'Test Email - Nexus Events', testHtml);
    
    console.log('✅ Test email sent successfully!');
    console.log('Please check the inbox of:', recipientEmail);
    console.log('');
    console.log('💡 If you don\'t see the email:');
    console.log('   1. Check your spam/junk folder');
    console.log('   2. Verify the email address is correct');
    console.log('   3. Check if Gmail "Less secure app access" is enabled (if using Gmail)');
    console.log('   4. Make sure you\'re using an App Password (not your regular Gmail password)');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to send test email');
    console.error('Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication failed. Please check:');
      console.error('   1. EMAIL_USER is correct');
      console.error('   2. EMAIL_PASSWORD is a valid App Password (not regular password)');
      console.error('   3. For Gmail: Enable 2FA and generate an App Password');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n💡 Connection failed. Please check:');
      console.error('   1. Your internet connection');
      console.error('   2. EMAIL_HOST and EMAIL_PORT are correct');
      console.error('   3. Firewall is not blocking SMTP');
    }
    
    process.exit(1);
  }
}

testEmail();
