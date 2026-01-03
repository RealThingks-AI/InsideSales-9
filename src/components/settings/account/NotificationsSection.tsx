import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell } from 'lucide-react';

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

interface NotificationsSectionProps {
  notificationPrefs: NotificationPrefs;
  setNotificationPrefs: React.Dispatch<React.SetStateAction<NotificationPrefs>>;
}

const NotificationsSection = ({ notificationPrefs, setNotificationPrefs }: NotificationsSectionProps) => {
  const deliveryMethods = [
    { key: 'email_notifications' as const, label: 'Email', description: 'Receive notifications via email' },
    { key: 'in_app_notifications' as const, label: 'In-App', description: 'Show notifications in the app' },
    { key: 'push_notifications' as const, label: 'Push', description: 'Browser push notifications' },
  ];

  const eventTriggers = [
    { key: 'lead_assigned' as const, label: 'Lead Assigned' },
    { key: 'deal_updates' as const, label: 'Deal Updates' },
    { key: 'task_reminders' as const, label: 'Task Reminders' },
    { key: 'meeting_reminders' as const, label: 'Meeting Reminders' },
    { key: 'weekly_digest' as const, label: 'Weekly Digest' },
  ];

  const togglePref = (key: keyof NotificationPrefs) => {
    setNotificationPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Delivery Methods */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivery Methods</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {deliveryMethods.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="space-y-0.5">
                  <Label htmlFor={key} className="text-sm font-medium cursor-pointer">{label}</Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  id={key}
                  checked={notificationPrefs[key]}
                  onCheckedChange={() => togglePref(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Event Triggers */}
        <div className="space-y-3 pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Event Triggers</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {eventTriggers.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
                <Switch
                  id={key}
                  checked={notificationPrefs[key]}
                  onCheckedChange={() => togglePref(key)}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationsSection;
