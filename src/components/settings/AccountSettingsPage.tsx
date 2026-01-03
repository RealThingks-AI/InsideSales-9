import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useThemePreferences } from '@/hooks/useThemePreferences';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Key, Check, X, Eye, EyeOff } from 'lucide-react';
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

import ProfileSection from './account/ProfileSection';
import SecuritySection from './account/SecuritySection';
import NotificationsSection from './account/NotificationsSection';
import DisplayPreferencesSection from './account/DisplayPreferencesSection';

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
  notification_frequency: 'instant' | 'daily' | 'weekly';
  leads_notifications: boolean;
  contacts_notifications: boolean;
  accounts_notifications: boolean;
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
  const { user } = useAuth();
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
    notification_frequency: 'instant',
    leads_notifications: true,
    contacts_notifications: true,
    accounts_notifications: true,
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

  const hasUnsavedChanges = useCallback(() => {
    if (!initialDataRef.current) return false;
    const { profile: initProfile, notificationPrefs: initNotif, displayPrefs: initDisplay } = initialDataRef.current;
    
    return (
      JSON.stringify(profile) !== JSON.stringify(initProfile) ||
      JSON.stringify(notificationPrefs) !== JSON.stringify(initNotif) ||
      JSON.stringify(displayPrefs) !== JSON.stringify(initDisplay)
    );
  }, [profile, notificationPrefs, displayPrefs]);

  const passwordRequirements: PasswordRequirement[] = [
    { label: 'At least 8 characters', met: passwordData.newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(passwordData.newPassword) },
    { label: 'One lowercase letter', met: /[a-z]/.test(passwordData.newPassword) },
    { label: 'One number', met: /\d/.test(passwordData.newPassword) },
    { label: 'One special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = passwordData.newPassword === passwordData.confirmPassword && passwordData.confirmPassword.length > 0;
  const passwordStrength = (passwordRequirements.filter(req => req.met).length / passwordRequirements.length) * 100;

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
      setCurrentSessionToken(data.session.access_token.substring(0, 20));
    }
  };

  const fetchAllData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
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
        notification_frequency: (notifData?.notification_frequency as 'instant' | 'daily' | 'weekly') ?? 'instant',
        leads_notifications: notifData?.leads_notifications ?? true,
        contacts_notifications: notifData?.contacts_notifications ?? true,
        accounts_notifications: notifData?.accounts_notifications ?? true,
      };
      setNotificationPrefs(loadedNotifPrefs);

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

      initialDataRef.current = {
        profile: loadedProfile,
        notificationPrefs: loadedNotifPrefs,
        displayPrefs: loadedDisplayPrefs
      };

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
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: profile.full_name,
        'Email ID': profile.email,
        phone: profile.phone,
        timezone: profile.timezone,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString()
      });

      await supabase.from('notification_preferences').upsert({
        user_id: user.id,
        ...notificationPrefs,
        updated_at: new Date().toISOString(),
      });

      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        theme,
        ...displayPrefs,
        updated_at: new Date().toISOString(),
      });

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
      const currentSession = sessions.find(s => s.session_token?.substring(0, 20) === currentSessionToken);
      
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl pb-6">
      {/* Unsaved Changes Indicator */}
      {hasUnsavedChanges() && (
        <div className="sticky top-0 z-10 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center justify-between shadow-sm">
          <p className="text-sm text-amber-800 dark:text-amber-200">You have unsaved changes</p>
          <Button size="sm" onClick={handleSaveAll} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Now'}
          </Button>
        </div>
      )}

      {/* Profile Section */}
      <ProfileSection 
        profile={profile} 
        setProfile={setProfile} 
        userId={user?.id} 
      />

      {/* Security Section */}
      <SecuritySection
        sessions={sessions}
        loadingSessions={loadingSessions}
        currentSessionToken={currentSessionToken}
        onShowPasswordModal={() => setShowPasswordModal(true)}
        onRefreshSessions={fetchSessions}
        onTerminateSession={(id) => setTerminatingSession(id)}
        onTerminateAllOthers={() => setShowTerminateAllDialog(true)}
      />

      {/* Notifications Section */}
      <NotificationsSection
        notificationPrefs={notificationPrefs}
        setNotificationPrefs={setNotificationPrefs}
      />

      {/* Display Preferences Section */}
      <DisplayPreferencesSection
        displayPrefs={displayPrefs}
        setDisplayPrefs={setDisplayPrefs}
        theme={theme}
        setTheme={setTheme}
      />

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
                    <span className="text-muted-foreground">Strength</span>
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
                <div className="grid grid-cols-2 gap-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs">
                      {req.met ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-muted-foreground" />}
                      <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>{req.label}</span>
                    </div>
                  ))}
                </div>
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
                    <><Check className="h-3 w-3 text-green-500" /><span className="text-green-600">Passwords match</span></>
                  ) : (
                    <><X className="h-3 w-3 text-destructive" /><span className="text-destructive">Passwords do not match</span></>
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
              This will sign out all devices except the current one.
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
