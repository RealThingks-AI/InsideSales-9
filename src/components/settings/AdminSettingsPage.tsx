import { useState, lazy, Suspense, useMemo, useEffect } from 'react';
import { ChevronDown, Users, Lock, GitBranch, Plug, Database, Shield, Activity, FileText, Megaphone, CheckSquare, Palette, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2, ShieldAlert } from 'lucide-react';

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

interface AdminSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.LazyExoticComponent<React.ComponentType>;
  keywords: string[];
}

const adminSections: AdminSection[] = [
  {
    id: 'users',
    title: 'User Directory',
    description: 'Manage user accounts, roles, and permissions',
    icon: Users,
    component: UserManagement,
    keywords: ['user', 'users', 'account', 'role', 'permission', 'team', 'member'],
  },
  {
    id: 'page-access',
    title: 'Page Access Control',
    description: 'Configure which roles can access each page',
    icon: Lock,
    component: PageAccessSettings,
    keywords: ['page', 'access', 'control', 'permission', 'role', 'restrict'],
  },
  {
    id: 'pipeline',
    title: 'Pipeline & Status Management',
    description: 'Customize deal stages and lead statuses',
    icon: GitBranch,
    component: PipelineSettings,
    keywords: ['pipeline', 'stage', 'status', 'deal', 'lead', 'kanban'],
  },
  {
    id: 'integrations',
    title: 'Third-Party Integrations',
    description: 'Connect with Microsoft Teams, Email, and Calendar',
    icon: Plug,
    component: IntegrationSettings,
    keywords: ['integration', 'teams', 'email', 'calendar', 'microsoft', 'connect', 'api'],
  },
  {
    id: 'backup',
    title: 'Data Backup & Restore',
    description: 'Export data and manage backups',
    icon: Database,
    component: BackupRestoreSettings,
    keywords: ['backup', 'restore', 'export', 'data', 'recovery'],
  },
  {
    id: 'audit-logs',
    title: 'Audit Logs',
    description: 'View system activity and security events',
    icon: Shield,
    component: AuditLogsSettings,
    keywords: ['audit', 'log', 'security', 'activity', 'event', 'history'],
  },
  {
    id: 'system-status',
    title: 'System Status',
    description: 'Monitor system health, database stats, and storage usage',
    icon: Activity,
    component: SystemStatusSettings,
    keywords: ['system', 'status', 'health', 'database', 'storage', 'monitor'],
  },
  {
    id: 'scheduled-reports',
    title: 'Scheduled Reports',
    description: 'Configure automated email reports',
    icon: FileText,
    component: ScheduledReportsSettings,
    keywords: ['report', 'schedule', 'automated', 'email', 'analytics'],
  },
  {
    id: 'announcements',
    title: 'Announcement Management',
    description: 'Create and manage system announcements',
    icon: Megaphone,
    component: AnnouncementSettings,
    keywords: ['announcement', 'banner', 'notification', 'message', 'broadcast'],
  },
  {
    id: 'approval-workflows',
    title: 'Approval Workflows',
    description: 'Configure multi-step approval processes',
    icon: CheckSquare,
    component: ApprovalWorkflowSettings,
    keywords: ['approval', 'workflow', 'process', 'step', 'authorize'],
  },
  {
    id: 'branding',
    title: 'Branding Settings',
    description: 'Customize app logo, colors, and appearance',
    icon: Palette,
    component: BrandingSettings,
    keywords: ['branding', 'logo', 'color', 'theme', 'appearance', 'style', 'customize'],
  },
];

// Loading skeleton for lazy-loaded sections
const SectionLoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-full max-w-md" />
    <div className="grid gap-4 mt-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
);

interface AdminSettingsPageProps {
  defaultSection?: string | null;
}

const AdminSettingsPage = ({ defaultSection }: AdminSettingsPageProps) => {
  const { userRole, loading: roleLoading } = useUserRole();
  const [openSections, setOpenSections] = useState<string[]>(() => {
    if (defaultSection && adminSections.some(s => s.id === defaultSection)) {
      return [defaultSection];
    }
    return ['users'];
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-expand section when defaultSection changes
  useEffect(() => {
    if (defaultSection && adminSections.some(s => s.id === defaultSection)) {
      setOpenSections(prev => 
        prev.includes(defaultSection) ? prev : [defaultSection]
      );
    }
  }, [defaultSection]);

  const isAdmin = userRole === 'admin';

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return adminSections;
    
    const query = searchQuery.toLowerCase();
    return adminSections.filter(section => 
      section.title.toLowerCase().includes(query) ||
      section.description.toLowerCase().includes(query) ||
      section.keywords.some(keyword => keyword.includes(query))
    );
  }, [searchQuery]);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
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
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Administration</h2>
        <p className="text-sm text-muted-foreground">
          Manage users, permissions, and system configuration
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search settings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          aria-label="Search administration settings"
        />
      </div>

      {filteredSections.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No settings found matching "{searchQuery}"
            </p>
          </CardContent>
        </Card>
      ) : (
        filteredSections.map((section) => {
          const Icon = section.icon;
          const isOpen = openSections.includes(section.id);
          const SectionComponent = section.component;

          return (
            <Collapsible
              key={section.id}
              open={isOpen}
              onOpenChange={() => toggleSection(section.id)}
            >
              <Card className={cn(
                "transition-all duration-200",
                isOpen && "ring-1 ring-primary/20"
              )}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-medium">{section.title}</CardTitle>
                          <CardDescription className="text-sm">{section.description}</CardDescription>
                        </div>
                      </div>
                      <ChevronDown className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180"
                      )} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-6">
                    <div className="pt-4 border-t">
                      <Suspense fallback={<SectionLoadingSkeleton />}>
                        <SectionComponent />
                      </Suspense>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })
      )}
    </div>
  );
};

export default AdminSettingsPage;
