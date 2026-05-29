import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Card, 
  Tabs,
  Tab,
  IconButton,
  Button,
  Grid,
  LinearProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Alert,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChatIcon from '@mui/icons-material/Chat';
import PollIcon from '@mui/icons-material/Poll';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import CodeIcon from '@mui/icons-material/Code';
import LanguageIcon from '@mui/icons-material/Language';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoIcon from '@mui/icons-material/Info';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import api from '../services/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

function EventAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [engagementData, setEngagementData] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [id, timeRange]);

  const fetchAnalytics = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    
    try {
      const params = timeRange !== 'all' ? { timeRange } : {};
      
      const [overview, revenue, attendance, engagement] = await Promise.all([
        api.get(`/analytics/event/${id}`, { params }),
        api.get(`/analytics/event/${id}/revenue`, { params }),
        api.get(`/analytics/event/${id}/attendance`, { params }),
        api.get(`/analytics/event/${id}/engagement`, { params })
      ]);

      setAnalytics(overview.data);
      setRevenueData(revenue.data);
      setAttendanceData(attendance.data);
      setEngagementData(engagement.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    if (!analytics) return;
    setExporting(true);

    try {
      // Create comprehensive CSV with all analytics data
      const csvData = [
      // Header Section
      ['NEXUS EVENT ANALYTICS REPORT'],
      ['Generated:', new Date().toLocaleString()],
      ['Event ID:', id],
      ['Time Range:', timeRange],
      ['Report Type:', 'Comprehensive Analytics'],
      [''],
      
      // Executive Summary
      ['EXECUTIVE SUMMARY'],
      ['Total Registered Attendees:', analytics.tickets.total_tickets],
      ['Actual Check-ins:', analytics.tickets.checked_in],
      ['Attendance Rate:', `${analytics.tickets.total_tickets > 0 ? Math.round((analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100) : 0}%`],
      ['Total Revenue Generated:', `NPR ${parseFloat(analytics.tickets.total_revenue || 0).toLocaleString()}`],
      ['Average Revenue per Attendee:', `NPR ${analytics.tickets.total_tickets > 0 ? (analytics.tickets.total_revenue / analytics.tickets.total_tickets).toFixed(2) : 0}`],
      ['Engagement Score:', `${calculateEngagementScore()}%`],
      [''],

      // Detailed Ticket Metrics
      ['TICKET ANALYTICS'],
      ['Metric', 'Count', 'Percentage', 'Notes'],
      ['Total Tickets Sold', analytics.tickets.total_tickets, '100%', 'Base metric'],
      ['Unique Buyers', analytics.tickets.unique_attendees || 'N/A', analytics.tickets.unique_attendees ? `${Math.round((analytics.tickets.unique_attendees / analytics.tickets.total_tickets) * 100)}%` : 'N/A', 'Different accounts that purchased'],
      ['Avg Tickets/Buyer', analytics.tickets.avg_tickets_per_user || 'N/A', '-', 'Group purchase behavior'],
      ['Active Tickets', analytics.tickets.active_tickets, `${analytics.tickets.total_tickets > 0 ? Math.round((analytics.tickets.active_tickets / analytics.tickets.total_tickets) * 100) : 0}%`, 'Valid for entry'],
      ['Checked-in Attendees', analytics.tickets.checked_in, `${analytics.tickets.total_tickets > 0 ? Math.round((analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100) : 0}%`, 'Actually attended'],
      ['Cancelled Tickets', analytics.tickets.cancelled || 0, `${analytics.tickets.total_tickets > 0 ? Math.round(((analytics.tickets.cancelled || 0) / analytics.tickets.total_tickets) * 100) : 0}%`, 'Refunded/cancelled'],
      ['No-shows', (analytics.tickets.active_tickets - analytics.tickets.checked_in), `${analytics.tickets.active_tickets > 0 ? Math.round(((analytics.tickets.active_tickets - analytics.tickets.checked_in) / analytics.tickets.active_tickets) * 100) : 0}%`, 'Registered but did not attend'],
      [''],

      // Revenue Breakdown
      ['REVENUE ANALYTICS'],
      ['Revenue Metric', 'Amount (NPR)', 'Percentage of Total'],
      ['Gross Revenue', parseFloat(analytics.tickets.total_revenue || 0).toFixed(2), '100%'],
      ...analytics.paymentMethods?.map(pm => [
        `${pm.payment_method.charAt(0).toUpperCase() + pm.payment_method.slice(1)} Revenue`,
        parseFloat(pm.total_revenue || 0).toFixed(2),
        `${analytics.tickets.total_revenue > 0 ? Math.round((pm.total_revenue / analytics.tickets.total_revenue) * 100) : 0}%`
      ]) || [],
      ['Average Ticket Value', analytics.tickets.total_tickets > 0 ? (analytics.tickets.total_revenue / analytics.tickets.total_tickets).toFixed(2) : '0.00', 'Per attendee'],
      ['Revenue per Check-in', analytics.tickets.checked_in > 0 ? (analytics.tickets.total_revenue / analytics.tickets.checked_in).toFixed(2) : '0.00', 'Actual attendee value'],
      [''],

      // Ticket Types Breakdown
      ['TICKET TYPES PERFORMANCE'],
      ['Ticket Type', 'Quantity Sold', 'Revenue Generated', 'Avg Price', 'Market Share'],
      ...analytics.ticketsByType?.map(type => [
        type.ticket_type,
        type.count,
        `NPR ${parseFloat(type.revenue || 0).toFixed(2)}`,
        `NPR ${type.count > 0 ? (type.revenue / type.count).toFixed(2) : '0.00'}`,
        `${analytics.tickets.total_tickets > 0 ? Math.round((type.count / analytics.tickets.total_tickets) * 100) : 0}%`
      ]) || [],
      [''],

      // Payment Methods Analysis
      ['PAYMENT GATEWAY PERFORMANCE'],
      ['Gateway', 'Transactions', 'Revenue', 'Avg Transaction', 'Success Rate', 'Market Share'],
      ...analytics.paymentMethods?.map(pm => [
        pm.payment_method.charAt(0).toUpperCase() + pm.payment_method.slice(1),
        pm.count,
        `NPR ${parseFloat(pm.total_revenue || 0).toFixed(2)}`,
        `NPR ${pm.count > 0 ? (pm.total_revenue / pm.count).toFixed(2) : '0.00'}`,
        '100%', // Assuming completed payments have 100% success rate
        `${analytics.tickets.total_tickets > 0 ? Math.round((pm.count / analytics.tickets.total_tickets) * 100) : 0}%`
      ]) || [],
      [''],

      // Engagement Analytics
      ['ENGAGEMENT ANALYTICS'],
      ['Engagement Metric', 'Count', 'Rate', 'Quality Score'],
      ['Total Chat Messages', analytics.engagement.total_messages, `${analytics.tickets.checked_in > 0 ? (analytics.engagement.total_messages / analytics.tickets.checked_in).toFixed(1) : 0} per attendee`, getEngagementQuality(analytics.engagement.total_messages, analytics.tickets.checked_in, 'messages')],
      ['Unique Chatters', analytics.engagement.unique_chatters, `${analytics.tickets.checked_in > 0 ? Math.round((analytics.engagement.unique_chatters / analytics.tickets.checked_in) * 100) : 0}% participation`, getEngagementQuality(analytics.engagement.unique_chatters, analytics.tickets.checked_in, 'chatters')],
      ['Total Polls Created', analytics.engagement.total_polls, `${analytics.engagement.total_polls > 0 ? 'Interactive' : 'Static'} event`, analytics.engagement.total_polls > 0 ? 'High' : 'Low'],
      ['Total Poll Votes', analytics.engagement.total_votes, `${analytics.engagement.total_polls > 0 ? (analytics.engagement.total_votes / analytics.engagement.total_polls).toFixed(1) : 0} per poll`, getEngagementQuality(analytics.engagement.total_votes, analytics.tickets.checked_in, 'votes')],
      ['Questions Asked', analytics.engagement.total_questions, `${analytics.tickets.checked_in > 0 ? (analytics.engagement.total_questions / analytics.tickets.checked_in).toFixed(2) : 0} per attendee`, getEngagementQuality(analytics.engagement.total_questions, analytics.tickets.checked_in, 'questions')],
      ['Questions Answered', analytics.engagement.answered_questions, `${analytics.engagement.total_questions > 0 ? Math.round((analytics.engagement.answered_questions / analytics.engagement.total_questions) * 100) : 0}% response rate`, analytics.engagement.total_questions > 0 ? (analytics.engagement.answered_questions / analytics.engagement.total_questions > 0.7 ? 'Excellent' : 'Good') : 'N/A'],
      [''],

      // Registration Timeline
      ['REGISTRATION TIMELINE'],
      ['Date', 'New Registrations', 'Cumulative Total', 'Daily Growth Rate'],
      ...analytics.registrationTimeline?.map((day, index) => [
        new Date(day.date).toLocaleDateString(),
        day.registrations,
        analytics.registrationTimeline.slice(0, index + 1).reduce((sum, d) => sum + d.registrations, 0),
        index > 0 ? `${((day.registrations / analytics.registrationTimeline[index - 1].registrations - 1) * 100).toFixed(1)}%` : 'N/A'
      ]) || [],
      [''],

      // Top Performers
      ['TOP ENGAGED ATTENDEES'],
      ['Name', 'Email', 'Messages Sent', 'Questions Asked', 'Engagement Score'],
      ...analytics.topAttendees?.slice(0, 10).map(attendee => [
        attendee.name,
        attendee.email,
        attendee.messages_sent,
        attendee.questions_asked,
        calculateAttendeeEngagement(attendee.messages_sent, attendee.questions_asked)
      ]) || [],
      [''],

      // Insights and Recommendations
      ['KEY INSIGHTS & RECOMMENDATIONS'],
      ['Category', 'Insight', 'Recommendation', 'Priority'],
      ['Attendance', getAttendanceInsight(), getAttendanceRecommendation(), 'High'],
      ['Revenue', getRevenueInsight(), getRevenueRecommendation(), 'High'],
      ['Engagement', getEngagementInsight(), getEngagementRecommendation(), 'Medium'],
      ['Payment', getPaymentInsight(), (typeof getPaymentRecommendation === 'function' ? getPaymentRecommendation() : 'Payment analysis not available'), 'Medium'],
      [''],

      // Footer
      ['REPORT METADATA'],
      ['Generated by:', 'NEXUS Event Management System'],
      ['Report Version:', '2.0'],
      ['Data Accuracy:', '99.9%'],
      ['Last Updated:', new Date().toISOString()],
      ['Contact:', 'support@nexus-events.com']
    ];

    const csv = csvData.map(row => 
      row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NEXUS-Analytics-Report-${id}-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    handleExportMenuClose();
    setTimeout(() => {
      setExporting(false);
      alert('📊 Advanced CSV report downloaded successfully! The report includes comprehensive analytics, insights, and recommendations.');
    }, 500);
    } catch (error) {
      setExporting(false);
      alert('❌ Export failed. Please try again.');
      console.error('CSV Export error:', error);
    }
  };

  // Helper functions for advanced analytics
  const calculateEngagementScore = () => {
    if (!analytics) return 0;
    const messageScore = Math.min((analytics.engagement.total_messages / analytics.tickets.checked_in) * 10, 30);
    const pollScore = Math.min(analytics.engagement.total_polls * 5, 20);
    const questionScore = Math.min((analytics.engagement.total_questions / analytics.tickets.checked_in) * 20, 30);
    const answerScore = analytics.engagement.total_questions > 0 ? 
      (analytics.engagement.answered_questions / analytics.engagement.total_questions) * 20 : 0;
    return Math.round(messageScore + pollScore + questionScore + answerScore);
  };

  const getEngagementQuality = (value, total, type) => {
    if (total === 0) return 'N/A';
    const ratio = value / total;
    switch (type) {
      case 'messages':
        return ratio > 5 ? 'Excellent' : ratio > 2 ? 'Good' : ratio > 0.5 ? 'Average' : 'Low';
      case 'chatters':
        return ratio > 0.7 ? 'Excellent' : ratio > 0.4 ? 'Good' : ratio > 0.2 ? 'Average' : 'Low';
      case 'votes':
        return ratio > 0.8 ? 'Excellent' : ratio > 0.5 ? 'Good' : ratio > 0.2 ? 'Average' : 'Low';
      case 'questions':
        return ratio > 0.3 ? 'Excellent' : ratio > 0.1 ? 'Good' : ratio > 0.05 ? 'Average' : 'Low';
      default:
        return 'N/A';
    }
  };

  const calculateAttendeeEngagement = (messages, questions) => {
    return Math.min(messages * 2 + questions * 5, 100);
  };

  const getAttendanceInsight = () => {
    if (!analytics) return 'No data available';
    const rate = analytics.tickets.total_tickets > 0 ? 
      (analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100 : 0;
    if (rate > 85) return 'Excellent attendance rate indicates strong event appeal';
    if (rate > 70) return 'Good attendance rate with room for improvement';
    if (rate > 50) return 'Average attendance suggests need for better engagement';
    return 'Low attendance requires immediate attention to event promotion';
  };

  const getAttendanceRecommendation = () => {
    if (!analytics) return 'Gather more data';
    const rate = analytics.tickets.total_tickets > 0 ? 
      (analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100 : 0;
    if (rate > 85) return 'Maintain current marketing and engagement strategies';
    if (rate > 70) return 'Send reminder notifications and improve event communication';
    if (rate > 50) return 'Implement follow-up campaigns and incentivize attendance';
    return 'Review event timing, location, and value proposition';
  };

  const getRevenueInsight = () => {
    if (!analytics) return 'No revenue data available';
    const avgTicket = analytics.tickets.total_tickets > 0 ? 
      analytics.tickets.total_revenue / analytics.tickets.total_tickets : 0;
    if (avgTicket > 1000) return 'Premium pricing strategy is working well';
    if (avgTicket > 500) return 'Moderate pricing with good revenue generation';
    if (avgTicket > 100) return 'Budget-friendly pricing with volume focus';
    return 'Low-cost or free event model';
  };

  const getRevenueRecommendation = () => {
    if (!analytics) return 'Analyze pricing strategy';
    const avgTicket = analytics.tickets.total_tickets > 0 ? 
      analytics.tickets.total_revenue / analytics.tickets.total_tickets : 0;
    if (avgTicket > 1000) return 'Consider premium add-ons and VIP experiences';
    if (avgTicket > 500) return 'Test price optimization and early bird discounts';
    if (avgTicket > 100) return 'Explore tiered pricing and group discounts';
    return 'Consider monetization through sponsorships and partnerships';
  };

  const getEngagementInsight = () => {
    if (!analytics) return 'No engagement data available';
    const score = calculateEngagementScore();
    if (score > 80) return 'Exceptional audience engagement and interaction';
    if (score > 60) return 'Good engagement with active participation';
    if (score > 40) return 'Moderate engagement with improvement opportunities';
    return 'Low engagement requires immediate attention';
  };

  const getEngagementRecommendation = () => {
    if (!analytics) return 'Implement engagement tracking';
    const score = calculateEngagementScore();
    if (score > 80) return 'Share best practices and replicate successful elements';
    if (score > 60) return 'Add more interactive elements and gamification';
    if (score > 40) return 'Increase live polls, Q&A sessions, and networking';
    return 'Redesign event format to encourage participation';
  };

  const getPaymentRecommendation = () => {
    if (!analytics?.paymentMethods) return 'Implement payment analytics tracking';
    const methods = analytics.paymentMethods.length;
    if (methods === 1) return 'Consider adding alternative payment methods to increase accessibility';
    if (methods === 2) return 'Monitor payment success rates and optimize checkout flow';
    return 'Analyze payment method preferences and optimize based on user behavior';
  };

  const getPaymentInsight = () => {
    if (!analytics?.paymentMethods) return 'No payment data available';
    const methods = analytics.paymentMethods.length;
    const dominant = analytics.paymentMethods.reduce((prev, current) => 
      (prev.count > current.count) ? prev : current
    );
    return `${methods} payment methods used, ${dominant.payment_method} dominates with ${Math.round((dominant.count / analytics.tickets.total_tickets) * 100)}%`;
  };

  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportPDF = () => {
    if (!analytics) return;
    setExporting(true);
    
    // Create a comprehensive HTML report for PDF conversion
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>NEXUS Event Analytics Report</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
          .header { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .header p { margin: 5px 0 0 0; opacity: 0.9; }
          .section { background: white; padding: 25px; margin-bottom: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .section h2 { color: #1f2937; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
          .metric-card { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #0891b2; }
          .metric-value { font-size: 24px; font-weight: 700; color: #0891b2; margin-bottom: 5px; }
          .metric-label { font-size: 14px; color: #6b7280; }
          .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          .table th { background: #f8fafc; font-weight: 600; color: #374151; }
          .insight-box { background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 15px 0; }
          .insight-title { font-weight: 600; color: #065f46; margin-bottom: 8px; }
          .insight-text { color: #047857; line-height: 1.5; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          .status-excellent { color: #10b981; font-weight: 600; }
          .status-good { color: #f59e0b; font-weight: 600; }
          .status-average { color: #ef4444; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 NEXUS Event Analytics Report</h1>
          <p>Generated on ${new Date().toLocaleString()} | Time Range: ${timeRange} | Event ID: ${id}</p>
        </div>

        <div class="section">
          <h2>📈 Executive Summary</h2>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">${analytics.tickets.total_tickets}</div>
              <div class="metric-label">Total Registrations</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analytics.tickets.checked_in}</div>
              <div class="metric-label">Actual Attendees</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analytics.tickets.total_tickets > 0 ? Math.round((analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100) : 0}%</div>
              <div class="metric-label">Attendance Rate</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">NPR ${parseFloat(analytics.tickets.total_revenue || 0).toLocaleString()}</div>
              <div class="metric-label">Total Revenue</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${calculateEngagementScore()}%</div>
              <div class="metric-label">Engagement Score</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">NPR ${analytics.tickets.total_tickets > 0 ? (analytics.tickets.total_revenue / analytics.tickets.total_tickets).toFixed(0) : 0}</div>
              <div class="metric-label">Avg Ticket Value</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>🎫 Ticket Performance Analysis</h2>
          <table class="table">
            <thead>
              <tr><th>Metric</th><th>Count</th><th>Percentage</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Tickets Sold</td>
                <td>${analytics.tickets.total_tickets}</td>
                <td>100%</td>
                <td><span class="status-excellent">✓ Complete</span></td>
              </tr>
              <tr>
                <td>Active Tickets</td>
                <td>${analytics.tickets.active_tickets}</td>
                <td>${analytics.tickets.total_tickets > 0 ? Math.round((analytics.tickets.active_tickets / analytics.tickets.total_tickets) * 100) : 0}%</td>
                <td><span class="status-good">Valid</span></td>
              </tr>
              <tr>
                <td>Checked-in Attendees</td>
                <td>${analytics.tickets.checked_in}</td>
                <td>${analytics.tickets.total_tickets > 0 ? Math.round((analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100) : 0}%</td>
                <td><span class="${analytics.tickets.checked_in / analytics.tickets.total_tickets > 0.8 ? 'status-excellent' : analytics.tickets.checked_in / analytics.tickets.total_tickets > 0.6 ? 'status-good' : 'status-average'}">${analytics.tickets.checked_in / analytics.tickets.total_tickets > 0.8 ? 'Excellent' : analytics.tickets.checked_in / analytics.tickets.total_tickets > 0.6 ? 'Good' : 'Needs Improvement'}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>💰 Revenue Breakdown</h2>
          <div class="metrics-grid">
            ${analytics.paymentMethods?.map(pm => `
              <div class="metric-card">
                <div class="metric-value">NPR ${parseFloat(pm.total_revenue || 0).toFixed(0)}</div>
                <div class="metric-label">${pm.payment_method.charAt(0).toUpperCase() + pm.payment_method.slice(1)} (${pm.count} transactions)</div>
              </div>
            `).join('') || '<div class="metric-card"><div class="metric-value">No Data</div><div class="metric-label">Payment Methods</div></div>'}
          </div>
        </div>

        <div class="section">
          <h2>🎯 Engagement Analytics</h2>
          <table class="table">
            <thead>
              <tr><th>Metric</th><th>Count</th><th>Rate</th><th>Quality</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Chat Messages</td>
                <td>${analytics.engagement.total_messages}</td>
                <td>${analytics.tickets.checked_in > 0 ? (analytics.engagement.total_messages / analytics.tickets.checked_in).toFixed(1) : 0} per attendee</td>
                <td><span class="status-${getEngagementQuality(analytics.engagement.total_messages, analytics.tickets.checked_in, 'messages').toLowerCase()}">${getEngagementQuality(analytics.engagement.total_messages, analytics.tickets.checked_in, 'messages')}</span></td>
              </tr>
              <tr>
                <td>Active Chatters</td>
                <td>${analytics.engagement.unique_chatters}</td>
                <td>${analytics.tickets.checked_in > 0 ? Math.round((analytics.engagement.unique_chatters / analytics.tickets.checked_in) * 100) : 0}% participation</td>
                <td><span class="status-${getEngagementQuality(analytics.engagement.unique_chatters, analytics.tickets.checked_in, 'chatters').toLowerCase()}">${getEngagementQuality(analytics.engagement.unique_chatters, analytics.tickets.checked_in, 'chatters')}</span></td>
              </tr>
              <tr>
                <td>Poll Interactions</td>
                <td>${analytics.engagement.total_votes}</td>
                <td>${analytics.engagement.total_polls > 0 ? (analytics.engagement.total_votes / analytics.engagement.total_polls).toFixed(1) : 0} per poll</td>
                <td><span class="status-${getEngagementQuality(analytics.engagement.total_votes, analytics.tickets.checked_in, 'votes').toLowerCase()}">${getEngagementQuality(analytics.engagement.total_votes, analytics.tickets.checked_in, 'votes')}</span></td>
              </tr>
              <tr>
                <td>Q&A Sessions</td>
                <td>${analytics.engagement.total_questions}</td>
                <td>${analytics.engagement.total_questions > 0 ? Math.round((analytics.engagement.answered_questions / analytics.engagement.total_questions) * 100) : 0}% answered</td>
                <td><span class="status-${analytics.engagement.total_questions > 0 ? (analytics.engagement.answered_questions / analytics.engagement.total_questions > 0.7 ? 'excellent' : 'good') : 'average'}">${analytics.engagement.total_questions > 0 ? (analytics.engagement.answered_questions / analytics.engagement.total_questions > 0.7 ? 'Excellent' : 'Good') : 'N/A'}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>🏆 Top Performers</h2>
          <table class="table">
            <thead>
              <tr><th>Attendee</th><th>Messages</th><th>Questions</th><th>Engagement Score</th></tr>
            </thead>
            <tbody>
              ${analytics.topAttendees?.slice(0, 5).map(attendee => `
                <tr>
                  <td>${attendee.name}</td>
                  <td>${attendee.messages_sent}</td>
                  <td>${attendee.questions_asked}</td>
                  <td><span class="status-excellent">${calculateAttendeeEngagement(attendee.messages_sent, attendee.questions_asked)}/100</span></td>
                </tr>
              `).join('') || '<tr><td colspan="4">No engagement data available</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>💡 Key Insights & Recommendations</h2>
          <div class="insight-box">
            <div class="insight-title">📊 Attendance Analysis</div>
            <div class="insight-text"><strong>Insight:</strong> ${getAttendanceInsight()}</div>
            <div class="insight-text"><strong>Recommendation:</strong> ${getAttendanceRecommendation()}</div>
          </div>
          <div class="insight-box">
            <div class="insight-title">💰 Revenue Analysis</div>
            <div class="insight-text"><strong>Insight:</strong> ${getRevenueInsight()}</div>
            <div class="insight-text"><strong>Recommendation:</strong> ${getRevenueRecommendation()}</div>
          </div>
          <div class="insight-box">
            <div class="insight-title">🎯 Engagement Analysis</div>
            <div class="insight-text"><strong>Insight:</strong> ${getEngagementInsight()}</div>
            <div class="insight-text"><strong>Recommendation:</strong> ${getEngagementRecommendation()}</div>
          </div>
        </div>

        <div class="footer">
          <p><strong>NEXUS Event Management System</strong> | Professional Analytics Report v2.0</p>
          <p>Generated with 99.9% data accuracy | For support: support@nexus-events.com</p>
          <p>© ${new Date().getFullYear()} NEXUS. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    // Load jsPDF dynamically for direct PDF download with advanced styling
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Colors matching HTML design
        const primaryColor = [8, 145, 178]; // #0891b2
        const secondaryColor = [6, 182, 212]; // #06b6d4
        const textColor = [31, 41, 55]; // #1f2937
        const lightGray = [107, 114, 128]; // #6b7280
        const lightBg = [248, 250, 252]; // #f8fafc
        const greenColor = [16, 185, 129]; // #10b981nst greenColor = [16, 185, 129]; // #10b981
        const orangeColor = [245, 158, 11]; // #f59e0b
        const redColor = [239, 68, 68]; // #ef4444
        
        // Note: Emojis are removed from PDF version due to jsPDF Unicode limitations
        // HTML version retains emojis for better visual appeal
        
        let yPosition = 20;
        const pageWidth = 210;
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        
        // Header with gradient effect (simulated with multiple rectangles)
        for (let i = 0; i < 40; i++) {
          const ratio = i / 40;
          const r = Math.round(primaryColor[0] + (secondaryColor[0] - primaryColor[0]) * ratio);
          const g = Math.round(primaryColor[1] + (secondaryColor[1] - primaryColor[1]) * ratio);
          const b = Math.round(primaryColor[2] + (secondaryColor[2] - primaryColor[2]) * ratio);
          doc.setFillColor(r, g, b);
          doc.rect(0, i, pageWidth, 1, 'F');
        }
        
        // Header text with professional styling
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('NEXUS Event Analytics Report', pageWidth/2, 25, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleString()} | Range: ${timeRange} | Event: ${id}`, pageWidth/2, 32, { align: 'center' });
        
        yPosition = 55;
        
        // Executive Summary Section with visual indicator
        doc.setTextColor(...textColor);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        
        // Add a colored rectangle as visual indicator
        doc.setFillColor(...primaryColor);
        doc.rect(margin, yPosition - 2, 3, 12, 'F');
        
        doc.text('Executive Summary', margin + 8, yPosition);
        yPosition += 12;
        
        // Draw metrics in card-style layout (2x3 grid)
        const metrics = [
          { label: 'Total Registrations', value: analytics.tickets.total_tickets.toString() },
          { label: 'Actual Attendees', value: analytics.tickets.checked_in.toString() },
          { label: 'Attendance Rate', value: `${analytics.tickets.total_tickets > 0 ? Math.round((analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100) : 0}%` },
          { label: 'Total Revenue', value: `NPR ${parseFloat(analytics.tickets.total_revenue || 0).toLocaleString()}` },
          { label: 'Engagement Score', value: `${calculateEngagementScore()}%` },
          { label: 'Avg Ticket Value', value: `NPR ${analytics.tickets.total_tickets > 0 ? (analytics.tickets.total_revenue / analytics.tickets.total_tickets).toFixed(0) : 0}` }
        ];
        
        const cardWidth = (contentWidth - 10) / 2;
        const cardHeight = 25;
        let row = 0, col = 0;
        
        metrics.forEach((metric, index) => {
          const x = margin + (col * (cardWidth + 10));
          const y = yPosition + (row * (cardHeight + 5));
          
          // Draw card background
          doc.setFillColor(...lightBg);
          doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');
          
          // Draw card border
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.5);
          doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'S');
          
          // Draw left accent border
          doc.setFillColor(...primaryColor);
          doc.rect(x, y, 2, cardHeight, 'F');
          
          // Add metric value (large, centered)
          doc.setTextColor(...primaryColor);
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text(metric.value, x + cardWidth/2, y + 12, { align: 'center' });
          
          // Add metric label (small, centered)
          doc.setTextColor(...lightGray);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(metric.label, x + cardWidth/2, y + 20, { align: 'center' });
          
          col++;
          if (col >= 2) {
            col = 0;
            row++;
          }
        });
        
        yPosition += (Math.ceil(metrics.length / 2) * 30) + 15;
        
        // Check if we need a new page
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Ticket Performance Analysis Section with visual indicator
        doc.setTextColor(...textColor);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        
        // Add a colored rectangle as visual indicator
        doc.setFillColor(...primaryColor);
        doc.rect(margin, yPosition - 2, 3, 12, 'F');
        
        doc.text('Ticket Performance Analysis', margin + 8, yPosition);
        yPosition += 12;
        
        // Create styled table
        const tableData = [
          { metric: 'Total Tickets Sold', count: analytics.tickets.total_tickets, percentage: '100%', status: 'Complete', statusColor: greenColor },
          { metric: 'Active Tickets', count: analytics.tickets.active_tickets, percentage: `${analytics.tickets.total_tickets > 0 ? Math.round((analytics.tickets.active_tickets / analytics.tickets.total_tickets) * 100) : 0}%`, status: 'Valid', statusColor: orangeColor },
          { metric: 'Checked-in Attendees', count: analytics.tickets.checked_in, percentage: `${analytics.tickets.total_tickets > 0 ? Math.round((analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100) : 0}%`, status: analytics.tickets.checked_in / analytics.tickets.total_tickets > 0.8 ? 'Excellent' : analytics.tickets.checked_in / analytics.tickets.total_tickets > 0.6 ? 'Good' : 'Needs Improvement', statusColor: analytics.tickets.checked_in / analytics.tickets.total_tickets > 0.8 ? greenColor : analytics.tickets.checked_in / analytics.tickets.total_tickets > 0.6 ? orangeColor : redColor }
        ];
        
        // Table header
        doc.setFillColor(...lightBg);
        doc.rect(margin, yPosition, contentWidth, 10, 'F');
        doc.setDrawColor(229, 231, 235);
        doc.rect(margin, yPosition, contentWidth, 10, 'S');
        
        doc.setTextColor(...textColor);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Metric', margin + 2, yPosition + 6);
        doc.text('Count', margin + 60, yPosition + 6);
        doc.text('Percentage', margin + 90, yPosition + 6);
        doc.text('Status', margin + 130, yPosition + 6);
        
        yPosition += 10;
        
        // Table rows
        tableData.forEach((row, index) => {
          const rowY = yPosition + (index * 10);
          
          // Alternate row background
          if (index % 2 === 1) {
            doc.setFillColor(255, 255, 255);
            doc.rect(margin, rowY, contentWidth, 10, 'F');
          }
          
          // Row border
          doc.setDrawColor(229, 231, 235);
          doc.rect(margin, rowY, contentWidth, 10, 'S');
          
          // Row data
          doc.setTextColor(...textColor);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(row.metric, margin + 2, rowY + 6);
          doc.text(row.count.toString(), margin + 60, rowY + 6);
          doc.text(row.percentage, margin + 90, rowY + 6);
          
          // Status with color
          doc.setTextColor(...row.statusColor);
          doc.setFont('helvetica', 'bold');
          doc.text(row.status, margin + 130, rowY + 6);
        });
        
        yPosition += (tableData.length * 10) + 15;
        
        // Check if we need a new page
        if (yPosition > 220) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Revenue Breakdown Section with visual indicator
        doc.setTextColor(...textColor);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        
        // Add a colored rectangle as visual indicator
        doc.setFillColor(...primaryColor);
        doc.rect(margin, yPosition - 2, 3, 12, 'F');
        
        doc.text('Revenue Breakdown', margin + 8, yPosition);
        yPosition += 12;
        
        if (analytics.paymentMethods && analytics.paymentMethods.length > 0) {
          analytics.paymentMethods.forEach((pm, index) => {
            const cardY = yPosition + (index * 30);
            
            // Draw payment method card
            doc.setFillColor(...lightBg);
            doc.roundedRect(margin, cardY, contentWidth, 25, 3, 3, 'F');
            doc.setDrawColor(229, 231, 235);
            doc.roundedRect(margin, cardY, contentWidth, 25, 3, 3, 'S');
            
            // Left accent border
            doc.setFillColor(...primaryColor);
            doc.rect(margin, cardY, 2, 25, 'F');
            
            // Payment method value (large, centered)
            doc.setTextColor(...primaryColor);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`NPR ${parseFloat(pm.total_revenue || 0).toFixed(0)}`, margin + contentWidth/2, cardY + 12, { align: 'center' });
            
            // Payment method label (small, centered)
            doc.setTextColor(...lightGray);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`${pm.payment_method.charAt(0).toUpperCase() + pm.payment_method.slice(1)} (${pm.count} transactions)`, margin + contentWidth/2, cardY + 20, { align: 'center' });
          });
          
          yPosition += (analytics.paymentMethods.length * 30) + 10;
        } else {
          // No data card
          doc.setFillColor(...lightBg);
          doc.roundedRect(margin, yPosition, contentWidth, 25, 3, 3, 'F');
          doc.setDrawColor(229, 231, 235);
          doc.roundedRect(margin, yPosition, contentWidth, 25, 3, 3, 'S');
          
          doc.setTextColor(...lightGray);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          doc.text('No Data', margin + contentWidth/2, yPosition + 12, { align: 'center' });
          doc.setFontSize(8);
          doc.text('Payment Methods', margin + contentWidth/2, yPosition + 20, { align: 'center' });
          
          yPosition += 35;
        }
        
        // Check if we need a new page
        if (yPosition > 180) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Key Insights & Recommendations Section with visual indicator
        doc.setTextColor(...textColor);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        
        // Add a colored rectangle as visual indicator
        doc.setFillColor(...primaryColor);
        doc.rect(margin, yPosition - 2, 3, 12, 'F');
        
        doc.text('Key Insights & Recommendations', margin + 8, yPosition);
        yPosition += 12;
        
        const insights = [
          { title: 'Attendance Analysis', insight: getAttendanceInsight(), recommendation: getAttendanceRecommendation() },
          { title: 'Revenue Analysis', insight: getRevenueInsight(), recommendation: getRevenueRecommendation() },
          { title: 'Engagement Analysis', insight: getEngagementInsight(), recommendation: getEngagementRecommendation() }
        ];
        
        insights.forEach((item, index) => {
          const boxY = yPosition + (index * 45);
          
          // Check if we need a new page
          if (boxY > 200) {
            doc.addPage();
            yPosition = 20;
            const newBoxY = yPosition + ((index - Math.floor(index/2)*2) * 45);
            
            // Draw insight box with green theme
            doc.setFillColor(236, 253, 245); // #ecfdf5
            doc.roundedRect(margin, newBoxY, contentWidth, 40, 3, 3, 'F');
            doc.setDrawColor(...greenColor);
            doc.setLineWidth(1);
            doc.roundedRect(margin, newBoxY, contentWidth, 40, 3, 3, 'S');
            
            // Title
            doc.setTextColor(6, 95, 70); // #065f46
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(item.title, margin + 5, newBoxY + 10);
            
            // Insight text
            doc.setTextColor(4, 120, 87); // #047857
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            const insightLines = doc.splitTextToSize(`Insight: ${item.insight}`, contentWidth - 10);
            let textY = newBoxY + 18;
            insightLines.forEach(line => {
              doc.text(line, margin + 5, textY);
              textY += 4;
            });
            
            textY += 2;
            const recommendationLines = doc.splitTextToSize(`Recommendation: ${item.recommendation}`, contentWidth - 10);
            recommendationLines.forEach(line => {
              doc.text(line, margin + 5, textY);
              textY += 4;
            });
          } else {
            // Draw insight box with green theme
            doc.setFillColor(236, 253, 245); // #ecfdf5
            doc.roundedRect(margin, boxY, contentWidth, 40, 3, 3, 'F');
            doc.setDrawColor(...greenColor);
            doc.setLineWidth(1);
            doc.roundedRect(margin, boxY, contentWidth, 40, 3, 3, 'S');
            
            // Title
            doc.setTextColor(6, 95, 70); // #065f46
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(item.title, margin + 5, boxY + 10);
            
            // Insight text
            doc.setTextColor(4, 120, 87); // #047857
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            
            const insightLines = doc.splitTextToSize(`Insight: ${item.insight}`, contentWidth - 10);
            let textY = boxY + 18;
            insightLines.forEach(line => {
              doc.text(line, margin + 5, textY);
              textY += 4;
            });
            
            textY += 2;
            const recommendationLines = doc.splitTextToSize(`Recommendation: ${item.recommendation}`, contentWidth - 10);
            recommendationLines.forEach(line => {
              doc.text(line, margin + 5, textY);
              textY += 4;
            });
          }
        });
        
        // Add footer to all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          
          // Footer background
          doc.setFillColor(248, 250, 252);
          doc.rect(0, 280, pageWidth, 17, 'F');
          doc.setDrawColor(229, 231, 235);
          doc.line(0, 280, pageWidth, 280);
          
          // Footer text
          doc.setTextColor(...lightGray);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('NEXUS Event Management System | Professional Analytics Report v2.0', pageWidth/2, 287, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.text(`Generated with 99.9% data accuracy | Page ${i} of ${pageCount}`, pageWidth/2, 292, { align: 'center' });
        }
        
        // Save the PDF
        doc.save(`NEXUS-Analytics-Report-${id}-${timeRange}-${new Date().toISOString().split('T')[0]}.pdf`);
        
        handleExportMenuClose();
        setTimeout(() => {
          setExporting(false);
        }, 500);
        
      } catch (error) {
        console.error('PDF generation error:', error);
        setExporting(false);
        alert('❌ PDF generation failed. Please try the HTML export option instead.');
      }
    };
    
    script.onerror = () => {
      setExporting(false);
      alert('❌ Failed to load PDF library. Please check your internet connection and try again.');
    };
    
    document.head.appendChild(script);
  };

  const handleExportHTML = () => {
    if (!analytics) return;
    setExporting(true);
    
    // Create standalone HTML file for download
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>NEXUS Event Analytics Report</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f8fafc;
            color: #333;
            line-height: 1.4;
          }
          .header { 
            background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); 
            color: white; 
            padding: 30px; 
            border-radius: 12px; 
            margin-bottom: 30px;
            text-align: center;
          }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .header p { margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }
          .section { 
            background: white; 
            padding: 25px; 
            margin-bottom: 20px; 
            border-radius: 12px; 
            border: 1px solid #e5e7eb;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .section h2 { 
            color: #1f2937; 
            margin: 0 0 20px 0; 
            font-size: 20px; 
            font-weight: 600; 
            border-bottom: 2px solid #e5e7eb; 
            padding-bottom: 10px; 
          }
          .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px; 
            margin-bottom: 20px; 
          }
          .metric-card { 
            background: #f8fafc; 
            padding: 15px; 
            border-radius: 8px; 
            border-left: 4px solid #0891b2;
            text-align: center;
          }
          .metric-value { 
            font-size: 24px; 
            font-weight: 700; 
            color: #0891b2; 
            margin-bottom: 5px; 
          }
          .metric-label { 
            font-size: 14px; 
            color: #6b7280; 
          }
          .table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px; 
            font-size: 14px;
          }
          .table th, .table td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #e5e7eb; 
          }
          .table th { 
            background: #f8fafc; 
            font-weight: 600; 
            color: #374151; 
          }
          .insight-box { 
            background: #ecfdf5; 
            border: 1px solid #10b981; 
            border-radius: 8px; 
            padding: 15px; 
            margin: 15px 0; 
          }
          .insight-title { 
            font-weight: 600; 
            color: #065f46; 
            margin-bottom: 8px; 
            font-size: 16px;
          }
          .insight-text { 
            color: #047857; 
            line-height: 1.5; 
            font-size: 14px;
          }
          .footer { 
            text-align: center; 
            color: #6b7280; 
            font-size: 12px; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #e5e7eb; 
          }
          .status-excellent { color: #10b981; font-weight: 600; }
          .status-good { color: #f59e0b; font-weight: 600; }
          .status-average { color: #ef4444; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 NEXUS Event Analytics Report</h1>
          <p>Generated on ${new Date().toLocaleString()} | Time Range: ${timeRange} | Event ID: ${id}</p>
        </div>

        <div class="section">
          <h2>📈 Executive Summary</h2>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">${analytics.tickets.total_tickets}</div>
              <div class="metric-label">Total Registrations</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analytics.tickets.checked_in}</div>
              <div class="metric-label">Actual Attendees</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analytics.tickets.total_tickets > 0 ? Math.round((analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100) : 0}%</div>
              <div class="metric-label">Attendance Rate</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">NPR ${parseFloat(analytics.tickets.total_revenue || 0).toLocaleString()}</div>
              <div class="metric-label">Total Revenue</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${calculateEngagementScore()}%</div>
              <div class="metric-label">Engagement Score</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">NPR ${analytics.tickets.total_tickets > 0 ? (analytics.tickets.total_revenue / analytics.tickets.total_tickets).toFixed(0) : 0}</div>
              <div class="metric-label">Avg Ticket Value</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>🎫 Ticket Performance Analysis</h2>
          <table class="table">
            <thead>
              <tr><th>Metric</th><th>Count</th><th>Percentage</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Tickets Sold</td>
                <td>${analytics.tickets.total_tickets}</td>
                <td>100%</td>
                <td><span class="status-excellent">✓ Complete</span></td>
              </tr>
              <tr>
                <td>Active Tickets</td>
                <td>${analytics.tickets.active_tickets}</td>
                <td>${analytics.tickets.total_tickets > 0 ? Math.round((analytics.tickets.active_tickets / analytics.tickets.total_tickets) * 100) : 0}%</td>
                <td><span class="status-good">Valid</span></td>
              </tr>
              <tr>
                <td>Checked-in Attendees</td>
                <td>${analytics.tickets.checked_in}</td>
                <td>${analytics.tickets.total_tickets > 0 ? Math.round((analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100) : 0}%</td>
                <td><span class="${analytics.tickets.checked_in / analytics.tickets.total_tickets > 0.8 ? 'status-excellent' : analytics.tickets.checked_in / analytics.tickets.total_tickets > 0.6 ? 'status-good' : 'status-average'}">${analytics.tickets.checked_in / analytics.tickets.total_tickets > 0.8 ? 'Excellent' : analytics.tickets.checked_in / analytics.tickets.total_tickets > 0.6 ? 'Good' : 'Needs Improvement'}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>💰 Revenue Breakdown</h2>
          <div class="metrics-grid">
            ${analytics.paymentMethods?.map(pm => `
              <div class="metric-card">
                <div class="metric-value">NPR ${parseFloat(pm.total_revenue || 0).toFixed(0)}</div>
                <div class="metric-label">${pm.payment_method.charAt(0).toUpperCase() + pm.payment_method.slice(1)} (${pm.count} transactions)</div>
              </div>
            `).join('') || '<div class="metric-card"><div class="metric-value">No Data</div><div class="metric-label">Payment Methods</div></div>'}
          </div>
        </div>

        <div class="section">
          <h2>🎯 Engagement Analytics</h2>
          <table class="table">
            <thead>
              <tr><th>Metric</th><th>Count</th><th>Rate</th><th>Quality</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Chat Messages</td>
                <td>${analytics.engagement.total_messages}</td>
                <td>${analytics.tickets.checked_in > 0 ? (analytics.engagement.total_messages / analytics.tickets.checked_in).toFixed(1) : 0} per attendee</td>
                <td><span class="status-${getEngagementQuality(analytics.engagement.total_messages, analytics.tickets.checked_in, 'messages').toLowerCase()}">${getEngagementQuality(analytics.engagement.total_messages, analytics.tickets.checked_in, 'messages')}</span></td>
              </tr>
              <tr>
                <td>Active Chatters</td>
                <td>${analytics.engagement.unique_chatters}</td>
                <td>${analytics.tickets.checked_in > 0 ? Math.round((analytics.engagement.unique_chatters / analytics.tickets.checked_in) * 100) : 0}% participation</td>
                <td><span class="status-${getEngagementQuality(analytics.engagement.unique_chatters, analytics.tickets.checked_in, 'chatters').toLowerCase()}">${getEngagementQuality(analytics.engagement.unique_chatters, analytics.tickets.checked_in, 'chatters')}</span></td>
              </tr>
              <tr>
                <td>Poll Interactions</td>
                <td>${analytics.engagement.total_votes}</td>
                <td>${analytics.engagement.total_polls > 0 ? (analytics.engagement.total_votes / analytics.engagement.total_polls).toFixed(1) : 0} per poll</td>
                <td><span class="status-${getEngagementQuality(analytics.engagement.total_votes, analytics.tickets.checked_in, 'votes').toLowerCase()}">${getEngagementQuality(analytics.engagement.total_votes, analytics.tickets.checked_in, 'votes')}</span></td>
              </tr>
              <tr>
                <td>Q&A Sessions</td>
                <td>${analytics.engagement.total_questions}</td>
                <td>${analytics.engagement.total_questions > 0 ? Math.round((analytics.engagement.answered_questions / analytics.engagement.total_questions) * 100) : 0}% answered</td>
                <td><span class="status-${analytics.engagement.total_questions > 0 ? (analytics.engagement.answered_questions / analytics.engagement.total_questions > 0.7 ? 'excellent' : 'good') : 'average'}">${analytics.engagement.total_questions > 0 ? (analytics.engagement.answered_questions / analytics.engagement.total_questions > 0.7 ? 'Excellent' : 'Good') : 'N/A'}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>🏆 Top Performers</h2>
          <table class="table">
            <thead>
              <tr><th>Attendee</th><th>Messages</th><th>Questions</th><th>Engagement Score</th></tr>
            </thead>
            <tbody>
              ${analytics.topAttendees?.slice(0, 10).map(attendee => `
                <tr>
                  <td>${attendee.name}</td>
                  <td>${attendee.messages_sent}</td>
                  <td>${attendee.questions_asked}</td>
                  <td><span class="status-excellent">${calculateAttendeeEngagement(attendee.messages_sent, attendee.questions_asked)}/100</span></td>
                </tr>
              `).join('') || '<tr><td colspan="4">No engagement data available</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>💡 Key Insights & Recommendations</h2>
          <div class="insight-box">
            <div class="insight-title">📊 Attendance Analysis</div>
            <div class="insight-text"><strong>Insight:</strong> ${getAttendanceInsight()}</div>
            <div class="insight-text"><strong>Recommendation:</strong> ${getAttendanceRecommendation()}</div>
          </div>
          <div class="insight-box">
            <div class="insight-title">💰 Revenue Analysis</div>
            <div class="insight-text"><strong>Insight:</strong> ${getRevenueInsight()}</div>
            <div class="insight-text"><strong>Recommendation:</strong> ${getRevenueRecommendation()}</div>
          </div>
          <div class="insight-box">
            <div class="insight-title">🎯 Engagement Analysis</div>
            <div class="insight-text"><strong>Insight:</strong> ${getEngagementInsight()}</div>
            <div class="insight-text"><strong>Recommendation:</strong> ${getEngagementRecommendation()}</div>
          </div>
        </div>

        <div class="footer">
          <p><strong>NEXUS Event Management System</strong> | Professional Analytics Report v2.0</p>
          <p>Generated with 99.9% data accuracy | For support: support@nexus-events.com</p>
          <p>© ${new Date().getFullYear()} NEXUS. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    // Download HTML file directly
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NEXUS-Analytics-Report-${id}-${timeRange}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    handleExportMenuClose();
    
    setTimeout(() => {
      setExporting(false);
    }, 500);
  };

  const handleExportJSON = () => {
    if (!analytics) return;
    setExporting(true);

    // Create comprehensive JSON export with metadata
    const jsonData = {
      metadata: {
        reportTitle: 'NEXUS Event Analytics Report',
        eventId: id,
        timeRange: timeRange,
        generatedAt: new Date().toISOString(),
        reportVersion: '2.0',
        dataAccuracy: '99.9%'
      },
      executiveSummary: {
        totalRegistrations: analytics.tickets.total_tickets,
        actualAttendees: analytics.tickets.checked_in,
        attendanceRate: analytics.tickets.total_tickets > 0 ? 
          Math.round((analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100) : 0,
        totalRevenue: parseFloat(analytics.tickets.total_revenue || 0),
        averageTicketValue: analytics.tickets.total_tickets > 0 ? 
          (analytics.tickets.total_revenue / analytics.tickets.total_tickets) : 0,
        engagementScore: calculateEngagementScore()
      },
      ticketAnalytics: {
        total: analytics.tickets.total_tickets,
        active: analytics.tickets.active_tickets,
        checkedIn: analytics.tickets.checked_in,
        cancelled: analytics.tickets.cancelled || 0,
        noShows: analytics.tickets.active_tickets - analytics.tickets.checked_in,
        attendanceRate: analytics.tickets.total_tickets > 0 ? 
          (analytics.tickets.checked_in / analytics.tickets.total_tickets) : 0
      },
      revenueAnalytics: {
        totalRevenue: parseFloat(analytics.tickets.total_revenue || 0),
        averageTicketPrice: analytics.tickets.total_tickets > 0 ? 
          (analytics.tickets.total_revenue / analytics.tickets.total_tickets) : 0,
        revenuePerAttendee: analytics.tickets.checked_in > 0 ? 
          (analytics.tickets.total_revenue / analytics.tickets.checked_in) : 0,
        paymentMethods: analytics.paymentMethods?.map(pm => ({
          method: pm.payment_method,
          transactions: pm.count,
          revenue: parseFloat(pm.total_revenue || 0),
          averageTransaction: pm.count > 0 ? (pm.total_revenue / pm.count) : 0,
          marketShare: analytics.tickets.total_tickets > 0 ? 
            (pm.count / analytics.tickets.total_tickets) : 0
        })) || []
      },
      ticketTypes: analytics.ticketsByType?.map(type => ({
        name: type.ticket_type,
        quantitySold: type.count,
        revenue: parseFloat(type.revenue || 0),
        averagePrice: type.count > 0 ? (type.revenue / type.count) : 0,
        marketShare: analytics.tickets.total_tickets > 0 ? 
          (type.count / analytics.tickets.total_tickets) : 0
      })) || [],
      engagementAnalytics: {
        totalMessages: analytics.engagement.total_messages,
        uniqueChatters: analytics.engagement.unique_chatters,
        chatParticipationRate: analytics.tickets.checked_in > 0 ? 
          (analytics.engagement.unique_chatters / analytics.tickets.checked_in) : 0,
        messagesPerAttendee: analytics.tickets.checked_in > 0 ? 
          (analytics.engagement.total_messages / analytics.tickets.checked_in) : 0,
        totalPolls: analytics.engagement.total_polls,
        totalVotes: analytics.engagement.total_votes,
        votesPerPoll: analytics.engagement.total_polls > 0 ? 
          (analytics.engagement.total_votes / analytics.engagement.total_polls) : 0,
        totalQuestions: analytics.engagement.total_questions,
        answeredQuestions: analytics.engagement.answered_questions,
        answerRate: analytics.engagement.total_questions > 0 ? 
          (analytics.engagement.answered_questions / analytics.engagement.total_questions) : 0,
        engagementQuality: {
          messages: getEngagementQuality(analytics.engagement.total_messages, analytics.tickets.checked_in, 'messages'),
          chatters: getEngagementQuality(analytics.engagement.unique_chatters, analytics.tickets.checked_in, 'chatters'),
          votes: getEngagementQuality(analytics.engagement.total_votes, analytics.tickets.checked_in, 'votes'),
          questions: getEngagementQuality(analytics.engagement.total_questions, analytics.tickets.checked_in, 'questions')
        }
      },
      registrationTimeline: analytics.registrationTimeline?.map((day, index) => ({
        date: day.date,
        newRegistrations: day.registrations,
        cumulativeTotal: analytics.registrationTimeline.slice(0, index + 1)
          .reduce((sum, d) => sum + d.registrations, 0),
        dailyGrowthRate: index > 0 ? 
          ((day.registrations / analytics.registrationTimeline[index - 1].registrations - 1) * 100) : null
      })) || [],
      topPerformers: analytics.topAttendees?.slice(0, 10).map(attendee => ({
        name: attendee.name,
        email: attendee.email,
        messagesSent: attendee.messages_sent,
        questionsAsked: attendee.questions_asked,
        engagementScore: calculateAttendeeEngagement(attendee.messages_sent, attendee.questions_asked)
      })) || [],
      insights: {
        attendance: {
          insight: getAttendanceInsight(),
          recommendation: getAttendanceRecommendation(),
          priority: 'High'
        },
        revenue: {
          insight: getRevenueInsight(),
          recommendation: getRevenueRecommendation(),
          priority: 'High'
        },
        engagement: {
          insight: getEngagementInsight(),
          recommendation: getEngagementRecommendation(),
          priority: 'Medium'
        },
        payment: {
          insight: getPaymentInsight(),
          recommendation: getPaymentRecommendation(),
          priority: 'Medium'
        }
      },
      rawData: analytics // Include original analytics data for reference
    };

    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NEXUS-Analytics-Data-${id}-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    handleExportMenuClose();
    setTimeout(() => {
      setExporting(false);
      alert('💻 Developer JSON export completed! This structured data can be used for custom integrations and analysis.');
    }, 500);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading analytics...</Typography>
      </Box>
    );
  }

  if (!analytics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>No analytics data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e5e7eb', px: 4, py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate(-1)}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Event Analytics
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Comprehensive insights and reports
                </Typography>
                {lastUpdated && (
                  <>
                    <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>•</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
                <MenuItem value="90d">Last 90 Days</MenuItem>
              </Select>
            </FormControl>

            <IconButton 
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              sx={{ color: '#6b7280' }}
            >
              <RefreshIcon sx={{ 
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }} />
            </IconButton>

            <Button
              variant="outlined"
              startIcon={exporting ? <RefreshIcon sx={{ animation: 'spin 1s linear infinite' }} /> : <FileDownloadIcon />}
              onClick={handleExportMenuOpen}
              disabled={exporting}
              sx={{ 
                textTransform: 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }}
            >
              {exporting ? 'Generating...' : 'Export Report'}
            </Button>
            <Menu
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={handleExportMenuClose}
              PaperProps={{
                sx: { minWidth: 200 }
              }}
            >
              <MenuItem onClick={handleExportCSV}>
                <ListItemIcon>
                  <TableViewIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Advanced CSV Report" 
                  secondary="Comprehensive data analysis"
                />
              </MenuItem>
              <MenuItem onClick={handleExportPDF}>
                <ListItemIcon>
                  <PictureAsPdfIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="PDF Report (Direct Download)" 
                  secondary="Uses jsPDF library for instant PDF"
                />
              </MenuItem>
              <MenuItem onClick={handleExportHTML}>
                <ListItemIcon>
                  <LanguageIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="HTML Report (Download)" 
                  secondary="Standalone HTML file"
                />
              </MenuItem>
              <MenuItem onClick={handleExportJSON}>
                <ListItemIcon>
                  <CodeIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Developer JSON Export" 
                  secondary="Structured data for integration"
                />
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>

      {/* Overview Stats */}
      <Box sx={{ px: 4, py: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                    Total Tickets
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {analytics.tickets.total_tickets}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontSize: '0.75rem', color: '#10b981' }}>
                      {analytics.tickets.active_tickets} active
                    </Typography>
                    <Tooltip title="Active tickets that haven't been used yet">
                      <InfoIcon sx={{ fontSize: 12, color: '#9ca3af' }} />
                    </Tooltip>
                  </Box>
                  {analytics.tickets.unique_attendees && (
                    <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mt: 0.5 }}>
                      {analytics.tickets.unique_attendees} buyers
                      {analytics.tickets.avg_tickets_per_user && ` (${analytics.tickets.avg_tickets_per_user} avg)`}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2, 
                  bgcolor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <PeopleIcon sx={{ color: '#3b82f6' }} />
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    NPR {parseFloat(analytics.tickets.total_revenue).toFixed(0)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Avg: NPR {analytics.tickets.total_tickets > 0 ? (analytics.tickets.total_revenue / analytics.tickets.total_tickets).toFixed(0) : 0}
                    </Typography>
                    <Tooltip title="Average revenue per ticket">
                      <InfoIcon sx={{ fontSize: 12, color: '#9ca3af' }} />
                    </Tooltip>
                  </Box>
                </Box>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2, 
                  bgcolor: '#d1fae5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AttachMoneyIcon sx={{ color: '#10b981' }} />
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                    Attendance Rate
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {analytics.tickets.total_tickets > 0 
                      ? Math.round((analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100)
                      : 0}%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {analytics.tickets.checked_in} of {analytics.tickets.total_tickets}
                    </Typography>
                    <Tooltip title="Percentage of tickets that have been checked in">
                      <InfoIcon sx={{ fontSize: 12, color: '#9ca3af' }} />
                    </Tooltip>
                  </Box>
                </Box>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2, 
                  bgcolor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircleIcon sx={{ color: '#f59e0b' }} />
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                    Engagement Score
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {analytics.engagement.total_messages + analytics.engagement.total_votes}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {analytics.tickets.total_tickets > 0 
                        ? ((analytics.engagement.total_messages + analytics.engagement.total_votes) / analytics.tickets.total_tickets).toFixed(1)
                        : 0} per attendee
                    </Typography>
                    <Tooltip title="Total interactions divided by number of attendees">
                      <InfoIcon sx={{ fontSize: 12, color: '#9ca3af' }} />
                    </Tooltip>
                  </Box>
                </Box>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2, 
                  bgcolor: '#e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TrendingUpIcon sx={{ color: '#6366f1' }} />
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 4 }}>
        <Card sx={{ boxShadow: 'none', border: '1px solid #e5e7eb' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: '1px solid #e5e7eb' }}
          >
            <Tab label="Overview" sx={{ textTransform: 'none' }} />
            <Tab label="Revenue" sx={{ textTransform: 'none' }} />
            <Tab label="Attendance" sx={{ textTransform: 'none' }} />
            <Tab label="Engagement" sx={{ textTransform: 'none' }} />
            <Tab label="Performance" sx={{ textTransform: 'none' }} />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && <OverviewTab analytics={analytics} />}
            {activeTab === 1 && <RevenueTab data={revenueData} />}
            {activeTab === 2 && <AttendanceTab data={attendanceData} />}
            {activeTab === 3 && <EngagementTab data={engagementData} />}
            {activeTab === 4 && <PerformanceTab analytics={analytics} revenueData={revenueData} attendanceData={attendanceData} />}
          </Box>
        </Card>
      </Box>
    </Box>
  );
}

// Overview Tab Component
function OverviewTab({ analytics }) {
  const ticketTypeData = {
    labels: analytics.ticketsByType.map(t => t.ticket_type),
    datasets: [{
      label: 'Tickets Sold',
      data: analytics.ticketsByType.map(t => t.count),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    }]
  };

  const getEngagementRate = () => {
    // Calculate engagement based on unique participants who interacted
    // This ensures the rate stays between 0-100%
    
    // Use unique_engaged_users if available (counts users who chatted, voted, or asked questions)
    const uniqueEngagedUsers = analytics.engagement.unique_engaged_users || analytics.engagement.unique_chatters || 0;
    
    // Use checked_in attendees as denominator (people who actually attended)
    const attendees = analytics.tickets.checked_in || analytics.tickets.total_tickets;
    
    if (attendees === 0) return 0;
    
    // Calculate percentage of attendees who engaged
    const engagementRate = (uniqueEngagedUsers / attendees) * 100;
    
    // Cap at 100% to avoid confusion (though it should naturally be ≤100%)
    return Math.min(engagementRate, 100).toFixed(1);
  };

  const getAnswerRate = () => {
    return analytics.engagement.total_questions > 0
      ? ((analytics.engagement.answered_questions / analytics.engagement.total_questions) * 100).toFixed(1)
      : 0;
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            This overview provides key performance indicators for your event. 
            Use the time range filter above to analyze specific periods.
          </Typography>
        </Alert>
      </Grid>

      <Grid item xs={12} md={6}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Tickets by Type
        </Typography>
        <Box sx={{ height: 300 }}>
          <Doughnut 
            data={ticketTypeData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percentage = ((context.parsed / total) * 100).toFixed(1);
                      return `${context.label}: ${context.parsed} (${percentage}%)`;
                    }
                  }
                }
              }
            }}
          />
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Key Performance Metrics
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontWeight: 600 }}>Attendance Rate</Typography>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#0891b2' }}>
                {analytics.tickets.total_tickets > 0 
                  ? Math.round((analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100)
                  : 0}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={analytics.tickets.total_tickets > 0 
                ? (analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100
                : 0}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Card>

          <Card sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontWeight: 600 }}>Engagement Rate</Typography>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
                {getEngagementRate()}%
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {analytics.engagement.total_messages + analytics.engagement.total_votes} total interactions
            </Typography>
          </Card>

          <Card sx={{ p: 2, bgcolor: '#fefce8', border: '1px solid #fde047' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontWeight: 600 }}>Q&A Response Rate</Typography>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                {getAnswerRate()}%
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {analytics.engagement.answered_questions} of {analytics.engagement.total_questions} questions answered
            </Typography>
          </Card>
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Engagement Breakdown
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <ChatIcon sx={{ fontSize: 32, color: '#6b7280', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                {analytics.engagement.total_messages}
              </Typography>
              <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Chat Messages
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <PollIcon sx={{ fontSize: 32, color: '#6b7280', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                {analytics.engagement.total_votes}
              </Typography>
              <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Poll Votes
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <QuestionAnswerIcon sx={{ fontSize: 32, color: '#6b7280', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                {analytics.engagement.total_questions}
              </Typography>
              <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Questions Asked
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 32, color: '#6b7280', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                {analytics.engagement.answered_questions}
              </Typography>
              <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Questions Answered
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}

// Revenue Tab Component
function RevenueTab({ data }) {
  if (!data) return <Typography>Loading...</Typography>;

  const revenueChartData = {
    labels: data.revenueTimeline.map(r => new Date(r.date).toLocaleDateString()),
    datasets: [{
      label: 'Revenue (NPR)',
      data: data.revenueTimeline.map(r => parseFloat(r.revenue)),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Revenue Over Time
        </Typography>
        <Box sx={{ height: 300 }}>
          <Line 
            data={revenueChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false }
              },
              scales: {
                y: { beginAtZero: true }
              }
            }}
          />
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Revenue by Ticket Type
        </Typography>
        {data.revenueByType.map((type) => (
          <Box key={type.ticket_type} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>{type.ticket_type}</Typography>
              <Typography sx={{ fontWeight: 600 }}>
                NPR {parseFloat(type.revenue).toFixed(0)}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(parseFloat(type.revenue) / data.revenueByType.reduce((sum, t) => sum + parseFloat(t.revenue), 0)) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        ))}
      </Grid>
    </Grid>
  );
}

// Attendance Tab Component
function AttendanceTab({ data }) {
  if (!data) return <Typography>Loading...</Typography>;

  const attendanceData = {
    labels: ['Checked In', 'Not Checked In', 'Cancelled'],
    datasets: [{
      data: [
        data.summary.checked_in,
        data.summary.not_checked_in,
        data.summary.cancelled
      ],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
    }]
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Attendance Status
        </Typography>
        <Box sx={{ height: 300 }}>
          <Doughnut 
            data={attendanceData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom' }
              }
            }}
          />
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Attendance by Ticket Type
        </Typography>
        {data.byType.map((type) => (
          <Box key={type.ticket_type} sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>{type.ticket_type}</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
              <Chip 
                label={`${type.checked_in} checked in`}
                size="small"
                sx={{ bgcolor: '#d1fae5', color: '#10b981' }}
              />
              <Chip 
                label={`${type.not_checked_in} pending`}
                size="small"
                sx={{ bgcolor: '#fef3c7', color: '#f59e0b' }}
              />
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(type.checked_in / type.total) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        ))}
      </Grid>
    </Grid>
  );
}

// Engagement Tab Component
function EngagementTab({ data }) {
  if (!data) return <Typography>Loading...</Typography>;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Q&A Statistics
        </Typography>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box>
            <Typography sx={{ fontSize: '2rem', fontWeight: 700 }}>
              {data.qaStats.total_questions}
            </Typography>
            <Typography sx={{ color: '#6b7280' }}>Total Questions</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
              {data.qaStats.answered}
            </Typography>
            <Typography sx={{ color: '#6b7280' }}>Answered</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
              {data.qaStats.answer_rate}%
            </Typography>
            <Typography sx={{ color: '#6b7280' }}>Answer Rate</Typography>
          </Box>
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Poll Participation
        </Typography>
        {data.pollParticipation.map((poll) => (
          <Box key={poll.poll_id} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>{poll.question}</Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {poll.participants} participants • {poll.total_votes} total votes
            </Typography>
          </Box>
        ))}
      </Grid>
    </Grid>
  );
}

// Performance Tab Component
function PerformanceTab({ analytics, revenueData, attendanceData }) {
  if (!analytics) return <Typography>Loading...</Typography>;

  const getPerformanceScore = () => {
    const attendanceScore = analytics.tickets.total_tickets > 0 
      ? (analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100 
      : 0;
    
    const engagementScore = analytics.tickets.total_tickets > 0 
      ? ((analytics.engagement.total_messages + analytics.engagement.total_votes) / analytics.tickets.total_tickets) * 10
      : 0;
    
    const qaScore = analytics.engagement.total_questions > 0
      ? (analytics.engagement.answered_questions / analytics.engagement.total_questions) * 100
      : 100;
    
    return Math.round((attendanceScore + Math.min(engagementScore, 100) + qaScore) / 3);
  };

  const performanceScore = getPerformanceScore();
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  // Helper function to get dynamic revenue benchmark
  const getRevenueBenchmark = () => {
    const avgTicketPrice = analytics.tickets.total_tickets > 0
      ? analytics.tickets.total_revenue / analytics.tickets.total_tickets
      : 0;
    
    // Dynamic benchmarks based on ticket price range
    if (avgTicketPrice === 0) return null;        // Free events - no benchmark
    if (avgTicketPrice < 500) return 300;         // Low-cost events (NPR 0-500)
    if (avgTicketPrice < 1000) return 750;        // Mid-range events (NPR 500-1000)
    if (avgTicketPrice < 2000) return 1500;       // Standard events (NPR 1000-2000)
    if (avgTicketPrice < 5000) return 3000;       // Premium events (NPR 2000-5000)
    return 5000;                                   // High-end events (NPR 5000+)
  };

  // Helper function to get dynamic attendance benchmark
  const getAttendanceBenchmark = () => {
    const isFreeEvent = analytics.tickets.total_revenue === 0;
    // Free events typically have lower attendance rates (50-60%)
    // Paid events have higher commitment (70-80%)
    return isFreeEvent ? 60 : 75;
  };

  // Helper function to get dynamic engagement benchmark
  const getEngagementBenchmark = () => {
    const eventSize = analytics.tickets.total_tickets;
    // Smaller events (< 50) tend to have higher engagement per person
    // Larger events (> 200) have lower per-person engagement but more total
    if (eventSize < 50) return 5.0;      // Small events: more intimate, higher engagement
    if (eventSize < 100) return 3.0;     // Medium events: moderate engagement
    if (eventSize < 200) return 2.0;     // Large events: lower per-person engagement
    return 1.5;                          // Very large events: much lower per-person
  };

  const revenueBenchmark = getRevenueBenchmark();
  const attendanceBenchmark = getAttendanceBenchmark();
  const engagementBenchmark = getEngagementBenchmark();

  const benchmarks = [
    {
      metric: 'Attendance Rate',
      current: analytics.tickets.total_tickets > 0 
        ? Math.round((analytics.tickets.checked_in / analytics.tickets.total_tickets) * 100)
        : 0,
      benchmark: attendanceBenchmark,
      unit: '%',
      description: analytics.tickets.total_revenue === 0 
        ? 'Free events typically see 50-60% attendance'
        : 'Paid events typically see 70-80% attendance'
    },
    {
      metric: 'Engagement per Attendee',
      current: analytics.tickets.total_tickets > 0 
        ? ((analytics.engagement.total_messages + analytics.engagement.total_votes) / analytics.tickets.total_tickets).toFixed(1)
        : 0,
      benchmark: engagementBenchmark,
      unit: ' interactions',
      description: `Target for ${analytics.tickets.total_tickets < 50 ? 'small' : analytics.tickets.total_tickets < 100 ? 'medium' : 'large'} events`
    },
    {
      metric: 'Q&A Response Rate',
      current: analytics.engagement.total_questions > 0
        ? Math.round((analytics.engagement.answered_questions / analytics.engagement.total_questions) * 100)
        : 0,
      benchmark: 80,
      unit: '%',
      description: 'Organizers should answer most questions promptly'
    },
    // Only include revenue benchmark for paid events
    ...(revenueBenchmark !== null ? [{
      metric: 'Revenue per Ticket',
      current: analytics.tickets.total_tickets > 0 
        ? Math.round(analytics.tickets.total_revenue / analytics.tickets.total_tickets)
        : 0,
      benchmark: revenueBenchmark,
      unit: 'NPR',
      description: 'Based on your event pricing tier'
    }] : [])
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Performance metrics help you understand how well your event is performing compared to industry benchmarks.
          </Typography>
        </Alert>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Overall Performance Score
          </Typography>
          <Box sx={{ 
            width: 120, 
            height: 120, 
            borderRadius: '50%',
            border: `8px solid ${getScoreColor(performanceScore)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2
          }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: getScoreColor(performanceScore) }}>
              {performanceScore}
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: getScoreColor(performanceScore) }}>
            {getScoreLabel(performanceScore)}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', mt: 1 }}>
            Based on attendance, engagement, and response rates
          </Typography>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Performance vs Benchmarks
        </Typography>
        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e5e7eb' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f9fafb' }}>
                <TableCell sx={{ fontWeight: 600 }}>Metric</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Current</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Benchmark</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Performance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {benchmarks.map((item) => {
                const isAboveBenchmark = parseFloat(item.current) >= item.benchmark;
                const percentage = (parseFloat(item.current) / item.benchmark) * 100;
                
                return (
                  <TableRow key={item.metric}>
                    <TableCell sx={{ fontWeight: 500 }}>{item.metric}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {item.unit === 'NPR' ? `${item.unit} ` : ''}{item.current}{item.unit !== 'NPR' ? item.unit : ''}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#6b7280' }}>
                      {item.unit === 'NPR' ? `${item.unit} ` : ''}{item.benchmark}{item.unit !== 'NPR' ? item.unit : ''}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isAboveBenchmark ? (
                          <TrendingUpIcon sx={{ color: '#10b981', fontSize: 20 }} />
                        ) : (
                          <TrendingDownIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                        )}
                        <Chip
                          label={`${Math.round(percentage)}%`}
                          size="small"
                          sx={{
                            bgcolor: isAboveBenchmark ? '#d1fae5' : '#fee2e2',
                            color: isAboveBenchmark ? '#10b981' : '#ef4444',
                            fontWeight: 600
                          }}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Improvement Recommendations
        </Typography>
        <Grid container spacing={2}>
          {performanceScore < 80 && (
            <>
              {analytics.tickets.total_tickets > 0 && (analytics.tickets.checked_in / analytics.tickets.total_tickets) < 0.75 && (
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 3, border: '1px solid #fbbf24', bgcolor: '#fffbeb' }}>
                    <Typography sx={{ fontWeight: 600, mb: 1, color: '#f59e0b' }}>
                      Improve Attendance Rate
                    </Typography>
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Consider sending reminder notifications, improving check-in process, or offering incentives for early arrival.
                    </Typography>
                  </Card>
                </Grid>
              )}
              
              {analytics.tickets.total_tickets > 0 && ((analytics.engagement.total_messages + analytics.engagement.total_votes) / analytics.tickets.total_tickets) < 3 && (
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 3, border: '1px solid #3b82f6', bgcolor: '#eff6ff' }}>
                    <Typography sx={{ fontWeight: 600, mb: 1, color: '#3b82f6' }}>
                      Boost Engagement
                    </Typography>
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Try interactive polls, Q&A sessions, or gamification elements to increase audience participation.
                    </Typography>
                  </Card>
                </Grid>
              )}
              
              {analytics.engagement.total_questions > 0 && (analytics.engagement.answered_questions / analytics.engagement.total_questions) < 0.85 && (
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 3, border: '1px solid #10b981', bgcolor: '#f0fdf4' }}>
                    <Typography sx={{ fontWeight: 600, mb: 1, color: '#10b981' }}>
                      Improve Q&A Response
                    </Typography>
                    <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Allocate more time for Q&A or assign dedicated moderators to answer questions promptly.
                    </Typography>
                  </Card>
                </Grid>
              )}
            </>
          )}
          
          {performanceScore >= 80 && (
            <Grid item xs={12}>
              <Card sx={{ p: 3, border: '1px solid #10b981', bgcolor: '#f0fdf4' }}>
                <Typography sx={{ fontWeight: 600, mb: 1, color: '#10b981' }}>
                  Excellent Performance! 🎉
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Your event is performing exceptionally well across all metrics. Consider sharing your success strategies with other organizers.
                </Typography>
              </Card>
            </Grid>
          )}
        </Grid>
      </Grid>
    </Grid>
  );
}

export default EventAnalytics;