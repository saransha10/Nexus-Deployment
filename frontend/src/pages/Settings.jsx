import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  Switch,
  Button,
  Avatar,
  Divider,
  IconButton,
  Alert,
  TextField,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailIcon from '@mui/icons-material/Email';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PasswordField, { validatePassword } from '../components/PasswordField';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import ShieldIcon from '@mui/icons-material/Shield';
import api from '../services/api';

function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    company: '',
    job_title: '',
    bio: '',
    website: '',
    linkedin: '',
    twitter: ''
  });
  const [preferences, setPreferences] = useState({
    email_registration: true,
    email_reminder: true,
    email_updates: true,
    email_cancellation: true,
    email_qa_answer: true,
    email_new_poll: true,
    in_app_notifications: true
  });
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Email change state
  const [emailData, setEmailData] = useState({
    newEmail: '',
    password: ''
  });
  
  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setProfileData({
        firstName: parsedUser?.name?.split(' ')[0] || '',
        lastName: parsedUser?.name?.split(' ').slice(1).join(' ') || '',
        phone: parsedUser?.phone || '',
        company: parsedUser?.company || '',
        job_title: parsedUser?.job_title || '',
        bio: parsedUser?.bio || '',
        website: parsedUser?.website || '',
        linkedin: parsedUser?.linkedin || '',
        twitter: parsedUser?.twitter || ''
      });
    }
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/notifications/preferences');
      setPreferences(response.data);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSuccessMessage('');
    try {
      const response = await api.put('/profile', {
        name: `${profileData.firstName} ${profileData.lastName}`.trim(),
        phone: profileData.phone,
        company: profileData.company,
        job_title: profileData.job_title,
        bio: profileData.bio,
        website: profileData.website,
        linkedin: profileData.linkedin,
        twitter: profileData.twitter
      });

      // Update user in localStorage
      const updatedUser = { ...user, ...response.data.user };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setSuccessMessage('Profile saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage('');
    try {
      await api.put('/notifications/preferences', preferences);
      setSuccessMessage('Preferences saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleChangePassword = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setErrorMessage('All password fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    const validation = validatePassword(passwordData.newPassword);
    if (!validation.isValid) {
      setErrorMessage(validation.errors[0]);
      return;
    }

    setSaving(true);
    try {
      await api.put('/profile/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setSuccessMessage('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to change password:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    // Validation
    if (!emailData.newEmail || !emailData.password) {
      setErrorMessage('New email and password are required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.newEmail)) {
      setErrorMessage('Invalid email format');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/profile/change-email', {
        newEmail: emailData.newEmail,
        password: emailData.password
      });

      // Update user in localStorage
      const updatedUser = { ...user, email: emailData.newEmail };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setSuccessMessage('Email changed successfully!');
      setEmailData({ newEmail: '', password: '' });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to change email:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to change email');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    if (user?.auth_provider === 'local' && !deletePassword) {
      setErrorMessage('Password is required to delete your account');
      return;
    }

    setSaving(true);
    try {
      await api.delete('/profile/account', {
        data: { password: deletePassword }
      });

      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      console.error('Failed to delete account:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to delete account');
      setSaving(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size must be less than 5MB');
        return;
      }
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async () => {
    if (!profileImage) return;
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('photo', profileImage); // Changed from 'profile_image' to 'photo'
      
      const response = await api.post('/profile/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update user data with new image
      const updatedUser = { ...user, profile_picture: response.data.user.profile_picture };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setSuccessMessage('Profile image updated successfully!');
      setProfileImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e5e7eb', px: 4, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Box sx={{ 
                width: 24, 
                height: 24, 
                borderRadius: '50%',
                border: '3px solid white',
                borderTopColor: 'transparent',
                transform: 'rotate(-45deg)'
              }} />
            </Box>
            <Typography variant="h6" sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              NEXUS
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: '100%', mx: 'auto', px: 4, py: 4 }}>
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab 
              label="Profile Settings" 
              icon={<PersonIcon />} 
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
            <Tab 
              label="Account Settings" 
              icon={<ShieldIcon />} 
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
          </Tabs>
        </Box>

        {/* Profile Settings Tab */}
        {activeTab === 0 && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Profile Settings
            </Typography>
            <Typography sx={{ color: '#6b7280', mb: 4 }}>
              Manage your personal information and public profile
            </Typography>

            {/* Profile Photo */}
            <Card sx={{ p: 4, mb: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Profile Photo
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Avatar 
                  sx={{ width: 100, height: 100, bgcolor: '#0891b2', fontSize: '2.5rem' }}
                  src={imagePreview || user?.profile_picture}
                >
                  {!imagePreview && !user?.profile_picture && user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography sx={{ color: '#6b7280', mb: 2 }}>
                    Upload a new profile photo. Recommended size: 400x400px, Max 5MB
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      id="profile-image-upload"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="profile-image-upload">
                      <Button 
                        component="span"
                        variant="contained" 
                        sx={{ 
                          bgcolor: '#0891b2', 
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#0e7490' }
                        }}
                      >
                        Choose Photo
                      </Button>
                    </label>
                    {profileImage && (
                      <Button 
                        variant="contained"
                        onClick={handleImageUpload}
                        disabled={saving}
                        sx={{ 
                          bgcolor: '#10b981', 
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#059669' }
                        }}
                      >
                        {saving ? 'Uploading...' : 'Upload'}
                      </Button>
                    )}
                    <Button 
                      variant="outlined" 
                      sx={{ textTransform: 'none', color: '#6b7280', borderColor: '#d1d5db' }}
                      onClick={() => {
                        setProfileImage(null);
                        setImagePreview(null);
                      }}
                    >
                      {profileImage ? 'Cancel' : 'Remove'}
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Card>

            {/* Basic Information */}
            <Card sx={{ p: 4, mb: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Basic Information
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>
                    First Name
                  </Typography>
                  <TextField
                    fullWidth
                    value={profileData.firstName}
                    onChange={(e) => handleProfileChange('firstName', e.target.value)}
                    placeholder="John"
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>
                    Last Name
                  </Typography>
                  <TextField
                    fullWidth
                    value={profileData.lastName}
                    onChange={(e) => handleProfileChange('lastName', e.target.value)}
                    placeholder="Doe"
                    size="small"
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>
                    Email Address
                  </Typography>
                  <TextField
                    fullWidth
                    value={user?.email || ''}
                    placeholder="john.doe@email.com"
                    size="small"
                    disabled
                  />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>
                    Phone Number
                  </Typography>
                  <TextField
                    fullWidth
                    value={profileData.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    size="small"
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>
                    Company
                  </Typography>
                  <TextField
                    fullWidth
                    value={profileData.company}
                    onChange={(e) => handleProfileChange('company', e.target.value)}
                    placeholder="Tech Events Inc."
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>
                    Job Title
                  </Typography>
                  <TextField
                    fullWidth
                    value={profileData.job_title}
                    onChange={(e) => handleProfileChange('job_title', e.target.value)}
                    placeholder="Event Organizer"
                    size="small"
                  />
                </Box>
              </Box>

              <Box>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>
                  Bio
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={profileData.bio}
                  onChange={(e) => handleProfileChange('bio', e.target.value)}
                  placeholder="Passionate event organizer with 5+ years of experience in creating memorable experiences."
                  size="small"
                />
                <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mt: 1 }}>
                  Brief description for your profile. Maximum 500 characters.
                </Typography>
              </Box>
            </Card>

            {/* Social Links */}
            <Card sx={{ p: 4, mb: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Social Links
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>
                    🌐 Website
                  </Typography>
                  <TextField
                    fullWidth
                    value={profileData.website}
                    onChange={(e) => handleProfileChange('website', e.target.value)}
                    placeholder="https://johndoe.com"
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>
                    💼 LinkedIn
                  </Typography>
                  <TextField
                    fullWidth
                    value={profileData.linkedin}
                    onChange={(e) => handleProfileChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/in/johndoe"
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>
                    𝕏 Twitter / X
                  </Typography>
                  <TextField
                    fullWidth
                    value={profileData.twitter}
                    onChange={(e) => handleProfileChange('twitter', e.target.value)}
                    placeholder="@johndoe"
                    size="small"
                  />
                </Box>
              </Box>
            </Card>

            {/* Save Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                sx={{ textTransform: 'none', color: '#6b7280', borderColor: '#d1d5db' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveProfile}
                disabled={saving}
                sx={{ 
                  bgcolor: '#0891b2',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#0e7490' }
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Account Settings Tab */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Account Settings
            </Typography>
            <Typography sx={{ color: '#6b7280', mb: 4 }}>
              Manage your account security and preferences
            </Typography>

            {/* Change Password */}
            <Card sx={{ p: 4, mb: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2, 
                  bgcolor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <LockIcon sx={{ color: '#0891b2', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Change Password
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Update your password to keep your account secure
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <PasswordField
                    label="Current Password"
                    fullWidth
                    size="small"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                </Box>
                <Box>
                  <PasswordField
                    label="New Password"
                    fullWidth
                    size="small"
                    showStrength={true}
                    showRequirements={true}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                </Box>
                <Box>
                  <PasswordField
                    label="Confirm New Password"
                    fullWidth
                    size="small"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                </Box>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleChangePassword}
                  disabled={saving}
                  sx={{ 
                    bgcolor: '#0891b2',
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#0e7490' }
                  }}
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </Button>
              </Box>
            </Card>

            {/* Change Email */}
            <Card sx={{ p: 4, mb: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2, 
                  bgcolor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <EmailIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Change Email Address
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Current email: {user?.email}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>
                    New Email Address
                  </Typography>
                  <TextField
                    fullWidth
                    type="email"
                    size="small"
                    value={emailData.newEmail}
                    onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                    placeholder="newemail@example.com"
                  />
                </Box>
                <Box>
                  <PasswordField
                    label="Confirm Password"
                    fullWidth
                    size="small"
                    helperText="Enter your password to confirm this change"
                    value={emailData.password}
                    onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                  />
                </Box>
              </Box>

              {user?.auth_provider === 'google' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Email cannot be changed for Google authenticated accounts
                </Alert>
              )}

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleChangeEmail}
                  disabled={saving || user?.auth_provider === 'google'}
                  sx={{ 
                    bgcolor: '#0891b2',
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#0e7490' }
                  }}
                >
                  {saving ? 'Updating...' : 'Update Email'}
                </Button>
              </Box>
            </Card>

            {/* Notification Preferences */}
            <Card sx={{ p: 4, mb: 3, boxShadow: 'none', border: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2, 
                  bgcolor: '#f3e8ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <NotificationsIcon sx={{ color: '#a855f7', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Notification Preferences
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Choose what notifications you want to receive
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ fontWeight: 600, mb: 2 }}>
                Email Notifications
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', mb: 2 }}>
                Receive email notifications for important updates
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: '1px solid #f3f4f6' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      Registration Confirmations
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Get notified when you register for an event
                    </Typography>
                  </Box>
                  <Switch
                    checked={preferences.email_registration}
                    onChange={() => handleToggle('email_registration')}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0891b2',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#0891b2',
                      },
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: '1px solid #f3f4f6' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      Event Reminders
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Get reminders about upcoming events
                    </Typography>
                  </Box>
                  <Switch
                    checked={preferences.email_reminder}
                    onChange={() => handleToggle('email_reminder')}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0891b2',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#0891b2',
                      },
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: '1px solid #f3f4f6' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      Attendee Updates
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Notifications when attendees register or check-in
                    </Typography>
                  </Box>
                  <Switch
                    checked={preferences.email_updates}
                    onChange={() => handleToggle('email_updates')}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0891b2',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#0891b2',
                      },
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: '1px solid #f3f4f6' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      Q&A Answers
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Get notified when your question is answered
                    </Typography>
                  </Box>
                  <Switch
                    checked={preferences.email_qa_answer}
                    onChange={() => handleToggle('email_qa_answer')}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0891b2',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#0891b2',
                      },
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: '1px solid #f3f4f6' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      New Polls
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Be notified when organizers create new polls
                    </Typography>
                  </Box>
                  <Switch
                    checked={preferences.email_new_poll}
                    onChange={() => handleToggle('email_new_poll')}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0891b2',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#0891b2',
                      },
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      Event Cancellations
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Be informed if an event is cancelled
                    </Typography>
                  </Box>
                  <Switch
                    checked={preferences.email_cancellation}
                    onChange={() => handleToggle('email_cancellation')}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0891b2',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#0891b2',
                      },
                    }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography sx={{ fontWeight: 600, mb: 2 }}>
                Push Notifications
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', mb: 2 }}>
                Browser push notifications for real-time updates
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                    In-App Notifications
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Show notifications in the notification bell
                  </Typography>
                </Box>
                <Switch
                  checked={preferences.in_app_notifications}
                  onChange={() => handleToggle('in_app_notifications')}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#0891b2',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#0891b2',
                    },
                  }}
                />
              </Box>
            </Card>

            {/* Danger Zone */}
            <Card sx={{ p: 4, mb: 3, boxShadow: 'none', border: '1px solid #fecaca', bgcolor: '#fef2f2' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2, 
                  bgcolor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldIcon sx={{ color: '#ef4444', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#991b1b' }}>
                    Danger Zone
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: '#7f1d1d' }}>
                    Irreversible actions for your account
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 500 }}>
                    Delete Account
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#7f1d1d' }}>
                    Permanently delete your account and all data
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  onClick={() => setDeleteDialogOpen(true)}
                  sx={{ 
                    textTransform: 'none',
                    bgcolor: '#dc2626',
                    '&:hover': {
                      bgcolor: '#b91c1c'
                    }
                  }}
                >
                  Delete Account
                </Button>
              </Box>
            </Card>

            {/* Save Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                sx={{ textTransform: 'none', color: '#6b7280', borderColor: '#d1d5db' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                sx={{ 
                  bgcolor: '#0891b2',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#0e7490' }
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !saving && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: '#dc2626', fontWeight: 600 }}>
          Delete Account
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Are you sure you want to delete your account? This action cannot be undone. All your data, including:
          </DialogContentText>
          <Box component="ul" sx={{ color: '#6b7280', mb: 3 }}>
            <li>Profile information</li>
            <li>Created events</li>
            <li>Event registrations</li>
            <li>Tickets and purchases</li>
            <li>Messages and interactions</li>
          </Box>
          <DialogContentText sx={{ mb: 2, fontWeight: 600 }}>
            will be permanently deleted.
          </DialogContentText>
          
          {user?.auth_provider === 'local' && (
            <Box>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>
                Enter your password to confirm:
              </Typography>
              <PasswordField
                fullWidth
                size="small"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </Box>
          )}
          
          {user?.auth_provider === 'google' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Your Google account will be disconnected from this service.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeletePassword('');
              setErrorMessage('');
            }}
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            disabled={saving}
            variant="contained"
            sx={{
              textTransform: 'none',
              bgcolor: '#dc2626',
              '&:hover': { bgcolor: '#b91c1c' }
            }}
          >
            {saving ? 'Deleting...' : 'Delete My Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Settings;
