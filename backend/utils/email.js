const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send email
const sendEmail = async (to, subject, html) => {
  try {
    console.log('=== SENDING EMAIL ===');
    console.log('From:', process.env.EMAIL_USER);
    console.log('To:', to);
    console.log('Subject:', subject);
    
    const mailOptions = {
      from: `"Nexus Events" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    console.log('Calling transporter.sendMail...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✓ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    return info;
  } catch (error) {
    console.error('✗ EMAIL SENDING FAILED');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
    console.error('Full error:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetUrl, userName) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello ${userName || 'there'},</p>
          <p>We received a request to reset your password for your Nexus Events account.</p>
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
          <p>Best regards,<br/>Nexus Events Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, 'Password Reset Request - Nexus Events', html);
};

// Send event registration confirmation email
const sendRegistrationConfirmationEmail = async (email, userName, eventDetails, ticketDetails) => {
  console.log('Building registration confirmation email...');
  console.log('Recipient:', email);
  console.log('Event:', eventDetails.title);
  console.log('Ticket:', ticketDetails.type_name);
  
  // Check if event has external meeting link
  const hasExternalMeeting = eventDetails.meeting_type === 'external' && eventDetails.streaming_url;
  const hasBuiltinMeeting = eventDetails.meeting_type === 'builtin' || eventDetails.meeting_type === 'jitsi';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .ticket-box { background: white; border: 2px dashed #0891b2; padding: 20px; margin: 20px 0; border-radius: 10px; }
        .meeting-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 10px; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .button { display: inline-block; padding: 12px 30px; background: #0891b2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .meeting-button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Registration Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Great news! Your registration for <strong>${eventDetails.title}</strong> has been confirmed.</p>
          
          <div class="ticket-box">
            <h3 style="margin-top: 0; color: #0891b2;">Event Details</h3>
            <div class="detail-row">
              <span><strong>Event:</strong></span>
              <span>${eventDetails.title}</span>
            </div>
            <div class="detail-row">
              <span><strong>Date:</strong></span>
              <span>${new Date(eventDetails.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="detail-row">
              <span><strong>Time:</strong></span>
              <span>${new Date(eventDetails.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="detail-row">
              <span><strong>Location:</strong></span>
              <span>${eventDetails.location || 'Online Event'}</span>
            </div>
            <div class="detail-row">
              <span><strong>Ticket Type:</strong></span>
              <span>${ticketDetails.type_name}</span>
            </div>
            <div class="detail-row" style="border-bottom: none;">
              <span><strong>Order ID:</strong></span>
              <span>#${ticketDetails.ticket_id.toString().padStart(10, '0')}</span>
            </div>
          </div>

          ${hasExternalMeeting ? `
          <div class="meeting-box">
            <h3 style="margin-top: 0; color: #92400e;">📹 Online Meeting Link</h3>
            <p style="margin: 10px 0;">This event will be held online using an external meeting platform (Zoom, Google Meet, etc.).</p>
            <p style="text-align: center; margin: 20px 0;">
              <a href="${eventDetails.streaming_url}" class="meeting-button" target="_blank">Join Meeting</a>
            </p>
            <p style="font-size: 0.9em; color: #92400e; margin: 10px 0;">
              <strong>Meeting Link:</strong><br/>
              <a href="${eventDetails.streaming_url}" style="color: #0891b2; word-break: break-all;">${eventDetails.streaming_url}</a>
            </p>
            <p style="font-size: 0.85em; color: #92400e; margin-top: 15px;">
              💡 <strong>Tip:</strong> Save this link! You can also access it anytime from your tickets page.
            </p>
          </div>
          ` : ''}

          ${hasBuiltinMeeting ? `
          <div class="meeting-box" style="background: #dbeafe; border-color: #0891b2;">
            <h3 style="margin-top: 0; color: #0c4a6e;">🎥 Built-in Video Conference</h3>
            <p style="margin: 10px 0; color: #0c4a6e;">This event uses our built-in video conferencing. No external apps needed!</p>
            <p style="font-size: 0.9em; color: #0c4a6e; margin: 10px 0;">
              Simply click "Join Live Event" from your tickets page when the event starts.
            </p>
          </div>
          ` : ''}

          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-tickets" class="button">View My Tickets</a>
          </p>

          <p><strong>What's Next?</strong></p>
          <ul>
            <li>Your QR code ticket is available in your account</li>
            ${hasExternalMeeting ? '<li>Use the meeting link above to join the online event</li>' : ''}
            ${hasBuiltinMeeting ? '<li>Click "Join Live Event" when the event starts</li>' : ''}
            <li>You'll receive a reminder 24 hours before the event</li>
            ${!hasExternalMeeting && !hasBuiltinMeeting ? '<li>Present your QR code at the event entrance</li>' : ''}
          </ul>

          <p>We're excited to see you at the event!</p>
          <p>Best regards,<br/>Nexus Events Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log('Calling sendEmail for registration confirmation...');
  return sendEmail(email, `Registration Confirmed - ${eventDetails.title}`, html);
};

// Send event reminder email (24 hours before)
const sendEventReminderEmail = async (email, userName, eventDetails, ticketDetails) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .reminder-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Event Reminder</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          
          <div class="reminder-box">
            <h3 style="margin-top: 0;">Your event is tomorrow!</h3>
            <p style="margin-bottom: 0;"><strong>${eventDetails.title}</strong> starts in less than 24 hours.</p>
          </div>

          <p><strong>Event Details:</strong></p>
          <ul>
            <li><strong>Date:</strong> ${new Date(eventDetails.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
            <li><strong>Time:</strong> ${new Date(eventDetails.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</li>
            <li><strong>Location:</strong> ${eventDetails.location || 'Online Event'}</li>
            <li><strong>Your Ticket:</strong> ${ticketDetails.type_name}</li>
          </ul>

          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-tickets" class="button">View QR Code</a>
          </p>

          <p><strong>Don't forget to:</strong></p>
          <ul>
            <li>Have your QR code ready on your phone</li>
            <li>Arrive 15 minutes early for check-in</li>
            <li>Bring a valid ID if required</li>
          </ul>

          <p>See you soon!</p>
          <p>Best regards,<br/>Nexus Events Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, `Reminder: ${eventDetails.title} is Tomorrow!`, html);
};

// Send new attendee notification to organizer
const sendNewAttendeeNotification = async (organizerEmail, organizerName, eventDetails, attendeeDetails) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .stats-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border: 1px solid #e5e7eb; }
        .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎊 New Registration!</h1>
        </div>
        <div class="content">
          <p>Hello ${organizerName},</p>
          <p>Great news! Someone just registered for your event <strong>${eventDetails.title}</strong>.</p>
          
          <div class="stats-box">
            <h3 style="margin-top: 0; color: #10b981;">Attendee Information</h3>
            <p><strong>Name:</strong> ${attendeeDetails.name}</p>
            <p><strong>Email:</strong> ${attendeeDetails.email}</p>
            <p><strong>Ticket Type:</strong> ${attendeeDetails.ticket_type}</p>
            <p style="margin-bottom: 0;"><strong>Registration Time:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/organizer/events/${eventDetails.event_id}" class="button">Manage Event</a>
          </p>

          <p>Keep up the great work!</p>
          <p>Best regards,<br/>Nexus Events Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(organizerEmail, `New Registration for ${eventDetails.title}`, html);
};

// Send Q&A answer notification email
const sendQAAnswerEmail = async (email, userName, eventDetails, questionText, answerText) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .qa-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border-left: 4px solid #8b5cf6; }
        .question { background: #faf5ff; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        .answer { background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 3px solid #10b981; }
        .button { display: inline-block; padding: 12px 30px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💬 Your Question Was Answered!</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Great news! Your question for <strong>${eventDetails.title}</strong> has been answered by the organizer.</p>
          
          <div class="qa-box">
            <div class="question">
              <p style="margin: 0; color: #6b7280; font-size: 0.875rem; font-weight: 600;">YOUR QUESTION</p>
              <p style="margin: 10px 0 0 0;">${questionText}</p>
            </div>
            
            <div class="answer">
              <p style="margin: 0; color: #059669; font-size: 0.875rem; font-weight: 600;">ANSWER</p>
              <p style="margin: 10px 0 0 0;">${answerText}</p>
            </div>
          </div>

          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${eventDetails.event_id}/live" class="button">View Full Q&A</a>
          </p>

          <p>See you at the event!</p>
          <p>Best regards,<br/>Nexus Events Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, `Your Question Was Answered - ${eventDetails.title}`, html);
};

// Send new poll notification email
const sendNewPollEmail = async (email, userName, eventDetails, pollQuestion) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .poll-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #ec4899; }
        .button { display: inline-block; padding: 12px 30px; background: #ec4899; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 New Poll Available!</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>A new poll has been created for <strong>${eventDetails.title}</strong>. Your opinion matters!</p>
          
          <div class="poll-box">
            <h3 style="margin-top: 0; color: #ec4899;">Poll Question</h3>
            <p style="font-size: 1.1rem; font-weight: 500;">${pollQuestion}</p>
          </div>

          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${eventDetails.event_id}/live" class="button">Vote Now</a>
          </p>

          <p>Make your voice heard!</p>
          <p>Best regards,<br/>Nexus Events Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, `New Poll: ${eventDetails.title}`, html);
};

// Send custom message to event attendees
const sendAttendeeEmail = async (email, userName, eventDetails, subject, message) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .message-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border-left: 4px solid #0891b2; }
        .event-info { background: #f0f9ff; padding: 15px; margin: 20px 0; border-radius: 8px; }
        .button { display: inline-block; padding: 12px 30px; background: #0891b2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Message from Event Organizer</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          
          <div class="event-info">
            <p style="margin: 0; font-size: 0.875rem; color: #0c4a6e; font-weight: 600;">REGARDING EVENT</p>
            <p style="margin: 5px 0 0 0; font-size: 1.1rem; font-weight: 600; color: #0891b2;">${eventDetails.title}</p>
            <p style="margin: 5px 0 0 0; font-size: 0.875rem; color: #6b7280;">
              ${new Date(eventDetails.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at 
              ${new Date(eventDetails.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div class="message-box">
            <p style="white-space: pre-wrap; margin: 0;">${message}</p>
          </div>

          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${eventDetails.event_id}" class="button">View Event Details</a>
          </p>

          <p style="font-size: 0.875rem; color: #6b7280; margin-top: 30px;">
            This message was sent by the event organizer to all registered attendees.
          </p>

          <p>Best regards,<br/>Nexus Events Team</p>
        </div>
        <div class="footer">
          <p>This email was sent on behalf of the event organizer.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
};

// Send new question notification to organizer
const sendNewQuestionNotification = async (organizerEmail, organizerName, eventDetails, askerName, questionText) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .question-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border-left: 4px solid #8b5cf6; }
        .event-info { background: #faf5ff; padding: 15px; margin: 20px 0; border-radius: 8px; }
        .button { display: inline-block; padding: 12px 30px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❓ New Question Received!</h1>
        </div>
        <div class="content">
          <p>Hello ${organizerName},</p>
          <p>An attendee has asked a question about your event <strong>${eventDetails.title}</strong>.</p>
          
          <div class="event-info">
            <p style="margin: 0; font-size: 0.875rem; color: #6b21a8; font-weight: 600;">EVENT</p>
            <p style="margin: 5px 0 0 0; font-size: 1.1rem; font-weight: 600; color: #8b5cf6;">${eventDetails.title}</p>
            <p style="margin: 5px 0 0 0; font-size: 0.875rem; color: #6b7280;">
              ${new Date(eventDetails.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at 
              ${new Date(eventDetails.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div class="question-box">
            <p style="margin: 0; color: #6b7280; font-size: 0.875rem; font-weight: 600;">QUESTION FROM ${askerName.toUpperCase()}</p>
            <p style="margin: 15px 0 0 0; font-size: 1.05rem; line-height: 1.6;">${questionText}</p>
          </div>

          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${eventDetails.event_id}/live" class="button">Answer Question</a>
          </p>

          <p><strong>💡 Quick Tip:</strong> Answering questions promptly helps engage your attendees and builds excitement for your event!</p>

          <p>Best regards,<br/>Nexus Events Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(organizerEmail, `New Question for ${eventDetails.title}`, html);
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendRegistrationConfirmationEmail,
  sendEventReminderEmail,
  sendNewAttendeeNotification,
  sendQAAnswerEmail,
  sendNewPollEmail,
  sendAttendeeEmail,
  sendNewQuestionNotification,
};
