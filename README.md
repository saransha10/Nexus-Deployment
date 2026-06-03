# Nexus — Event Management Platform

A full-stack event management platform built with React and Node.js. Supports event creation, ticketing, real-time engagement, payment integration, and admin moderation.

**Live Demo:** [nexus-deployment-pink.vercel.app](https://nexus-deployment-pink.vercel.app)  
**Backend API:** [nexus-event-management-web.onrender.com](https://nexus-event-management-web.onrender.com)

---

## Features

### User Roles
| Role | Capabilities |
|------|-------------|
| **Attendee** | Browse events, purchase tickets, join live Q&A, polls, and chat |
| **Organizer** | Create and manage events, scan QR tickets, view analytics, email attendees |
| **Admin** | Approve/reject events, manage users, moderate platform content |

### Core Features
- **Authentication** — Local email/password, Google OAuth, 2FA (TOTP), JWT-based sessions
- **Event Management** — Create offline, online (Jitsi/external), and hybrid events
- **Ticketing** — Multiple ticket types, QR code generation, QR scanner for check-in
- **Payments** — Khalti and eSewa payment gateways (sandbox)
- **Real-time** — Live chat, polls, Q&A via Socket.IO
- **Email Notifications** — Registration confirmations, reminders, Q&A answers via Brevo
- **Analytics** — Event-level attendance, revenue, and engagement stats
- **Image Uploads** — Event banners and profile photos via Cloudinary

---

## Tech Stack

### Frontend
- React 18 + Vite
- React Router v6
- Material UI (MUI)
- Axios
- Socket.IO client

### Backend
- Node.js + Express
- PostgreSQL (Neon serverless)
- Passport.js (local + Google OAuth)
- Socket.IO
- Cloudinary (image storage)
- Brevo (transactional email)

---

## Local Development

### Prerequisites
- Node.js v18+
- PostgreSQL or a Neon account

### 1. Clone the repo
```bash
git clone https://github.com/saransha10/Nexus-Deployment.git
cd Nexus-Deployment
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5001
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=15m

FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5001

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback

BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM_ADDRESS=your_verified_sender@email.com
EMAIL_FROM_NAME=Nexus Events

KHALTI_ENV=sandbox
KHALTI_SECRET_KEY=your_khalti_test_key
KHALTI_PUBLIC_KEY=your_khalti_public_key

ESEWA_ENV=sandbox
ESEWA_MERCHANT_ID=your_esewa_merchant_id
ESEWA_SECRET_KEY=your_esewa_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Database setup
Run the SQL files in order against your PostgreSQL database:
```bash
psql -d your_db -f backend/DB/database.sql
psql -d your_db -f backend/DB/database_events.sql
psql -d your_db -f backend/DB/database_tickets.sql
psql -d your_db -f backend/DB/database_ticket_types.sql
psql -d your_db -f backend/DB/database_engagement.sql
psql -d your_db -f backend/DB/database_notifications.sql
psql -d your_db -f backend/DB/database_admin.sql
```

Or use the complete schema:
```bash
psql -d your_db -f backend/DB/COMPLETE_DATABASE_SCHEMA.sql
```

### 4. Create admin user
Run this SQL in your database:
```sql
INSERT INTO users (name, email, password_hash, role, account_status, auth_provider, email_verified)
VALUES (
  'System Administrator',
  'admin@nexus.com',
  '$2b$10$.6W46XjfIwpEf1TGMvBNWua6ZlUrd2ax/QKjFLVWs/5gT0t3x11La',
  'admin', 'active', 'local', true
);
```
Login: `admin@nexus.com` / `Admin@123`

### 5. Frontend setup
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5001/api
VITE_KHALTI_PUBLIC_KEY=your_khalti_public_key
```

### 6. Run the app

**Backend** (in one terminal):
```bash
cd backend
npm start
```

**Frontend** (in another terminal):
```bash
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5001

---

## Project Structure

```
Nexus-Deployment/
├── backend/
│   ├── config/            # Database, JWT, Passport, Cloudinary config
│   ├── controllers/       # Route logic (auth, events, tickets, payments...)
│   ├── middlewares/       # Auth, role check, rate limiter, email verification
│   ├── routes/            # Express routers
│   ├── scripts/           # Admin creation, Jitsi setup scripts
│   ├── utils/             # Email, QR security, Cloudinary upload helpers
│   ├── DB/                # SQL schema files
│   └── server.js          # App entry point
│
└── frontend/
    └── src/
        ├── components/    # Reusable UI components
        ├── pages/         # Route-level page components
        ├── services/      # Axios API instance
        ├── hooks/         # Custom React hooks
        ├── context/       # Socket context
        └── utils/         # Image URL helpers
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/google` | Google OAuth |
| POST | `/api/auth/verify-email` | Verify email token |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List approved upcoming events |
| GET | `/api/events/:id` | Get event details |
| POST | `/api/events` | Create event (organizer) |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| GET | `/api/events/organizer/my-events` | Organizer's own events |

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets/my-tickets` | User's tickets |
| POST | `/api/tickets/register/:eventId` | Register/purchase ticket |
| POST | `/api/tickets/validate-qr` | Validate QR code at check-in |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/khalti/initiate` | Initiate Khalti payment |
| GET | `/api/khalti/callback` | Khalti callback (backend) |
| POST | `/api/esewa/initiate` | Initiate eSewa payment |
| GET | `/api/esewa/verify` | eSewa verification |

### Engagement
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/polls/event/:eventId` | Get event polls |
| POST | `/api/polls/:pollId/vote` | Submit poll vote |
| GET | `/api/questions/event/:eventId` | Get Q&A questions |
| POST | `/api/questions` | Submit question |
| GET | `/api/chat/event/:eventId` | Get chat history |

---

## Deployment

### Backend — Render
The `backend/render.yaml` defines the service configuration. Set all environment variables in the Render dashboard under **Environment**.

Key variables to set:
- `DATABASE_URL` — Neon connection string (without `channel_binding=require`)
- `BACKEND_URL` — Your Render service URL (e.g. `https://nexus-event-management-web.onrender.com`)
- `FRONTEND_URL` — Your Vercel frontend URL
- `JWT_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `BREVO_API_KEY`, `CLOUDINARY_*`, `KHALTI_*`, `ESEWA_*`

### Frontend — Vercel
Set these environment variables in the Vercel dashboard:
- `VITE_API_URL` — `https://your-render-service.onrender.com/api`
- `VITE_KHALTI_PUBLIC_KEY` — Your Khalti public key

---

## Payment Testing

**Khalti sandbox test credentials:**
- Use any test number from [Khalti docs](https://docs.khalti.com/khalti-epayment/overview/)
- MPIN: `1111`, OTP: `987654`

**eSewa sandbox:**
- eSewa ID: `9806800001` through `9806800005`
- Password: `Nepal@123`, MPIN: `1122`

---

## License

Educational project. Built as part of academic coursework at Herald College Kathmandu.

## Author

Saransha Sharma — [@saransha10](https://github.com/saransha10)
