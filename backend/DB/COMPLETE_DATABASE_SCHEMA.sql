--
-- PostgreSQL database dump
--

-- Dumped from database version 14.17 (Homebrew)
-- Dumped by pg_dump version 14.17 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: Landing; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "Landing";


--
-- Name: check_event_auto_approval(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_event_auto_approval() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- If event approval is not required, auto-approve
    IF (SELECT setting_value FROM system_settings WHERE setting_key = 'require_event_approval') = 'false' THEN
        NEW.approval_status = 'approved';
        NEW.approved_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: check_user_suspension(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_suspension() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- If suspension period has expired, reactivate account
    IF NEW.account_status = 'suspended' AND NEW.suspended_until IS NOT NULL AND NEW.suspended_until < CURRENT_TIMESTAMP THEN
        NEW.account_status = 'active';
        NEW.suspension_reason = NULL;
        NEW.suspended_until = NULL;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: get_event_payment_summary(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_event_payment_summary(event_id_param integer) RETURNS TABLE(gateway character varying, total_amount numeric, transaction_count bigint, success_rate numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.gateway,
        SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as total_amount,
        COUNT(*) as transaction_count,
        ROUND(
            (COUNT(CASE WHEN p.status = 'completed' THEN 1 END) * 100.0 / COUNT(*)), 2
        ) as success_rate
    FROM payments p
    JOIN tickets t ON p.ticket_id = t.ticket_id
    WHERE t.event_id = event_id_param
    GROUP BY p.gateway;
END;
$$;


--
-- Name: update_registration_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_registration_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Auto-update registration status based on current time
    IF NEW.registration_start_time > NOW() THEN
        NEW.registration_status = 'not_started';
    ELSIF NEW.registration_end_time IS NOT NULL AND NEW.registration_end_time <= NOW() THEN
        NEW.registration_status = 'closed';
    ELSIF NEW.max_attendees IS NOT NULL THEN
        -- Check if event is full
        DECLARE
            current_registrations INTEGER;
        BEGIN
            SELECT COUNT(*) INTO current_registrations 
            FROM tickets 
            WHERE event_id = NEW.event_id;
            
            IF current_registrations >= NEW.max_attendees THEN
                NEW.registration_status = 'full';
            ELSE
                NEW.registration_status = 'open';
            END IF;
        END;
    ELSE
        NEW.registration_status = 'open';
    END IF;
    
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_logs (
    log_id integer NOT NULL,
    admin_id integer NOT NULL,
    action character varying(100) NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id integer NOT NULL,
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE admin_audit_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_audit_logs IS 'Tracks all admin actions for accountability';


--
-- Name: admin_audit_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_audit_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_audit_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_audit_logs_log_id_seq OWNED BY public.admin_audit_logs.log_id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    event_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    type character varying(20) NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    location character varying(255),
    streaming_url text,
    organizer_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    ticket_price numeric(10,2) DEFAULT 0.00,
    max_attendees integer,
    is_free boolean DEFAULT true,
    event_image character varying(500),
    registration_start_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    registration_end_time timestamp without time zone,
    registration_status character varying(20) DEFAULT 'open'::character varying,
    location_name character varying(255),
    location_address text,
    location_lat numeric(10,8),
    location_lng numeric(11,8),
    location_place_id character varying(255),
    location_formatted_address text,
    meeting_type character varying(50) DEFAULT 'external'::character varying,
    meeting_room_id character varying(255),
    approval_status character varying(50) DEFAULT 'pending'::character varying,
    rejection_reason text,
    approved_by integer,
    approved_at timestamp without time zone,
    is_featured boolean DEFAULT false,
    featured_order integer,
    featured_until timestamp without time zone,
    jitsi_room character varying(255),
    jitsi_password character varying(255),
    organizer_joined boolean DEFAULT false,
    CONSTRAINT events_approval_status_check CHECK (((approval_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT events_meeting_type_check CHECK (((meeting_type)::text = ANY ((ARRAY['jitsi'::character varying, 'external'::character varying, 'builtin'::character varying, 'none'::character varying])::text[]))),
    CONSTRAINT events_registration_status_check CHECK (((registration_status)::text = ANY ((ARRAY['not_started'::character varying, 'open'::character varying, 'closed'::character varying, 'full'::character varying])::text[]))),
    CONSTRAINT events_type_check CHECK (((type)::text = ANY ((ARRAY['online'::character varying, 'offline'::character varying, 'hybrid'::character varying])::text[])))
);


--
-- Name: COLUMN events.meeting_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.meeting_type IS 'Type of video meeting: jitsi (integrated), external (streaming_url), or none';


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    ticket_id integer NOT NULL,
    user_id integer,
    event_id integer,
    qr_code text,
    price numeric(10,2),
    ticket_type character varying(50),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    status character varying(50) DEFAULT 'active'::character varying,
    ticket_type_id integer,
    payment_token character varying(500),
    scan_count integer DEFAULT 0,
    last_scanned_at timestamp without time zone,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    payment_gateway character varying(50),
    unique_meeting_token character varying(500),
    last_accessed_at timestamp without time zone,
    access_count integer DEFAULT 0,
    CONSTRAINT tickets_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying, 'free'::character varying])::text[]))),
    CONSTRAINT tickets_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'cancelled'::character varying, 'used'::character varying])::text[])))
);


--
-- Name: user_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_reports (
    report_id integer NOT NULL,
    reporter_id integer NOT NULL,
    reported_user_id integer,
    report_type character varying(50) NOT NULL,
    target_id integer,
    reason character varying(100) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'pending'::character varying,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    resolution_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_reports_report_type_check CHECK (((report_type)::text = ANY ((ARRAY['user'::character varying, 'event'::character varying, 'message'::character varying, 'question'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT user_reports_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'reviewing'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[])))
);


--
-- Name: TABLE user_reports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_reports IS 'User-submitted reports and complaints';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text,
    role character varying(20) DEFAULT 'attendee'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    two_factor_enabled boolean DEFAULT false,
    two_factor_secret character varying(255),
    reset_token character varying(255),
    reset_token_expiry timestamp without time zone,
    google_id character varying(255),
    profile_picture character varying(500),
    auth_provider character varying(50) DEFAULT 'local'::character varying,
    phone character varying(20),
    company character varying(255),
    job_title character varying(255),
    bio text,
    website character varying(500),
    linkedin character varying(500),
    twitter character varying(255),
    email_verified boolean DEFAULT false,
    verification_token character varying(255),
    verification_token_expiry timestamp without time zone,
    refresh_token character varying(500),
    refresh_token_expiry timestamp without time zone,
    login_attempts integer DEFAULT 0,
    last_login_attempt timestamp without time zone,
    account_locked_until timestamp without time zone,
    two_factor_backup_codes text[],
    account_status character varying(50) DEFAULT 'active'::character varying,
    suspension_reason text,
    suspended_until timestamp without time zone,
    suspended_by integer,
    suspended_at timestamp without time zone,
    is_verified boolean DEFAULT false,
    verification_status character varying(50) DEFAULT 'unverified'::character varying,
    verification_documents text,
    verified_by integer,
    verified_at timestamp without time zone,
    CONSTRAINT users_account_status_check CHECK (((account_status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'banned'::character varying])::text[]))),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'organizer'::character varying, 'attendee'::character varying])::text[]))),
    CONSTRAINT users_verification_status_check CHECK (((verification_status)::text = ANY ((ARRAY['unverified'::character varying, 'pending'::character varying, 'verified'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: admin_platform_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.admin_platform_stats AS
 SELECT ( SELECT count(*) AS count
           FROM public.users) AS total_users,
    ( SELECT count(*) AS count
           FROM public.users
          WHERE ((users.role)::text = 'organizer'::text)) AS total_organizers,
    ( SELECT count(*) AS count
           FROM public.users
          WHERE ((users.role)::text = 'attendee'::text)) AS total_attendees,
    ( SELECT count(*) AS count
           FROM public.users
          WHERE ((users.account_status)::text = 'active'::text)) AS active_users,
    ( SELECT count(*) AS count
           FROM public.events) AS total_events,
    ( SELECT count(*) AS count
           FROM public.events
          WHERE ((events.approval_status)::text = 'approved'::text)) AS approved_events,
    ( SELECT count(*) AS count
           FROM public.events
          WHERE ((events.approval_status)::text = 'pending'::text)) AS pending_events,
    ( SELECT count(*) AS count
           FROM public.tickets) AS total_tickets,
    ( SELECT count(*) AS count
           FROM public.tickets
          WHERE ((tickets.status)::text = 'active'::text)) AS active_tickets,
    ( SELECT COALESCE(sum((tickets.price)::numeric), (0)::numeric) AS "coalesce"
           FROM public.tickets
          WHERE ((tickets.status)::text <> 'cancelled'::text)) AS total_revenue,
    ( SELECT count(*) AS count
           FROM public.user_reports
          WHERE ((user_reports.status)::text = 'pending'::text)) AS pending_reports;


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    announcement_id integer NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) DEFAULT 'info'::character varying,
    target_audience character varying(50) DEFAULT 'all'::character varying,
    is_active boolean DEFAULT true,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    CONSTRAINT announcements_target_audience_check CHECK (((target_audience)::text = ANY ((ARRAY['all'::character varying, 'organizers'::character varying, 'attendees'::character varying, 'admins'::character varying])::text[]))),
    CONSTRAINT announcements_type_check CHECK (((type)::text = ANY ((ARRAY['info'::character varying, 'warning'::character varying, 'success'::character varying, 'error'::character varying])::text[])))
);


--
-- Name: TABLE announcements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.announcements IS 'Platform announcements for users';


--
-- Name: announcements_announcement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.announcements_announcement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: announcements_announcement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.announcements_announcement_id_seq OWNED BY public.announcements.announcement_id;


--
-- Name: event_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_access_logs (
    access_id integer NOT NULL,
    event_id integer,
    user_id integer,
    ticket_id integer,
    access_type character varying(50) DEFAULT 'view'::character varying,
    ip_address character varying(45),
    user_agent text,
    accessed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT event_access_logs_access_type_check CHECK (((access_type)::text = ANY ((ARRAY['view'::character varying, 'join'::character varying, 'leave'::character varying])::text[])))
);


--
-- Name: event_access_logs_access_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.event_access_logs_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: event_access_logs_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.event_access_logs_access_id_seq OWNED BY public.event_access_logs.access_id;


--
-- Name: events_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.events_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: events_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.events_event_id_seq OWNED BY public.events.event_id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    payment_id integer NOT NULL,
    ticket_id integer,
    amount numeric(10,2) NOT NULL,
    gateway character varying(20) NOT NULL,
    transaction_id character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    status character varying(20) DEFAULT 'completed'::character varying,
    gateway_response jsonb,
    failure_reason text,
    retry_count integer DEFAULT 0,
    completed_at timestamp without time zone,
    CONSTRAINT payments_gateway_check CHECK (((gateway)::text = ANY ((ARRAY['khalti'::character varying, 'esewa'::character varying, 'free'::character varying])::text[]))),
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))
);


--
-- Name: TABLE payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payments IS 'Enhanced payment tracking with gateway responses and status management';


--
-- Name: COLUMN payments.gateway_response; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.gateway_response IS 'Full JSON response from payment gateway for debugging';


--
-- Name: COLUMN payments.retry_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.retry_count IS 'Number of payment retry attempts';


--
-- Name: failed_payments; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.failed_payments AS
 SELECT p.payment_id,
    p.gateway,
    p.amount,
    p.failure_reason,
    p.retry_count,
    p.created_at,
    t.ticket_id,
    e.title AS event_title,
    u.email AS user_email
   FROM (((public.payments p
     JOIN public.tickets t ON ((p.ticket_id = t.ticket_id)))
     JOIN public.events e ON ((t.event_id = e.event_id)))
     JOIN public.users u ON ((t.user_id = u.user_id)))
  WHERE ((p.status)::text = 'failed'::text)
  ORDER BY p.created_at DESC;


--
-- Name: VIEW failed_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.failed_payments IS 'Failed payments with user context for support';


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    message_id integer NOT NULL,
    user_id integer,
    event_id integer,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: messages_message_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_message_id_seq OWNED BY public.messages.message_id;


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    preference_id integer NOT NULL,
    user_id integer NOT NULL,
    email_registration boolean DEFAULT true,
    email_reminder boolean DEFAULT true,
    email_updates boolean DEFAULT true,
    email_cancellation boolean DEFAULT true,
    in_app_notifications boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    email_qa_answer boolean DEFAULT true,
    email_new_poll boolean DEFAULT true
);


--
-- Name: notification_preferences_preference_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_preferences_preference_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_preferences_preference_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_preferences_preference_id_seq OWNED BY public.notification_preferences.preference_id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    notification_id integer NOT NULL,
    user_id integer,
    message text NOT NULL,
    type character varying(50),
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    title character varying(255),
    event_id integer,
    is_read boolean DEFAULT false
);


--
-- Name: notifications_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_notification_id_seq OWNED BY public.notifications.notification_id;


--
-- Name: organizer_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizer_ratings (
    rating_id integer NOT NULL,
    organizer_id integer NOT NULL,
    event_id integer NOT NULL,
    attendee_id integer NOT NULL,
    rating integer NOT NULL,
    review text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT organizer_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: TABLE organizer_ratings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.organizer_ratings IS 'Attendee ratings for organizers';


--
-- Name: organizer_performance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.organizer_performance AS
 SELECT u.user_id,
    u.name,
    u.email,
    u.is_verified,
    count(DISTINCT e.event_id) AS total_events,
    count(DISTINCT
        CASE
            WHEN ((e.approval_status)::text = 'approved'::text) THEN e.event_id
            ELSE NULL::integer
        END) AS approved_events,
    count(DISTINCT t.ticket_id) AS total_tickets_sold,
    COALESCE(sum((t.price)::numeric), (0)::numeric) AS total_revenue,
    COALESCE(avg(r.rating), (0)::numeric) AS average_rating,
    count(DISTINCT r.rating_id) AS total_ratings
   FROM (((public.users u
     LEFT JOIN public.events e ON ((u.user_id = e.organizer_id)))
     LEFT JOIN public.tickets t ON (((e.event_id = t.event_id) AND ((t.status)::text <> 'cancelled'::text))))
     LEFT JOIN public.organizer_ratings r ON ((u.user_id = r.organizer_id)))
  WHERE ((u.role)::text = 'organizer'::text)
  GROUP BY u.user_id, u.name, u.email, u.is_verified;


--
-- Name: organizer_ratings_rating_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizer_ratings_rating_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizer_ratings_rating_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizer_ratings_rating_id_seq OWNED BY public.organizer_ratings.rating_id;


--
-- Name: payment_analytics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.payment_analytics AS
 SELECT p.gateway,
    p.status,
    count(*) AS transaction_count,
    sum(p.amount) AS total_amount,
    avg(p.amount) AS avg_amount,
    date_trunc('day'::text, p.created_at) AS payment_date
   FROM public.payments p
  GROUP BY p.gateway, p.status, (date_trunc('day'::text, p.created_at))
  ORDER BY (date_trunc('day'::text, p.created_at)) DESC;


--
-- Name: VIEW payment_analytics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.payment_analytics IS 'Aggregated payment data for dashboard analytics';


--
-- Name: payments_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_payment_id_seq OWNED BY public.payments.payment_id;


--
-- Name: polloptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.polloptions (
    option_id integer NOT NULL,
    poll_id integer,
    option_text text NOT NULL
);


--
-- Name: polloptions_option_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.polloptions_option_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: polloptions_option_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.polloptions_option_id_seq OWNED BY public.polloptions.option_id;


--
-- Name: polls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.polls (
    poll_id integer NOT NULL,
    event_id integer,
    question text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    created_by integer
);


--
-- Name: polls_poll_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.polls_poll_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: polls_poll_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.polls_poll_id_seq OWNED BY public.polls.poll_id;


--
-- Name: qr_scan_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_scan_logs (
    log_id integer NOT NULL,
    ticket_id integer,
    scanned_by integer,
    scan_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    scan_result character varying(50) NOT NULL,
    ip_address inet,
    user_agent text,
    notes text
);


--
-- Name: qr_scan_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.qr_scan_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: qr_scan_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.qr_scan_logs_log_id_seq OWNED BY public.qr_scan_logs.log_id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    question_id integer NOT NULL,
    event_id integer,
    user_id integer,
    question_text text NOT NULL,
    answer_text text,
    answered_by integer,
    created_at timestamp without time zone DEFAULT now(),
    is_answered boolean DEFAULT false,
    is_approved boolean DEFAULT true,
    answered_at timestamp without time zone
);


--
-- Name: questions_question_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questions_question_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questions_question_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questions_question_id_seq OWNED BY public.questions.question_id;


--
-- Name: recent_activity_feed; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.recent_activity_feed AS
( SELECT 'user_registered'::text AS activity_type,
    users.user_id AS entity_id,
    users.name AS entity_name,
    NULL::character varying AS secondary_info,
    users.created_at
   FROM public.users
  ORDER BY users.created_at DESC
 LIMIT 10)
UNION ALL
( SELECT 'event_created'::text AS activity_type,
    events.event_id AS entity_id,
    events.title AS entity_name,
    events.approval_status AS secondary_info,
    events.created_at
   FROM public.events
  ORDER BY events.created_at DESC
 LIMIT 10)
UNION ALL
( SELECT 'ticket_purchased'::text AS activity_type,
    tickets.ticket_id AS entity_id,
    (tickets.ticket_id)::character varying AS entity_name,
    tickets.ticket_type AS secondary_info,
    tickets.created_at
   FROM public.tickets
  ORDER BY tickets.created_at DESC
 LIMIT 10)
  ORDER BY 5 DESC
 LIMIT 50;


--
-- Name: refund_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund_requests (
    refund_id integer NOT NULL,
    ticket_id integer NOT NULL,
    user_id integer NOT NULL,
    event_id integer NOT NULL,
    reason text NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    admin_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT refund_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'processed'::character varying])::text[])))
);


--
-- Name: TABLE refund_requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.refund_requests IS 'Ticket refund requests from users';


--
-- Name: refund_requests_refund_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refund_requests_refund_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refund_requests_refund_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refund_requests_refund_id_seq OWNED BY public.refund_requests.refund_id;


--
-- Name: suspicious_access; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.suspicious_access AS
 SELECT e.event_id,
    e.title AS event_title,
    t.ticket_id,
    u.name AS user_name,
    u.email AS user_email,
    count(DISTINCT eal.ip_address) AS unique_ips,
    count(*) AS access_count,
    array_agg(DISTINCT eal.ip_address) AS ip_addresses
   FROM (((public.event_access_logs eal
     JOIN public.events e ON ((eal.event_id = e.event_id)))
     JOIN public.tickets t ON ((eal.ticket_id = t.ticket_id)))
     JOIN public.users u ON ((eal.user_id = u.user_id)))
  WHERE (eal.accessed_at > (now() - '24:00:00'::interval))
  GROUP BY e.event_id, e.title, t.ticket_id, u.name, u.email
 HAVING (count(DISTINCT eal.ip_address) > 2)
  ORDER BY (count(DISTINCT eal.ip_address)) DESC, (count(*)) DESC;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    setting_id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text NOT NULL,
    setting_type character varying(50) DEFAULT 'string'::character varying,
    description text,
    updated_by integer,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT system_settings_setting_type_check CHECK (((setting_type)::text = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying])::text[])))
);


--
-- Name: TABLE system_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_settings IS 'Platform-wide configuration settings';


--
-- Name: system_settings_setting_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_settings_setting_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_settings_setting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_settings_setting_id_seq OWNED BY public.system_settings.setting_id;


--
-- Name: ticket_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_types (
    ticket_type_id integer NOT NULL,
    event_id integer,
    type_name character varying(50) NOT NULL,
    price numeric(10,2) NOT NULL,
    quantity_available integer,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ticket_types_ticket_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ticket_types_ticket_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ticket_types_ticket_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ticket_types_ticket_type_id_seq OWNED BY public.ticket_types.ticket_type_id;


--
-- Name: tickets_ticket_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tickets_ticket_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tickets_ticket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tickets_ticket_id_seq OWNED BY public.tickets.ticket_id;


--
-- Name: user_reports_report_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_reports_report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_reports_report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_reports_report_id_seq OWNED BY public.user_reports.report_id;


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.votes (
    vote_id integer NOT NULL,
    option_id integer,
    user_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: votes_vote_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.votes_vote_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: votes_vote_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.votes_vote_id_seq OWNED BY public.votes.vote_id;


--
-- Name: admin_audit_logs log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs ALTER COLUMN log_id SET DEFAULT nextval('public.admin_audit_logs_log_id_seq'::regclass);


--
-- Name: announcements announcement_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements ALTER COLUMN announcement_id SET DEFAULT nextval('public.announcements_announcement_id_seq'::regclass);


--
-- Name: event_access_logs access_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_access_logs ALTER COLUMN access_id SET DEFAULT nextval('public.event_access_logs_access_id_seq'::regclass);


--
-- Name: events event_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events ALTER COLUMN event_id SET DEFAULT nextval('public.events_event_id_seq'::regclass);


--
-- Name: messages message_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN message_id SET DEFAULT nextval('public.messages_message_id_seq'::regclass);


--
-- Name: notification_preferences preference_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences ALTER COLUMN preference_id SET DEFAULT nextval('public.notification_preferences_preference_id_seq'::regclass);


--
-- Name: notifications notification_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN notification_id SET DEFAULT nextval('public.notifications_notification_id_seq'::regclass);


--
-- Name: organizer_ratings rating_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizer_ratings ALTER COLUMN rating_id SET DEFAULT nextval('public.organizer_ratings_rating_id_seq'::regclass);


--
-- Name: payments payment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN payment_id SET DEFAULT nextval('public.payments_payment_id_seq'::regclass);


--
-- Name: polloptions option_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polloptions ALTER COLUMN option_id SET DEFAULT nextval('public.polloptions_option_id_seq'::regclass);


--
-- Name: polls poll_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polls ALTER COLUMN poll_id SET DEFAULT nextval('public.polls_poll_id_seq'::regclass);


--
-- Name: qr_scan_logs log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_scan_logs ALTER COLUMN log_id SET DEFAULT nextval('public.qr_scan_logs_log_id_seq'::regclass);


--
-- Name: questions question_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions ALTER COLUMN question_id SET DEFAULT nextval('public.questions_question_id_seq'::regclass);


--
-- Name: refund_requests refund_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests ALTER COLUMN refund_id SET DEFAULT nextval('public.refund_requests_refund_id_seq'::regclass);


--
-- Name: system_settings setting_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN setting_id SET DEFAULT nextval('public.system_settings_setting_id_seq'::regclass);


--
-- Name: ticket_types ticket_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_types ALTER COLUMN ticket_type_id SET DEFAULT nextval('public.ticket_types_ticket_type_id_seq'::regclass);


--
-- Name: tickets ticket_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets ALTER COLUMN ticket_id SET DEFAULT nextval('public.tickets_ticket_id_seq'::regclass);


--
-- Name: user_reports report_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports ALTER COLUMN report_id SET DEFAULT nextval('public.user_reports_report_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: votes vote_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes ALTER COLUMN vote_id SET DEFAULT nextval('public.votes_vote_id_seq'::regclass);


--
-- Name: admin_audit_logs admin_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (log_id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (announcement_id);


--
-- Name: event_access_logs event_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_access_logs
    ADD CONSTRAINT event_access_logs_pkey PRIMARY KEY (access_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (event_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (message_id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (preference_id);


--
-- Name: notification_preferences notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: organizer_ratings organizer_ratings_event_id_attendee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizer_ratings
    ADD CONSTRAINT organizer_ratings_event_id_attendee_id_key UNIQUE (event_id, attendee_id);


--
-- Name: organizer_ratings organizer_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizer_ratings
    ADD CONSTRAINT organizer_ratings_pkey PRIMARY KEY (rating_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: payments payments_ticket_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_ticket_id_key UNIQUE (ticket_id);


--
-- Name: payments payments_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);


--
-- Name: polloptions polloptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polloptions
    ADD CONSTRAINT polloptions_pkey PRIMARY KEY (option_id);


--
-- Name: polls polls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_pkey PRIMARY KEY (poll_id);


--
-- Name: qr_scan_logs qr_scan_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_scan_logs
    ADD CONSTRAINT qr_scan_logs_pkey PRIMARY KEY (log_id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (question_id);


--
-- Name: refund_requests refund_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_pkey PRIMARY KEY (refund_id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (setting_id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: ticket_types ticket_types_event_id_type_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_types
    ADD CONSTRAINT ticket_types_event_id_type_name_key UNIQUE (event_id, type_name);


--
-- Name: ticket_types ticket_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_types
    ADD CONSTRAINT ticket_types_pkey PRIMARY KEY (ticket_type_id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (ticket_id);


--
-- Name: user_reports user_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_pkey PRIMARY KEY (report_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: votes votes_option_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_option_id_user_id_key UNIQUE (option_id, user_id);


--
-- Name: votes votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_pkey PRIMARY KEY (vote_id);


--
-- Name: idx_announcements_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_active ON public.announcements USING btree (is_active, expires_at);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.admin_audit_logs USING btree (action);


--
-- Name: idx_audit_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_admin_id ON public.admin_audit_logs USING btree (admin_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.admin_audit_logs USING btree (created_at);


--
-- Name: idx_event_access_logs_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_access_logs_event ON public.event_access_logs USING btree (event_id);


--
-- Name: idx_event_access_logs_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_access_logs_ticket ON public.event_access_logs USING btree (ticket_id);


--
-- Name: idx_event_access_logs_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_access_logs_time ON public.event_access_logs USING btree (accessed_at DESC);


--
-- Name: idx_event_access_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_access_logs_user ON public.event_access_logs USING btree (user_id);


--
-- Name: idx_events_approval_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_approval_status ON public.events USING btree (approval_status);


--
-- Name: idx_events_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_featured ON public.events USING btree (is_featured, featured_order);


--
-- Name: idx_events_jitsi_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_jitsi_room ON public.events USING btree (jitsi_room);


--
-- Name: idx_events_location_lat_lng; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_location_lat_lng ON public.events USING btree (location_lat, location_lng);


--
-- Name: idx_events_registration_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_registration_end ON public.events USING btree (registration_end_time);


--
-- Name: idx_events_registration_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_registration_status ON public.events USING btree (registration_status);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_payments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_created_at ON public.payments USING btree (created_at);


--
-- Name: idx_payments_gateway; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_gateway ON public.payments USING btree (gateway);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_payments_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_ticket ON public.payments USING btree (ticket_id);


--
-- Name: idx_payments_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_transaction ON public.payments USING btree (transaction_id);


--
-- Name: idx_ratings_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_event ON public.organizer_ratings USING btree (event_id);


--
-- Name: idx_ratings_organizer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_organizer ON public.organizer_ratings USING btree (organizer_id);


--
-- Name: idx_refunds_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_status ON public.refund_requests USING btree (status);


--
-- Name: idx_refunds_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_user ON public.refund_requests USING btree (user_id);


--
-- Name: idx_reports_reported_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_reported_user ON public.user_reports USING btree (reported_user_id);


--
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_status ON public.user_reports USING btree (status);


--
-- Name: idx_reports_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_type ON public.user_reports USING btree (report_type);


--
-- Name: idx_ticket_types_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_types_event ON public.ticket_types USING btree (event_id);


--
-- Name: idx_tickets_last_scanned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_last_scanned ON public.tickets USING btree (last_scanned_at);


--
-- Name: idx_tickets_payment_gateway; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_payment_gateway ON public.tickets USING btree (payment_gateway);


--
-- Name: idx_tickets_scan_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_scan_count ON public.tickets USING btree (scan_count);


--
-- Name: idx_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_status ON public.tickets USING btree (status);


--
-- Name: idx_tickets_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_type ON public.tickets USING btree (ticket_type_id);


--
-- Name: idx_users_account_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_account_status ON public.users USING btree (account_status);


--
-- Name: idx_users_refresh_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_refresh_token ON public.users USING btree (refresh_token);


--
-- Name: idx_users_verification_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_verification_token ON public.users USING btree (verification_token);


--
-- Name: events event_auto_approval; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER event_auto_approval BEFORE INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.check_event_auto_approval();


--
-- Name: events trigger_update_registration_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_registration_status BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_registration_status();


--
-- Name: users user_suspension_check; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER user_suspension_check BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.check_user_suspension();


--
-- Name: admin_audit_logs admin_audit_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(user_id);


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: event_access_logs event_access_logs_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_access_logs
    ADD CONSTRAINT event_access_logs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE;


--
-- Name: event_access_logs event_access_logs_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_access_logs
    ADD CONSTRAINT event_access_logs_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(ticket_id) ON DELETE CASCADE;


--
-- Name: event_access_logs event_access_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_access_logs
    ADD CONSTRAINT event_access_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: events events_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(user_id);


--
-- Name: events events_organizer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: messages messages_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE;


--
-- Name: messages messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: notifications notifications_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: organizer_ratings organizer_ratings_attendee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizer_ratings
    ADD CONSTRAINT organizer_ratings_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES public.users(user_id);


--
-- Name: organizer_ratings organizer_ratings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizer_ratings
    ADD CONSTRAINT organizer_ratings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id);


--
-- Name: organizer_ratings organizer_ratings_organizer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizer_ratings
    ADD CONSTRAINT organizer_ratings_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.users(user_id);


--
-- Name: payments payments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(ticket_id) ON DELETE CASCADE;


--
-- Name: polloptions polloptions_poll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polloptions
    ADD CONSTRAINT polloptions_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(poll_id) ON DELETE CASCADE;


--
-- Name: polls polls_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: polls polls_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE;


--
-- Name: qr_scan_logs qr_scan_logs_scanned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_scan_logs
    ADD CONSTRAINT qr_scan_logs_scanned_by_fkey FOREIGN KEY (scanned_by) REFERENCES public.users(user_id);


--
-- Name: qr_scan_logs qr_scan_logs_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_scan_logs
    ADD CONSTRAINT qr_scan_logs_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(ticket_id);


--
-- Name: questions questions_answered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES public.users(user_id);


--
-- Name: questions questions_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE;


--
-- Name: questions questions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: refund_requests refund_requests_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id);


--
-- Name: refund_requests refund_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id);


--
-- Name: refund_requests refund_requests_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(ticket_id);


--
-- Name: refund_requests refund_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);


--
-- Name: ticket_types ticket_types_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_types
    ADD CONSTRAINT ticket_types_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE;


--
-- Name: tickets tickets_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE;


--
-- Name: tickets tickets_ticket_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES public.ticket_types(ticket_type_id);


--
-- Name: tickets tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: user_reports user_reports_reported_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.users(user_id);


--
-- Name: user_reports user_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(user_id);


--
-- Name: user_reports user_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reports
    ADD CONSTRAINT user_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id);


--
-- Name: users users_suspended_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_suspended_by_fkey FOREIGN KEY (suspended_by) REFERENCES public.users(user_id);


--
-- Name: users users_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(user_id);


--
-- Name: votes votes_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.polloptions(option_id) ON DELETE CASCADE;


--
-- Name: votes votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

