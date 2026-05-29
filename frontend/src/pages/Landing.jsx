import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Ticket, BarChart3, QrCode, Users, Globe, Search, CreditCard, Bell, MessageCircle, Star, MapPin } from 'lucide-react';
import '../styles/Landing.css';

const Landing = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState('organizers');

  const stats = [
    { value: '50K+', label: 'Events Hosted' },
    { value: '2M+', label: 'Tickets Sold' },
    { value: '500K+', label: 'Active Attendees' },
    { value: '150+', label: 'Countries' }
  ];

  const organizerFeatures = [
    {
      icon: <Calendar className="feature-icon" />,
      title: 'Effortless Event Creation',
      description: 'Build stunning event pages in minutes with our intuitive drag-and-drop builder. No coding required.'
    },
    {
      icon: <Ticket className="feature-icon" />,
      title: 'Smart Ticketing',
      description: 'Set up multiple ticket types, early bird pricing, and promo codes with automated inventory management.'
    },
    {
      icon: <BarChart3 className="feature-icon" />,
      title: 'Real-time Analytics',
      description: 'Track ticket sales, revenue, and attendee engagement with beautiful live dashboards.'
    },
    {
      icon: <QrCode className="feature-icon" />,
      title: 'QR Code Check-in',
      description: 'Speed up entry with built-in QR scanning. Check attendees in seconds with any device.'
    },
    {
      icon: <Users className="feature-icon" />,
      title: 'Attendee Management',
      description: 'Organize guest lists, send bulk communications, and export data in one click.'
    },
    {
      icon: <Globe className="feature-icon" />,
      title: 'Hybrid & Virtual',
      description: 'Host in-person, virtual, or hybrid events with integrated streaming and networking tools.'
    }
  ];

  const attendeeFeatures = [
    {
      icon: <Search className="feature-icon" />,
      title: 'Discover Events',
      description: 'Browse thousands of events near you or online. Filter by category, date, location, and price.'
    },
    {
      icon: <CreditCard className="feature-icon" />,
      title: 'Instant Tickets',
      description: 'Buy tickets in seconds with secure payment. Digital tickets delivered instantly to your inbox.'
    },
    {
      icon: <Calendar className="feature-icon" />,
      title: 'Live Calendar',
      description: 'All your events with live updates in one place. Get reminders, directions, and real-time notifications.'
    },
    {
      icon: <MessageCircle className="feature-icon" />,
      title: 'Chat, Polls & Q&A',
      description: 'Interact with hosts and attendees during events. Participate in live polls, ask questions, and network.'
    },
    {
      icon: <Star className="feature-icon" />,
      title: 'Save Tickets',
      description: 'All your tickets are saved securely in your account. Access them anytime, anywhere on any device.'
    },
    {
      icon: <MapPin className="feature-icon" />,
      title: 'Reminders & Location',
      description: 'Never miss an event with smart reminders. Get one-tap directions to the venue right when you need them.'
    }
  ];

  const howItWorks = {
    host: [
      {
        step: '01',
        title: 'Create Your Event',
        description: 'Set up your event details, upload branding, and configure ticket types in under 5 minutes.'
      },
      {
        step: '02',
        title: 'Share & Sell',
        description: 'Publish your event page and share the link. Accept payments securely from attendees worldwide.'
      },
      {
        step: '03',
        title: 'Manage & Analyze',
        description: 'Use our dashboard to track sales, check in guests, and gather insights for your next event.'
      }
    ],
    attend: [
      {
        step: '01',
        title: 'Browse Events',
        description: 'Search by location, category, or date. Find everything from concerts to workshops nearby.'
      },
      {
        step: '02',
        title: 'Book Your Spot',
        description: 'Choose your ticket, pay securely, and receive your digital pass instantly on any device.'
      },
      {
        step: '03',
        title: 'Show Up & Enjoy',
        description: 'Get reminders, directions, and updates. Just show your QR code at the door and enjoy.'
      }
    ]
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-circle">
              <div className="logo-ring"></div>
            </div>
            <span className="logo-text">NEXUS</span>
          </div>
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <button onClick={() => navigate('/login')} className="btn-get-started">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            50K+ events, 2M+ tickets sold worldwide
          </div>
          <h1 className="hero-title">
            Host Events.
            <br />
            <span className="hero-title-gradient">Attend Moments.</span>
          </h1>
          <p className="hero-description">
            Whether you are organizing the next big conference or searching for unforgettable experiences, NEXUS connects you to the world of live events.
          </p>
          <div className="hero-buttons">
            <button onClick={() => navigate('/login')} className="btn-primary">
              Host an Event
            </button>
            <button onClick={() => navigate('/login')} className="btn-secondary">
              Explore Events
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <span className="section-label">Features</span>
          <h2 className="section-title">Built for Everyone</h2>
          <p className="section-description">
            Powerful tools for organizers. Seamless experience for attendees. One platform for the entire event ecosystem.
          </p>
          <div className="feature-tabs">
            <button 
              className={`tab-button ${activeTab === 'organizers' ? 'active' : ''}`}
              onClick={() => setActiveTab('organizers')}
            >
              For Organizers
            </button>
            <button 
              className={`tab-button ${activeTab === 'attendees' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendees')}
            >
              For Attendees
            </button>
          </div>
        </div>
        <div className="features-grid">
          {(activeTab === 'organizers' ? organizerFeatures : attendeeFeatures).map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon-wrapper">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="section-header">
          <span className="section-label">How It Works</span>
          <h2 className="section-title">Simple, Whether You Host or Attend</h2>
          <p className="section-description">
            Get started in minutes, no matter which side of the event you are on.
          </p>
        </div>
        <div className="how-it-works-grid">
          <div className="how-it-works-column">
            <div className="column-header">
              <Calendar className="column-icon" />
              <h3>Host an Event</h3>
            </div>
            {howItWorks.host.map((item, index) => (
              <div key={index} className="how-it-works-item">
                <div className="step-number">{item.step}</div>
                <div className="step-content">
                  <h4 className="step-title">{item.title}</h4>
                  <p className="step-description">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="how-it-works-column">
            <div className="column-header">
              <Ticket className="column-icon" />
              <h3>Attend an Event</h3>
            </div>
            {howItWorks.attend.map((item, index) => (
              <div key={index} className="how-it-works-item">
                <div className="step-number">{item.step}</div>
                <div className="step-content">
                  <h4 className="step-title">{item.title}</h4>
                  <p className="step-description">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready for Your Next Event?</h2>
          <p className="cta-description">
            Join thousands of organizers and attendees who trust NEXUS to power every moment.
          </p>
          <div className="cta-buttons">
            <button onClick={() => navigate('/login')} className="btn-cta-primary">
              Host an Event
            </button>
            <button onClick={() => navigate('/login')} className="btn-cta-secondary">
              Browse Events
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <div className="logo-circle">
              <div className="logo-ring"></div>
            </div>
            <span className="logo-text">NEXUS</span>
          </div>
          <p className="footer-text">
            © 2024 NEXUS. Connecting people through unforgettable events.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
