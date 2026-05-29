# 🗄️ NEXUS EVENT MANAGEMENT SYSTEM - COMPLETE DATABASE DOCUMENTATION

**Database**: PostgreSQL 14.17  
**Total Tables**: 20  
**Total Views**: 5  
**Total Functions**: 3  
**Total Triggers**: 3  
**Schema File**: `COMPLETE_DATABASE_SCHEMA.sql` (2,158 lines)

---

## 📋 TABLE OF CONTENTS

1. [Database Overview](#database-overview)
2. [Core Tables](#core-tables)
3. [Supporting Tables](#supporting-tables)
4. [Views](#views)
5. [Functions & Triggers](#functions--triggers)
6. [Relationships](#relationships)
7. [Indexes](#indexes)

---

## 🎯 DATABASE OVERVIEW

The NEXUS database is designed to support a comprehensive event management platform with:
- User authentication and authorization
- Event creation and management
- Ticketing and payment processing
- Real-time engagement (chat, polls, Q&A)
- QR code-based attendance tracking
- Analytics and reporting
- Admin moderation and audit logging

---

## 📊 CORE TABLES

### 1. **users** (User Management System)
**Purpose**: Central user authentication and profile management

**Key Columns**:
- `user_id` (PK) - Unique user identifier
- `email` (UNIQUE) - User email address
- `password_hash` - Encrypted password
- `role` - User role: 'admin', 'organizer', 'attendee'
- `account_status` - Account state: 'active', 'suspended', 'banned'
- `auth_provider` - Authentication method: 'local', 'google'
- `google_id` (UNIQUE) - Google OAuth identifier
- `two_factor_enabled` - 2FA status
- `profile_picture` - Profile image URL
- `phone`, `company`, `job_title`, `bio` - Profile details
- `website`, `linkedin`, `twitter` - Social links
- `verification_status` - Organizer verification: 'unverified', 'pending', 'verified', 'rejected'

**Constraints**:
- Email must be unique
- Role must be one of: admin, organizer, attendee
- Account status must be: active, suspended, banned

**Indexes**:
- `idx_users_account_status` - Fast account status filtering
- `idx_users_refresh_token` - JWT refresh token lookup
- `idx_users_verification_token` - Email verification

**Total Columns**: 38

---

### 2. **events** (Event Management System)
**Purpose**: Store all event information and configuration

**Key Columns**:
- `event_id` (PK) - Unique event identifier
- `title` - Event name (max 200 chars)
- `description` - Event details (text)
- `type` - Event format: 'online', 'offline', 'hybrid'
- `start_time`, `end_time` - Event schedule
- `location` - Physical location
- `streaming_url` - Online meeting URL
- `organizer_id` (FK) - References users(user_id)
- `ticket_price` - Base ticket price
- `max_attendees` - Capacity limit
- `is_free` - Free event flag
- `event_image` - Event banner/poster
- `registration_start_time`, `registration_end_time` - Registration window
- `registration_status` - Current status: 'not_started', 'open', 'closed', 'full'
- `location_lat`, `location_lng` - GPS coordinates
- `location_place_id` - Google Maps place ID
- `meeting_type` - Video meeting: 'jitsi', 'external', 'builtin', 'none'
- `jitsi_room`, `jitsi_password` - Jitsi integration
- `approval_status` - Admin approval: 'pending', 'approved', 'rejected'
- `is_featured` - Featured event flag
- `organizer_joined` - Organizer presence tracking

**Constraints**:
- Type must be: online, offline, hybrid
- Meeting type must be: jitsi, external, builtin, none
- Registration status must be: not_started, open, closed, full
- Approval status must be: pending, approved, rejected

**Indexes**:
- `idx_events_approval_status` - Admin moderation
- `idx_events_featured` - Featured events display
- `idx_events_jitsi_room` - Jitsi room lookup
- `idx_events_location_lat_lng` - Geospatial queries
- `idx_events_registration_status` - Registration filtering

**Total Columns**: 33

---

### 3. **tickets** (Ticketing & Payment System)
**Purpose**: Manage ticket purchases and attendance

**Key Columns**:
- `ticket_id` (PK) - Unique ticket identifier
- `user_id` (FK) - References users(user_id)
- `event_id` (FK) - References events(event_id)
- `ticket_type_id` (FK) - References ticket_types(ticket_type_id)
- `qr_code` - Secure QR code for validation
- `price` - Ticket price
- `ticket_type` - Type name (legacy)
- `status` - Ticket state: 'active', 'cancelled', 'used'
- `payment_status` - Payment state: 'pending', 'completed', 'failed', 'refunded', 'free'
- `payment_gateway` - Gateway used: 'khalti', 'esewa', 'free'
- `payment_token` - Payment transaction ID
- `scan_count` - Number of times scanned
- `last_scanned_at` - Last scan timestamp
- `unique_meeting_token` - Jitsi access token
- `access_count` - Meeting access count
- `last_accessed_at` - Last meeting access

**Constraints**:
- Status must be: active, cancelled, used
- Payment status must be: pending, completed, failed, refunded, free

**Indexes**:
- `idx_tickets_status` - Status filtering
- `idx_tickets_payment_gateway` - Payment analytics
- `idx_tickets_scan_count` - Attendance tracking
- `idx_tickets_last_scanned` - Recent scans

**Total Columns**: 18

---

### 4. **payments** (Payment Processing)
**Purpose**: Track payment transactions and gateway responses

**Key Columns**:
- `payment_id` (PK) - Unique payment identifier
- `ticket_id` (FK, UNIQUE) - References tickets(ticket_id)
- `amount` - Payment amount
- `gateway` - Payment gateway: 'khalti', 'esewa', 'free'
- `transaction_id` (UNIQUE) - Gateway transaction ID
- `status` - Payment status: 'pending', 'completed', 'failed', 'refunded'
- `gateway_response` (JSONB) - Full gateway response
- `failure_reason` - Error message
- `retry_count` - Number of retry attempts
- `completed_at` - Completion timestamp

**Constraints**:
- Gateway must be: khalti, esewa, free
- Status must be: pending, completed, failed, refunded
- One payment per ticket (UNIQUE constraint)

**Indexes**:
- `idx_payments_status` - Status filtering
- `idx_payments_gateway` - Gateway analytics
- `idx_payments_transaction` - Transaction lookup

**Total Columns**: 11

---

### 5. **ticket_types** (Ticket Configuration)
**Purpose**: Define multiple ticket tiers per event

**Key Columns**:
- `ticket_type_id` (PK) - Unique type identifier
- `event_id` (FK) - References events(event_id)
- `type_name` - Ticket tier name (e.g., "VIP", "General")
- `price` - Tier price
- `quantity_available` - Total tickets for this tier
- `quantity_sold` - Tickets sold
- `description` - Tier description
- `is_active` - Availability flag

**Constraints**:
- Unique combination of event_id and type_name

**Indexes**:
- `idx_ticket_types_event` - Event ticket types lookup

**Total Columns**: 9

---

## 🔧 SUPPORTING TABLES

### 6. **messages** (Live Chat)
**Purpose**: Store event chat messages

**Columns**: message_id (PK), user_id (FK), event_id (FK), content, created_at

---

### 7. **polls** (Live Polls)
**Purpose**: Store poll questions

**Columns**: poll_id (PK), event_id (FK), question, created_by (FK), is_active, created_at

---

### 8. **polloptions** (Poll Options)
**Purpose**: Store poll answer choices

**Columns**: option_id (PK), poll_id (FK), option_text

---

### 9. **votes** (Poll Votes)
**Purpose**: Track user votes

**Columns**: vote_id (PK), option_id (FK), user_id (FK)

**Constraints**: Unique combination of option_id and user_id (one vote per poll)

---

### 10. **questions** (Q&A System)
**Purpose**: Store audience questions

**Columns**: question_id (PK), event_id (FK), user_id (FK), question_text, answer_text, answered_by (FK), is_answered, is_approved, answered_at, created_at

---

### 11. **notifications** (Notification System)
**Purpose**: Store in-app notifications

**Columns**: notification_id (PK), user_id (FK), event_id (FK), type, title, message, is_read, created_at

**Indexes**:
- `idx_notifications_user_id` - User notifications
- `idx_notifications_created_at` - Recent notifications

---

### 12. **notification_preferences** (User Preferences)
**Purpose**: Store user notification settings

**Columns**: preference_id (PK), user_id (FK, UNIQUE), email_registration, email_reminder, email_updates, email_cancellation, email_qa_answer, email_new_poll, in_app_notifications

---

### 13. **qr_scan_logs** (Attendance Tracking)
**Purpose**: Log all QR code scan attempts

**Columns**: log_id (PK), ticket_id (FK), scanned_by (FK), scan_timestamp, scan_result, ip_address, user_agent, notes

**Scan Results**: 'success', 'invalid', 'already_used', 'cancelled', 'unpaid', 'too_early', 'event_ended', 're_entry', 'daily_limit_exceeded', 'not_found'

---

### 14. **event_access_logs** (Meeting Access Tracking)
**Purpose**: Track event/meeting access

**Columns**: access_id (PK), event_id (FK), user_id (FK), ticket_id (FK), access_type, ip_address, user_agent, accessed_at

**Access Types**: 'view', 'join', 'leave'

**Indexes**:
- `idx_event_access_logs_event` - Event access history
- `idx_event_access_logs_user` - User access history
- `idx_event_access_logs_time` - Time-based queries

---

### 15. **admin_audit_logs** (Admin Actions)
**Purpose**: Track all admin actions for accountability

**Columns**: log_id (PK), admin_id (FK), action, target_type, target_id, details (JSONB), ip_address, user_agent, created_at

**Indexes**:
- `idx_audit_logs_admin_id` - Admin activity
- `idx_audit_logs_action` - Action filtering
- `idx_audit_logs_created_at` - Time-based queries

---

### 16. **user_reports** (Content Moderation)
**Purpose**: User-submitted reports and complaints

**Columns**: report_id (PK), reporter_id (FK), reported_user_id (FK), report_type, target_id, reason, description, status, reviewed_by (FK), reviewed_at, resolution_notes, created_at

**Report Types**: 'user', 'event', 'message', 'question', 'other'

**Status**: 'pending', 'reviewing', 'resolved', 'dismissed'

**Indexes**:
- `idx_reports_status` - Pending reports
- `idx_reports_type` - Report type filtering
- `idx_reports_reported_user` - User reports

---

### 17. **refund_requests** (Refund Management)
**Purpose**: Ticket refund requests

**Columns**: refund_id (PK), ticket_id (FK), user_id (FK), event_id (FK), reason, amount, status, reviewed_by (FK), reviewed_at, admin_notes, created_at

**Status**: 'pending', 'approved', 'rejected', 'processed'

**Indexes**:
- `idx_refunds_status` - Pending refunds
- `idx_refunds_user` - User refund history

---

### 18. **organizer_ratings** (Organizer Reviews)
**Purpose**: Attendee ratings for organizers

**Columns**: rating_id (PK), organizer_id (FK), event_id (FK), attendee_id (FK), rating (1-5), review, created_at

**Constraints**:
- Rating must be between 1 and 5
- Unique combination of event_id and attendee_id (one rating per event)

**Indexes**:
- `idx_ratings_organizer` - Organizer ratings
- `idx_ratings_event` - Event ratings

---

### 19. **system_settings** (Platform Configuration)
**Purpose**: Store system-wide settings

**Columns**: setting_id (PK), setting_key (UNIQUE), setting_value, description, updated_by (FK), updated_at

---

### 20. **announcements** (Platform Announcements)
**Purpose**: System-wide announcements

**Columns**: announcement_id (PK), title, message, type, target_audience, is_active, created_by (FK), created_at, expires_at

**Types**: 'info', 'warning', 'success', 'error'

**Target Audience**: 'all', 'organizers', 'attendees', 'admins'

**Indexes**:
- `idx_announcements_active` - Active announcements

---

## 📈 VIEWS

### 1. **admin_platform_stats**
**Purpose**: Real-time platform statistics for admin dashboard

**Columns**:
- total_users, total_organizers, total_attendees, active_users
- total_events, approved_events, pending_events
- total_tickets, active_tickets
- total_revenue
- pending_reports

---

### 2. **organizer_performance**
**Purpose**: Organizer performance metrics

**Columns**:
- user_id, name, email, is_verified
- total_events, approved_events
- total_tickets_sold, total_revenue
- average_rating, total_ratings

---

### 3. **payment_analytics**
**Purpose**: Aggregated payment data

**Columns**:
- gateway, status
- transaction_count, total_amount, avg_amount
- payment_date

---

### 4. **failed_payments**
**Purpose**: Failed payments with user context

**Columns**:
- payment_id, gateway, amount, failure_reason, retry_count
- ticket_id, event_title, user_email
- created_at

---

### 5. **recent_activity_feed**
**Purpose**: Recent platform activity

**Columns**:
- activity_type ('user_registered', 'event_created', 'ticket_purchased')
- entity_id, entity_name, secondary_info
- created_at

---

## ⚙️ FUNCTIONS & TRIGGERS

### Functions

#### 1. **check_event_auto_approval()**
**Purpose**: Auto-approve events if approval not required

**Trigger**: BEFORE INSERT on events

---

#### 2. **check_user_suspension()**
**Purpose**: Auto-reactivate accounts after suspension period

**Trigger**: BEFORE UPDATE on users

---

#### 3. **update_registration_status()**
**Purpose**: Auto-update event registration status based on time and capacity

**Trigger**: BEFORE INSERT OR UPDATE on events

**Logic**:
- If before registration_start_time → 'not_started'
- If after registration_end_time → 'closed'
- If at max_attendees → 'full'
- Otherwise → 'open'

---

#### 4. **get_event_payment_summary(event_id)**
**Purpose**: Get payment summary for an event

**Returns**: gateway, total_amount, transaction_count, success_rate

---

### Triggers

1. **event_auto_approval** - Auto-approve events
2. **user_suspension_check** - Check suspension expiry
3. **trigger_update_registration_status** - Update registration status

---

## 🔗 RELATIONSHIPS

### User Relationships
- users → events (organizer_id)
- users → tickets (user_id)
- users → messages (user_id)
- users → polls (created_by)
- users → questions (user_id, answered_by)
- users → votes (user_id)
- users → notifications (user_id)
- users → notification_preferences (user_id)
- users → qr_scan_logs (scanned_by)
- users → admin_audit_logs (admin_id)
- users → user_reports (reporter_id, reported_user_id, reviewed_by)
- users → refund_requests (user_id, reviewed_by)
- users → organizer_ratings (organizer_id, attendee_id)
- users → system_settings (updated_by)
- users → announcements (created_by)
- users → event_access_logs (user_id)
- users → events (approved_by)
- users → users (suspended_by, verified_by) - Self-referencing

### Event Relationships
- events → tickets (event_id)
- events → ticket_types (event_id)
- events → messages (event_id)
- events → polls (event_id)
- events → questions (event_id)
- events → notifications (event_id)
- events → refund_requests (event_id)
- events → organizer_ratings (event_id)
- events → event_access_logs (event_id)

### Ticket Relationships
- tickets → payments (ticket_id)
- tickets → qr_scan_logs (ticket_id)
- tickets → refund_requests (ticket_id)
- tickets → event_access_logs (ticket_id)

### Poll Relationships
- polls → polloptions (poll_id)
- polloptions → votes (option_id)

---

## 🔍 INDEXES

### Performance Indexes

**Users**:
- idx_users_account_status
- idx_users_refresh_token
- idx_users_verification_token

**Events**:
- idx_events_approval_status
- idx_events_featured
- idx_events_jitsi_room
- idx_events_location_lat_lng
- idx_events_registration_end
- idx_events_registration_status

**Tickets**:
- idx_tickets_status
- idx_tickets_type
- idx_tickets_payment_gateway
- idx_tickets_scan_count
- idx_tickets_last_scanned

**Payments**:
- idx_payments_status
- idx_payments_gateway
- idx_payments_transaction
- idx_payments_ticket
- idx_payments_created_at

**Notifications**:
- idx_notifications_user_id
- idx_notifications_created_at

**Admin & Moderation**:
- idx_audit_logs_admin_id
- idx_audit_logs_action
- idx_audit_logs_created_at
- idx_reports_status
- idx_reports_type
- idx_reports_reported_user

**Analytics**:
- idx_ratings_organizer
- idx_ratings_event
- idx_refunds_status
- idx_refunds_user
- idx_event_access_logs_event
- idx_event_access_logs_user
- idx_event_access_logs_time

---

## 📝 NOTES

1. **CASCADE DELETE**: Most foreign keys use ON DELETE CASCADE to maintain referential integrity
2. **JSONB Storage**: gateway_response in payments uses JSONB for flexible data storage
3. **Timestamps**: All tables use timestamp without time zone
4. **Security**: Passwords are hashed, QR codes are JWT-based
5. **Scalability**: Comprehensive indexing for performance
6. **Audit Trail**: Complete logging of admin actions and QR scans
7. **Multi-tenancy**: Supports multiple organizers and events
8. **Real-time**: Designed for real-time engagement features

---

## 🚀 USAGE

### To Import Complete Schema:
```bash
psql -h localhost -U postgres -d postgres -f COMPLETE_DATABASE_SCHEMA.sql
```

### To Export Current Schema:
```bash
pg_dump -h localhost -U postgres -d postgres --schema-only --no-owner --no-privileges -f backup.sql
```

### To View Table Structure:
```bash
psql -h localhost -U postgres -d postgres -c "\d+ table_name"
```

---

**Generated**: 2026-05-20  
**Database Version**: PostgreSQL 14.17  
**Total Schema Size**: 2,158 lines
