const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate a secure QR code with JWT signing
 */
const generateSecureQRCode = (ticketData, eventStartTime, eventEndTime) => {
  const eventStart = new Date(eventStartTime);
  const eventEnd = new Date(eventEndTime);
  
  // Calculate event duration
  const eventDurationDays = Math.ceil((eventEnd - eventStart) / (1000 * 60 * 60 * 24));
  
  // For multi-day events, extend the validity window
  let qrExpiration;
  if (eventDurationDays > 1) {
    // For multi-day events: expires 24 hours after event ends
    qrExpiration = new Date(eventEnd.getTime() + (24 * 60 * 60 * 1000));
  } else {
    // For single-day events: expires 10 hours after event starts
    qrExpiration = new Date(eventStart.getTime() + (10 * 60 * 60 * 1000));
  }
  
  const payload = {
    ticketId: ticketData.ticketId,
    eventId: ticketData.eventId,
    userId: ticketData.userId,
    timestamp: Date.now(),
    expires: qrExpiration.getTime(),
    eventStartTime: eventStart.getTime(),
    eventEndTime: eventEnd.getTime(),
    eventDurationDays: eventDurationDays,
    nonce: crypto.randomBytes(16).toString('hex') // Prevent replay attacks
  };

  // Sign with JWT (no expiration here, we handle it manually)
  const token = jwt.sign(payload, process.env.JWT_SECRET, { 
    algorithm: 'HS256'
  });

  return token;
};

/**
 * Validate and decode secure QR code
 */
const validateSecureQRCode = (qrToken) => {
  try {
    const decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
    
    // Check if QR code has expired (after event ends + grace period)
    if (Date.now() > decoded.expires) {
      throw new Error('QR code expired - Event has ended');
    }

    // For multi-day events, be more flexible with entry times
    if (decoded.eventDurationDays > 1) {
      // Multi-day events: Allow entry from 4 hours before event starts
      const earlyEntryTime = decoded.eventStartTime - (4 * 60 * 60 * 1000);
      if (Date.now() < earlyEntryTime) {
        throw new Error('QR code not yet active - Too early for event entry');
      }
    } else {
      // Single-day events: Allow entry from 2 hours before event starts
      const earlyEntryTime = decoded.eventStartTime - (2 * 60 * 60 * 1000);
      if (Date.now() < earlyEntryTime) {
        throw new Error('QR code not yet active - Too early for event entry');
      }
    }

    return {
      valid: true,
      data: decoded
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
};

/**
 * Generate dynamic QR with event-specific validation
 */
const generateDynamicQR = (ticketData, eventStartTime) => {
  // QR becomes valid only 2 hours before event
  const validFrom = new Date(eventStartTime).getTime() - (2 * 60 * 60 * 1000);
  
  const payload = {
    ...ticketData,
    validFrom: validFrom,
    expires: new Date(eventStartTime).getTime() + (6 * 60 * 60 * 1000), // Valid for 6 hours after event start
    hash: crypto.createHash('sha256').update(`${ticketData.ticketId}-${ticketData.eventId}-${process.env.JWT_SECRET}`).digest('hex')
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256' });
};

module.exports = {
  generateSecureQRCode,
  validateSecureQRCode,
  generateDynamicQR
};

/**
 * Check if QR code allows re-entry for multi-day events
 */
const allowsReEntry = (qrData) => {
  // Multi-day events allow re-entry
  return qrData.eventDurationDays > 1;
};

/**
 * Get QR code status and validity info
 */
const getQRStatus = (qrToken) => {
  try {
    const decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
    const now = Date.now();
    
    const eventStart = new Date(decoded.eventStartTime);
    const eventEnd = new Date(decoded.eventEndTime);
    const expires = new Date(decoded.expires);
    
    // Determine entry window
    const entryWindowStart = decoded.eventDurationDays > 1 
      ? decoded.eventStartTime - (4 * 60 * 60 * 1000)  // 4 hours before for multi-day
      : decoded.eventStartTime - (2 * 60 * 60 * 1000); // 2 hours before for single-day
    
    let status = 'valid';
    let message = 'QR code is valid and ready to use';
    
    if (now < entryWindowStart) {
      status = 'too_early';
      const hoursUntilActive = Math.ceil((entryWindowStart - now) / (1000 * 60 * 60));
      message = `QR code becomes active in ${hoursUntilActive} hours`;
    } else if (now > decoded.expires) {
      status = 'expired';
      message = 'QR code has expired';
    } else if (now >= entryWindowStart && now <= decoded.expires) {
      status = 'active';
      message = 'QR code is active for entry';
    }
    
    return {
      status,
      message,
      eventDuration: decoded.eventDurationDays,
      allowsReEntry: allowsReEntry(decoded),
      eventStart: eventStart.toISOString(),
      eventEnd: eventEnd.toISOString(),
      expires: expires.toISOString(),
      entryWindowStart: new Date(entryWindowStart).toISOString()
    };
  } catch (error) {
    return {
      status: 'invalid',
      message: 'Invalid QR code',
      error: error.message
    };
  }
};

module.exports = {
  generateSecureQRCode,
  validateSecureQRCode,
  generateDynamicQR,
  allowsReEntry,
  getQRStatus
};