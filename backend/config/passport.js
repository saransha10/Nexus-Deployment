const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./database');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;

        // Check if user exists with this Google ID
        const googleUserResult = await pool.query(
          'SELECT * FROM users WHERE google_id = $1',
          [googleId]
        );

        if (googleUserResult.rows.length > 0) {
          // User exists with Google ID, return user
          return done(null, googleUserResult.rows[0]);
        }

        // Check if user exists with this email (different auth provider)
        const emailUserResult = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );

        if (emailUserResult.rows.length > 0) {
          // Email exists with different auth provider
          // Link Google account to existing user
          const updatedUser = await pool.query(
            `UPDATE users 
             SET google_id = $1, 
                 profile_picture = COALESCE(profile_picture, $2),
                 auth_provider = 'google'
             WHERE email = $3
             RETURNING *`,
            [googleId, profile.photos[0]?.value || null, email]
          );
          return done(null, updatedUser.rows[0]);
        }

        // Create new user
        const newUser = await pool.query(
          `INSERT INTO users (name, email, google_id, profile_picture, auth_provider, role) 
           VALUES ($1, $2, $3, $4, 'google', 'attendee') 
           RETURNING *`,
          [
            profile.displayName,
            email,
            googleId,
            profile.photos[0]?.value || null,
          ]
        );

        return done(null, newUser.rows[0]);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE user_id = $1',
      [id]
    );
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
