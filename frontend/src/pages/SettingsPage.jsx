import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Divider,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    avatar_url: user?.avatar_url || '',
  });
  const [saving, setSaving] = useState(false);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await authApi.updateMe(profile);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', p: 1 }}>
      <Typography variant="h2" sx={{ mb: 1 }}>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Manage your account settings and preferences
      </Typography>

      {/* Profile Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <PersonIcon sx={{ color: '#6366f1' }} />
            <Typography variant="h4">Profile</Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: '#6366f1',
                fontSize: '2rem',
              }}
              src={profile.avatar_url}
            >
              {user?.full_name?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h4">{user?.full_name}</Typography>
              <Typography variant="body2" color="text.secondary">
                @{user?.username}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={profile.full_name}
                onChange={(e) =>
                  setProfile({ ...profile, full_name: e.target.value })
                }
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Avatar URL"
                value={profile.avatar_url}
                onChange={(e) =>
                  setProfile({ ...profile, avatar_url: e.target.value })
                }
                size="small"
                placeholder="https://example.com/avatar.jpg"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleProfileSave}
              disabled={saving}
              sx={{ bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <NotificationsIcon sx={{ color: '#f59e0b' }} />
            <Typography variant="h4">Notifications</Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={<Switch defaultChecked color="primary" />}
              label={
                <Box>
                  <Typography variant="body1">Email notifications</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Receive email alerts for issue assignments and mentions
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0 }}
            />
            <FormControlLabel
              control={<Switch defaultChecked color="primary" />}
              label={
                <Box>
                  <Typography variant="body1">Issue updates</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Get notified when issues you're watching are updated
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0 }}
            />
            <FormControlLabel
              control={<Switch color="primary" />}
              label={
                <Box>
                  <Typography variant="body1">Sprint notifications</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Alerts for sprint start, end, and scope changes
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <PaletteIcon sx={{ color: '#8b5cf6' }} />
            <Typography variant="h4">Appearance</Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Theme customization coming soon. Currently using the default light
            theme optimized for eye comfort.
          </Alert>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <LockIcon sx={{ color: '#ef4444' }} />
            <Typography variant="h4">Security</Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Password change functionality coming soon.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}
