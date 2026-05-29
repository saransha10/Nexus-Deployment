# Nexus - Event Management System

A full-stack event management platform built with React and Node.js, featuring real-time engagement tools, ticketing, and payment integration.

## Features

### Core Functionality
- **User Authentication**: Secure login with JWT, 2FA, and Google OAuth integration
- **Event Management**: Create, browse, and manage events with detailed information
- **Ticket System**: QR code-based ticketing with multiple ticket types
- **Payment Integration**: Khalti and eSewa payment gateways (sandbox mode)
- **Real-time Engagement**: Live chat, polls, and Q&A during events
- **Analytics Dashboard**: Comprehensive event analytics and reporting
- **Notification System**: Email notifications for important updates
- **🆕 Admin Panel**: Complete platform management system (see `ADMIN_PANEL_GUIDE.md`)

### User Roles
- **Attendees**: Browse events, purchase tickets, participate in live features
- **Organizers**: Create and manage events, view analytics, scan tickets
- **Admins**: Platform management, event approval, user moderation (🆕 Admin Panel)

## Tech Stack

### Frontend
- React 18
- React Router for navigation
- Axios for API calls
- Tailwind CSS for styling
- Vite as build tool

### Backend
- Node.js with Express
- PostgreSQL database
- Passport.js for authentication
- JWT for session management
- Nodemailer for email notifications

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn package manager

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/saransha10/Nexus.git
cd Nexus
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/nexus
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Payment Gateways (Sandbox)
KHALTI_SECRET_KEY=your_khalti_test_key
ESEWA_MERCHANT_ID=your_esewa_test_merchant_id
```

### 3. Database Setup
```bash
# Create database
createdb nexus

# Run SQL scripts in order
psql -d nexus -f database.sql
psql -d nexus -f database_events.sql
psql -d nexus -f database_tickets.sql
psql -d nexus -f database_ticket_types.sql
psql -d nexus -f database_engagement.sql
psql -d nexus -f database_notifications.sql
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```

Create a `.env` file in the frontend directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## Running the Application

### Development Mode

**Backend:**
```bash
cd backend
npm run dev
```
Server runs on http://localhost:5000

**Frontend:**
```bash
cd frontend
npm run dev
```
Application runs on http://localhost:5173

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
```

## Project Structure

```
Nexus/
├── backend/
│   ├── config/          # Configuration files (database, JWT, passport)
│   ├── controllers/     # Route controllers
│   ├── middlewares/     # Auth and role check middlewares
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions (email, tickets)
│   ├── database*.sql    # Database schemas
│   └── server.js        # Express server entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service layer
│   │   ├── App.jsx      # Main app component
│   │   └── main.jsx     # Entry point
│   └── index.html
│
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/2fa/setup` - Setup 2FA
- `POST /api/auth/2fa/verify` - Verify 2FA token

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event (organizer only)
- `PUT /api/events/:id` - Update event (organizer only)
- `DELETE /api/events/:id` - Delete event (organizer only)

### Tickets
- `GET /api/tickets/my-tickets` - Get user's tickets
- `POST /api/tickets/purchase` - Purchase ticket
- `POST /api/tickets/verify` - Verify ticket QR code

### Payments
- `POST /api/khalti/initiate` - Initiate Khalti payment
- `POST /api/khalti/verify` - Verify Khalti payment
- `POST /api/esewa/initiate` - Initiate eSewa payment
- `GET /api/esewa/verify` - Verify eSewa payment

### Engagement
- `GET /api/polls/:eventId` - Get event polls
- `POST /api/polls/:pollId/vote` - Vote on poll
- `GET /api/questions/:eventId` - Get Q&A questions
- `POST /api/questions` - Submit question
- `GET /api/chat/:eventId` - Get chat messages
- `POST /api/chat` - Send chat message

### Analytics
- `GET /api/analytics/event/:eventId` - Get event analytics
- `GET /api/analytics/dashboard` - Get organizer dashboard stats

## Features in Development

This is a work-in-progress project. Current development status:

✅ Completed:
- User authentication and authorization
- Event management system
- Ticket management with QR codes
- Payment gateway integration (sandbox)
- Real-time engagement features
- Analytics dashboard
- Notification system (partial)

🚧 In Progress:
- Advanced notification features
- Mobile responsive improvements
- Performance optimizations

## Payment Gateway Testing

The application uses sandbox/test modes for payment gateways:

**Khalti Test Credentials:**
- Use Khalti test credentials from their documentation
- Test mode is enabled by default

**eSewa Test:**
- Use eSewa test merchant ID
- Payments are simulated in test environment

## Contributing

This is an academic project. Contributions are welcome for learning purposes.

## License

This project is for educational purposes.

## Contact

- GitHub: [@saransha10](https://github.com/saransha10)
- Repository: [Nexus](https://github.com/saransha10/Nexus)

## Acknowledgments

- Built as part of academic coursework
- Payment integrations use sandbox environments
- Real-time features powered by polling mechanisms

---

**Note**: This is a work-in-progress project developed for educational purposes. Some features may be incomplete or under active development.
