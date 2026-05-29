import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Avatar,
  Typography,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { getProfileImageUrl } from '../utils/profileImage';

function ProfileMenu({ user }) {
  const navigate = useNavigate();
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);

  const handleProfileMenuOpen = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const handleMenuItemClick = (path) => {
    setProfileAnchorEl(null);
    navigate(path);
  };

  const handleLogout = () => {
    setProfileAnchorEl(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <>
      <Box 
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
        onClick={handleProfileMenuOpen}
      >
        <Avatar 
          src={getProfileImageUrl(user)}
          sx={{ width: 36, height: 36, bgcolor: '#0891b2' }}
        >
          {!user.profile_picture && (user.name?.charAt(0).toUpperCase() || 'U')}
        </Avatar>
        <Box>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>
            {user.name || 'User'}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
          </Typography>
        </Box>
      </Box>

      <Menu
        anchorEl={profileAnchorEl}
        open={Boolean(profileAnchorEl)}
        onClose={handleProfileMenuClose}
        slotProps={{
          paper: {
            sx: {
              width: 240,
              mt: 1.5,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e5e7eb' }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
            {user.name || 'User'}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {user.email || ''}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#0891b2', fontWeight: 600, mt: 0.5 }}>
            {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
          </Typography>
        </Box>

        {user.role === 'admin' && (
          <MenuItem onClick={() => handleMenuItemClick('/admin/dashboard')}>
            <ListItemIcon>
              <AdminPanelSettingsIcon fontSize="small" />
            </ListItemIcon>
            Admin Dashboard
          </MenuItem>
        )}

        {user.role === 'organizer' && (
          <MenuItem onClick={() => handleMenuItemClick('/my-events')}>
            <ListItemIcon>
              <EventNoteIcon fontSize="small" />
            </ListItemIcon>
            My Events
          </MenuItem>
        )}

        {user.role !== 'admin' && (
          <MenuItem onClick={() => handleMenuItemClick('/my-tickets')}>
            <ListItemIcon>
              <ConfirmationNumberIcon fontSize="small" />
            </ListItemIcon>
            My Tickets
          </MenuItem>
        )}

        <Divider />

        <MenuItem onClick={() => handleMenuItemClick('/settings')}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Account Settings
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleLogout} sx={{ color: '#ef4444' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: '#ef4444' }} />
          </ListItemIcon>
          Log Out
        </MenuItem>
      </Menu>
    </>
  );
}

export default ProfileMenu;
