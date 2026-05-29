const { Pool } = require('pg');

// Debug: log which DB config path is being used (safe - no secrets)
if (process.env.DATABASE_URL) {
  console.log('✅ Using DATABASE_URL for DB connection');
} else if (process.env.DB_HOST) {
  console.log('✅ Using individual DB params for DB connection');
} else {
  console.error('❌ No database configuration found. Set DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD');
  process.exit(1);
}

// Support both Neon/production DATABASE_URL and local individual params
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required for Neon
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Database error:', err);
});

module.exports = pool;
