import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';
import RoleSelection from './pages/RoleSelection';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import CreateEvent from './pages/CreateEvent';
import MyTickets from './pages/MyTickets';
import MyEvents from './pages/MyEvents';
import OrganizerEventManage from './pages/OrganizerEventManage';
import QRScanner from './pages/QRScanner';
import PaymentVerify from './pages/PaymentVerify';
import EsewaVerify from './pages/EsewaVerify';
import EventLive from './pages/EventLive';
import EventAnalytics from './pages/EventAnalytics';
import Settings from './pages/Settings';
import VerifyEmail from './pages/VerifyEmail';
import TwoFactorVerify from './pages/TwoFactorVerify';
import AdminDashboard from './pages/AdminDashboard';
import AdminEventDetails from './pages/AdminEventDetails';
import SocketTest from './pages/SocketTest';
import EditEvent from './pages/EditEvent';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/organizer/events/:id" element={<OrganizerEventManage />} />
        <Route path="/organizer/events/:id/edit" element={<EditEvent />} />
        <Route path="/qr-scanner" element={<QRScanner />} />
        <Route path="/events/:id/live" element={<EventLive />} />
        <Route path="/events/:id/analytics" element={<EventAnalytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-2fa" element={<TwoFactorVerify />} />
        <Route path="/payment/verify" element={<PaymentVerify />} />
        <Route path="/payment/esewa/verify" element={<EsewaVerify />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/events/:eventId" element={<AdminEventDetails />} />
        <Route path="/socket-test" element={<SocketTest />} />
      </Routes>
    </Router>
  );
}

export default App;
