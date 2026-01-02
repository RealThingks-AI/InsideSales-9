import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useThemePreferences } from '@/hooks/useThemePreferences';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  User, Mail, Phone, Globe, Loader2, Key, Bell, Settings, Sun, Moon, 
  Check, X, Monitor, Smartphone, Tablet, Clock, MapPin, LogOut, RefreshCw,
  Eye, EyeOff, Trash2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const timezones = [
  { value: 'Asia/Kolkata', label: 'IST (India Standard Time)' },
  { value: 'America/New_York', label: 'EST (Eastern Standard Time)' },
  { value: 'America/Los_Angeles', label: 'PST (Pacific Standard Time)' },
  { value: 'Europe/London', label: 'GMT (Greenwich Mean Time)' },
  { value: 'Europe/Paris', label: 'CET (Central European Time)' },
  { value: 'Asia/Tokyo', label: 'JST (Japan Standard Time)' },
  { value: 'Asia/Singapore', label: 'SGT (Singapore Time)' },
  { value: 'Australia/Sydney', label: 'AEST (Australian Eastern Time)' },
  { value: 'Asia/Dubai', label: 'GST (Gulf Standard Time)' }
];

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  timezone: string;
  avatar_url: string;
}

interface NotificationPrefs {
  email_notifications: boolean;
  in_app_notifications: boolean;
  push_notifications: boolean;
  lead_assigned: boolean;
  deal_updates: boolean;
  task_reminders: boolean;
  meeting_reminders: boolean;
  weekly_digest: boolean;
}

interface DisplayPrefs {
  date_format: string;
  time_format: string;
  currency: string;
  default_module: string;
}

interface Session {
  id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: {
    browser?: string;
    os?: string;
    device?: string;
  } | null;
  last_active_at: string;
  created_at: string;
  is_active: boolean;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

const AccountSettingsPage = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useThemePreferences();
  const { logSecurityEvent } = useSecurityAudit();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);
  const [showTerminateAllDialog, setShowTerminateAllDialog] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  // Track initial values to detect changes
  const initialDataRef = useRef<{
    profile: ProfileData;
    notificationPrefs: NotificationPrefs;
    displayPrefs: DisplayPrefs;
  } | null>(null);

  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    email: '',
    phone: '',
    timezone: 'Asia/Kolkata',
    avatar_url: ''
  });

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({
    email_notifications: true,
    in_app_notifications: true,
    push_notifications: false,
    lead_assigned: true,
    deal_updates: true,
    task_reminders: true,
    meeting_reminders: true,
    weekly_digest: false,
  });

  const [displayPrefs, setDisplayPrefs] = useState<DisplayPrefs>({
    date_format: 'DD/MM/YYYY',
    time_format: '12h',
    currency: 'INR',
    default_module: 'dashboard',
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!initialDataRef.current) return false;
    const { profile: initProfile, notificationPrefs: initNotif, displayPrefs: initDisplay } = initialDataRef.current;
    
    return (
      JSON.stringify(profile) !== JSON.stringify(initProfile) ||
      JSON.stringify(notificationPrefs) !== JSON.stringify(initNotif) ||
      JSON.stringify(displayPrefs) !== JSON.stringify(initDisplay)
    );
  }, [profile, notificationPrefs, displayPrefs]);

  // Password validation
  const passwordRequirements: PasswordRequirement[] = [
    { label: 'At least 8 characters', met: passwordData.newPassword.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(passwordData.newPassword) },
    { label: 'At least one lowercase letter', met: /[a-z]/.test(passwordData.newPassword) },
    { label: 'At least one number', met: /\d/.test(passwordData.newPassword) },
    { label: 'At least one special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = passwordData.newPassword === passwordData.confirmPassword && passwordData.confirmPassword.length > 0;
  const passwordStrength = (passwordRequirements.filter(req => req.met).length / passwordRequirements.length) * 100;

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (user) {
      fetchAllData();
      fetchCurrentSessionToken();
    }
  }, [user]);

  const fetchCurrentSessionToken = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      // Use a hash or portion of the token for comparison
      setCurrentSessionToken(data.session.access_token.substring(0, 20));
    }
  };

  const fetchAllData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const loadedProfile: ProfileData = {
        full_name: profileData?.full_name || user.user_metadata?.full_name || '',
        email: profileData?.['Email ID'] || user.email || '',
        phone: profileData?.phone || '',
        timezone: profileData?.timezone || 'Asia/Kolkata',
        avatar_url: profileData?.avatar_url || ''
      };
      setProfile(loadedProfile);

      // Fetch notification preferences
      const { data: notifData } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const loadedNotifPrefs: NotificationPrefs = {
        email_notifications: notifData?.email_notifications ?? true,
        in_app_notifications: notifData?.in_app_notifications ?? true,
        push_notifications: notifData?.push_notifications ?? false,
        lead_assigned: notifData?.lead_assigned ?? true,
        deal_updates: notifData?.deal_updates ?? true,
        task_reminders: notifData?.task_reminders ?? true,
        meeting_reminders: notifData?.meeting_reminders ?? true,
        weekly_digest: notifData?.weekly_digest ?? false,
      };
      setNotificationPrefs(loadedNotifPrefs);

      // Fetch display preferences
      const { data: displayData } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const loadedDisplayPrefs: DisplayPrefs = {
        date_format: displayData?.date_format || 'DD/MM/YYYY',
        time_format: displayData?.time_format || '12h',
        currency: displayData?.currency || 'INR',
        default_module: displayData?.default_module || 'dashboard',
      };
      setDisplayPrefs(loadedDisplayPrefs);

      // Store initial values
      initialDataRef.current = {
        profile: loadedProfile,
        notificationPrefs: loadedNotifPrefs,
        displayPrefs: loadedDisplayPrefs
      };

      // Fetch sessions
      await fetchSessions();
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    if (!user) return;
    setLoadingSessions(true);

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_active_at', { ascending: false });

      if (error) throw error;

      setSessions((data || []).map(s => ({
        ...s,
        ip_address: s.ip_address as string | null,
        device_info: s.device_info as Session['device_info']
      })));
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSaveAll = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Save profile
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: profile.full_name,
        'Email ID': profile.email,
        phone: profile.phone,
        timezone: profile.timezone,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString()
      });

      // Save notification preferences
      await supabase.from('notification_preferences').upsert({
        user_id: user.id,
        ...notificationPrefs,
        updated_at: new Date().toISOString(),
      });

      // Save display preferences
      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        theme,
        ...displayPrefs,
        updated_at: new Date().toISOString(),
      });

      // Update initial values after successful save
      initialDataRef.current = {
        profile,
        notificationPrefs,
        displayPrefs
      };

      toast.success('All settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!allRequirementsMet || !passwordsMatch) return;

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      await logSecurityEvent('PASSWORD_CHANGE', 'auth', user?.id, {
        changed_at: new Date().toISOString()
      });

      setPasswordData({ newPassword: '', confirmPassword: '' });
      setShowPasswordModal(false);
      toast.success('Password changed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isCurrentSession = (session: Session) => {
    // Compare session tokens to identify current session
    return session.session_token?.substring(0, 20) === currentSessionToken;
  };

  const terminateSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Session terminated');
      fetchSessions();
    } catch (error) {
      toast.error('Failed to terminate session');
    } finally {
      setTerminatingSession(null);
    }
  };

  const terminateAllOtherSessions = async () => {
    if (!user) return;

    try {
      // Get current session to exclude it
      const currentSession = sessions.find(s => isCurrentSession(s));
      
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .neq('id', currentSession?.id || '');

      if (error) throw error;

      toast.success('All other sessions terminated');
      fetchSessions();
    } catch (error) {
      toast.error('Failed to terminate sessions');
    } finally {
      setShowTerminateAllDialog(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      setProfile(p => ({ ...p, avatar_url: urlData.publicUrl + '?t=' + Date.now() }));
      toast.success('Profile picture updated');
    } catch (error: any) {
      if (error.message?.includes('bucket')) {
        toast.error('Avatar storage is not configured. Please contact support.');
      } else {
        toast.error('Failed to upload profile picture');
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !profile.avatar_url) return;
    setRemovingAvatar(true);
    
    try {
      // Remove from storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([`${user.id}/avatar.png`, `${user.id}/avatar.jpg`, `${user.id}/avatar.jpeg`, `${user.id}/avatar.webp`]);
      
      // Update profile
      setProfile(p => ({ ...p, avatar_url: '' }));
      toast.success('Profile picture removed');
    } catch (error) {
      toast.error('Failed to remove profile picture');
    } finally {
      setRemovingAvatar(false);
    }
  };

  const getDeviceIcon = (deviceInfo: Session['device_info']) => {
    const device = deviceInfo?.device?.toLowerCase() || '';
    if (device.includes('mobile') || device.includes('phone')) return <Smartphone className="h-5 w-5" />;
    if (device.includes('tablet') || device.includes('ipad')) return <Tablet className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  const parseUserAgent = (userAgent: string | null): { browser: string; os: string } => {
    if (!userAgent) return { browser: 'Unknown', os: 'Unknown' };
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edg')) browser = 'Edge';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    return { browser, os };
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Unsaved Changes Indicator */}
      {hasUnsavedChanges() && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-amber-800 dark:text-amber-200">You have unsaved changes</p>
          <Button size="sm" onClick={handleSaveAll} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Now'}
          </Button>
        </div>
      )}

      {/* Profile Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="relative group">
                <Avatar className="h-16 w-16 cursor-pointer" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleAvatarUpload(file);
                  };
                  input.click();
                }}>
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  <AvatarFallback className="text-sm">{getInitials(profile.full_name || 'U')}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-white text-xs">Change</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 mt-1">
                <p className="text-xs text-muted-foreground">Click to change</p>
                {profile.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-destructive hover:text-destructive"
                    onClick={handleRemoveAvatar}
                    disabled={removingAvatar}
                    aria-label="Remove profile picture"
                  >
                    {removingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs">Full Name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    readOnly
                    disabled
                    className="pl-8 h-9 bg-muted/50 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={e => {
                    let value = e.target.value.replace(/[^\d+\s()-]/g, '');
                    setProfile(p => ({ ...p, phone: value }));
                  }}
                  placeholder="+1 234 567 8900"
                  className="pl-8 h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone" className="text-xs">Timezone</Label>
              <div className="relative">
                <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select
                  value={profile.timezone}
                  onValueChange={value => setProfile(p => ({ ...p, timezone: value }))}
                >
                  <SelectTrigger className="pl-8 h-9">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Update your password to keep your account secure</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>
              <Key className="h-3.5 w-3.5 mr-1.5" />
              Change Password
            </Button>
          </div>

          {/* Active Sessions */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium">Active Sessions</p>
                <p className="text-xs text-muted-foreground">Manage your logged-in devices</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loadingSessions} aria-label="Refresh sessions">
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingSessions ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                {sessions.filter(s => !isCurrentSession(s)).length > 0 && (
                  <Button variant="destructive" size="sm" onClick={() => setShowTerminateAllDialog(true)}>
                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                    Sign Out All Others
                  </Button>
                )}
              </div>
            </div>

            {loadingSessions ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No active sessions found</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => {
                  const { browser, os } = parseUserAgent(session.user_agent);
                  const isCurrent = isCurrentSession(session);
                  return (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">{getDeviceIcon(session.device_info)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{browser} on {os}</span>
                            {isCurrent && <Badge variant="secondary" className="text-xs">Current</Badge>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {session.ip_address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{session.ip_address}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last active: {format(new Date(session.last_active_at), 'dd/MM, HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setTerminatingSession(session.id)}
                          aria-label={`Sign out ${browser} on ${os}`}
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivery Methods</p>
            <div className="grid gap-2">
              {[
                { key: 'email_notifications', label: 'Email' },
                { key: 'in_app_notifications', label: 'In-App' },
                { key: 'push_notifications', label: 'Push' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
                  <Switch
                    id={key}
                    checked={notificationPrefs[key as keyof NotificationPrefs] as boolean}
                    onCheckedChange={() => setNotificationPrefs(p => ({ ...p, [key]: !p[key as keyof NotificationPrefs] }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Event Triggers</p>
            <div className="grid gap-2">
              {[
                { key: 'lead_assigned', label: 'Lead Assigned' },
                { key: 'deal_updates', label: 'Deal Updates' },
                { key: 'task_reminders', label: 'Task Reminders' },
                { key: 'meeting_reminders', label: 'Meeting Reminders' },
                { key: 'weekly_digest', label: 'Weekly Digest' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
                  <Switch
                    id={key}
                    checked={notificationPrefs[key as keyof NotificationPrefs] as boolean}
                    onCheckedChange={() => setNotificationPrefs(p => ({ ...p, [key]: !p[key as keyof NotificationPrefs] }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Display Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
              <Label className="text-xs">Theme</Label>
              <Select value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2"><Sun className="h-3.5 w-3.5" />Light</div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2"><Moon className="h-3.5 w-3.5" />Dark</div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2"><Monitor className="h-3.5 w-3.5" />System</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Default Module</Label>
              <Select
                value={displayPrefs.default_module}
                onValueChange={(value) => setDisplayPrefs(p => ({ ...p, default_module: value }))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="deals">Deals</SelectItem>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="accounts">Accounts</SelectItem>
                  <SelectItem value="tasks">Tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Date Format</Label>
              <Select
                value={displayPrefs.date_format}
                onValueChange={(value) => setDisplayPrefs(p => ({ ...p, date_format: value }))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                  <SelectItem value="DD-MMM-YYYY">DD-MMM-YYYY (31-Dec-2024)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Time Format</Label>
              <Select
                value={displayPrefs.time_format}
                onValueChange={(value) => setDisplayPrefs(p => ({ ...p, time_format: value }))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (3:30 PM)</SelectItem>
                  <SelectItem value="24h">24-hour (15:30)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Currency</Label>
              <Select
                value={displayPrefs.currency}
                onValueChange={(value) => setDisplayPrefs(p => ({ ...p, currency: value }))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ INR (Indian Rupee)</SelectItem>
                  <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                  <SelectItem value="EUR">€ EUR (Euro)</SelectItem>
                  <SelectItem value="GBP">£ GBP (British Pound)</SelectItem>
                  <SelectItem value="AED">د.إ AED (UAE Dirham)</SelectItem>
                  <SelectItem value="SGD">S$ SGD (Singapore Dollar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save All Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSaveAll} disabled={saving} size="lg">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save All Changes
        </Button>
      </div>

      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onOpenChange={() => {
        setShowPasswordModal(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" />Change Password
            </DialogTitle>
            <DialogDescription>Create a strong password that meets all requirements</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={e => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  className="h-9 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-9 w-9 px-2"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {passwordData.newPassword.length > 0 && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Password strength</span>
                    <span className={`font-medium ${passwordStrength < 40 ? 'text-destructive' : passwordStrength < 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {passwordStrength < 40 ? 'Weak' : passwordStrength < 80 ? 'Medium' : 'Strong'}
                    </span>
                  </div>
                  <Progress value={passwordStrength} className="h-1.5" />
                </div>
              )}
            </div>
            
            {passwordData.newPassword.length > 0 && (
              <div className="space-y-1.5 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">Requirements:</p>
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {req.met ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>{req.label}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={e => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  className="h-9 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-9 w-9 px-2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {passwordData.confirmPassword.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs mt-1">
                  {passwordsMatch ? (
                    <><Check className="h-3.5 w-3.5 text-green-500" /><span className="text-green-600">Passwords match</span></>
                  ) : (
                    <><X className="h-3.5 w-3.5 text-destructive" /><span className="text-destructive">Passwords do not match</span></>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isChangingPassword || !allRequirementsMet || !passwordsMatch}>
                {isChangingPassword ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Updating...</> : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Terminate Session Dialog */}
      <AlertDialog open={!!terminatingSession} onOpenChange={() => setTerminatingSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Session</AlertDialogTitle>
            <AlertDialogDescription>This will sign out this device. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => terminatingSession && terminateSession(terminatingSession)}>
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminate All Dialog */}
      <AlertDialog open={showTerminateAllDialog} onOpenChange={setShowTerminateAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out All Other Sessions</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out all devices except the current one. You'll need to log in again on those devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={terminateAllOtherSessions}>Sign Out All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountSettingsPage;
