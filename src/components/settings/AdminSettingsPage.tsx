import { useState, lazy, Suspense, useMemo, useEffect } from 'react';
import { Users, Lock, GitBranch, Plug, Database, Shield, Activity, FileText, Megaphone, CheckSquare, Palette, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2, ShieldAlert, Settings2, BarChart3 } from 'lucide-react';

// Lazy load admin section components
const UserManagement = lazy(() => import('@/components/UserManagement'));
const PageAccessSettings = lazy(() => import('@/components/settings/PageAccessSettings'));
const PipelineSettings = lazy(() => import('@/components/settings/PipelineSettings'));
const IntegrationSettings = lazy(() => import('@/components/settings/IntegrationSettings'));
const BackupRestoreSettings = lazy(() => import('@/components/settings/BackupRestoreSettings'));
const AuditLogsSettings = lazy(() => import('@/components/settings/AuditLogsSettings'));
const SystemStatusSettings = lazy(() => import('@/components/settings/SystemStatusSettings'));
const ScheduledReportsSettings = lazy(() => import('@/components/settings/ScheduledReportsSettings'));
const AnnouncementSettings = lazy(() => import('@/components/settings/AnnouncementSettings'));
const ApprovalWorkflowSettings = lazy(() => import('@/components/settings/ApprovalWorkflowSettings'));
const BrandingSettings = lazy(() => import('@/components/settings/BrandingSettings'));

// Loading skeleton for lazy-loaded sections
const SectionLoadingSkeleton = () => <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-full max-w-md" />
    <div className="grid gap-4 mt-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>;

// Tab definitions with grouped sections
const adminTabs = [{
  id: 'users',
  label: 'Users',
  icon: Users
}, {
  id: 'access',
  label: 'Access',
  icon: Lock
}, {
  id: 'config',
  label: 'Config',
  icon: Settings2
}, {
  id: 'system',
  label: 'System',
  icon: Activity
}, {
  id: 'reports',
  label: 'Reports',
  icon: BarChart3
}];
interface AdminSettingsPageProps {
  defaultSection?: string | null;
}
const AdminSettingsPage = ({
  defaultSection
}: AdminSettingsPageProps) => {
  const {
    userRole,
    loading: roleLoading
  } = useUserRole();

  // Map sections to tabs
  const getTabFromSection = (section: string | null) => {
    if (!section) return 'users';
    const sectionToTab: Record<string, string> = {
      'users': 'users',
      'page-access': 'access',
      'pipeline': 'config',
      'integrations': 'config',
      'branding': 'config',
      'approval-workflows': 'config',
      'backup': 'system',
      'audit-logs': 'system',
      'system-status': 'system',
      'scheduled-reports': 'reports',
      'announcements': 'reports'
    };
    return sectionToTab[section] || 'users';
  };
  const [activeTab, setActiveTab] = useState(() => getTabFromSection(defaultSection));
  useEffect(() => {
    if (defaultSection) {
      setActiveTab(getTabFromSection(defaultSection));
    }
  }, [defaultSection]);
  const isAdmin = userRole === 'admin';
  if (roleLoading) {
    return <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  if (!isAdmin) {
    return <Card>
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">Access Denied</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              Only administrators can access administration settings. 
              Contact your system administrator if you need access.
            </p>
          </div>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6 max-w-6xl">
      <div className="mb-6">
        
        
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-xl">
          {adminTabs.map(tab => {
          const Icon = tab.icon;
          return <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">{tab.label}</span>
              </TabsTrigger>;
        })}
        </TabsList>

        <TabsContent value="users" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">User Directory</CardTitle>
                  <CardDescription className="text-sm">Manage user accounts, roles, and permissions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SectionLoadingSkeleton />}>
                <UserManagement />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Page Access Control</CardTitle>
                  <CardDescription className="text-sm">Configure which roles can access each page</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SectionLoadingSkeleton />}>
                <PageAccessSettings />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Pipeline & Status Management</CardTitle>
                  <CardDescription className="text-sm">Customize deal stages and lead statuses</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SectionLoadingSkeleton />}>
                <PipelineSettings />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Plug className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Third-Party Integrations</CardTitle>
                  <CardDescription className="text-sm">Connect with Microsoft Teams, Email, and Calendar</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SectionLoadingSkeleton />}>
                <IntegrationSettings />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Approval Workflows</CardTitle>
                  <CardDescription className="text-sm">Configure multi-step approval processes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SectionLoadingSkeleton />}>
                <ApprovalWorkflowSettings />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Branding Settings</CardTitle>
                  <CardDescription className="text-sm">Customize app logo, colors, and appearance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SectionLoadingSkeleton />}>
                <BrandingSettings />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Data Backup & Restore</CardTitle>
                  <CardDescription className="text-sm">Export data and manage backups</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SectionLoadingSkeleton />}>
                <BackupRestoreSettings />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Audit Logs</CardTitle>
                  <CardDescription className="text-sm">View system activity and security events</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SectionLoadingSkeleton />}>
                <AuditLogsSettings />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">System Status</CardTitle>
                  <CardDescription className="text-sm">Monitor system health, database stats, and storage usage</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SectionLoadingSkeleton />}>
                <SystemStatusSettings />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Scheduled Reports</CardTitle>
                  <CardDescription className="text-sm">Configure automated email reports</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SectionLoadingSkeleton />}>
                <ScheduledReportsSettings />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">Announcement Management</CardTitle>
                  <CardDescription className="text-sm">Create and manage system announcements</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SectionLoadingSkeleton />}>
                <AnnouncementSettings />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
};
export default AdminSettingsPage;