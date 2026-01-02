import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, History, BarChart3 } from 'lucide-react';
import EmailTemplatesSettings from '@/components/settings/EmailTemplatesSettings';
import EmailHistorySettings from '@/components/settings/EmailHistorySettings';
import { EmailAnalyticsDashboard } from '@/components/settings/EmailAnalyticsDashboard';

interface EmailCenterPageProps {
  defaultTab?: string | null;
}

const validTabs = ['templates', 'history', 'analytics'];

const EmailCenterPage = ({ defaultTab }: EmailCenterPageProps) => {
  const [activeTab, setActiveTab] = useState(() => {
    if (defaultTab && validTabs.includes(defaultTab)) {
      return defaultTab;
    }
    return 'templates';
  });

  useEffect(() => {
    if (defaultTab && validTabs.includes(defaultTab)) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Email Center</h2>
        <p className="text-sm text-muted-foreground">
          Manage email templates, view sent emails, and analyze engagement
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">History</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <EmailTemplatesSettings />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <EmailHistorySettings />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <EmailAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailCenterPage;
