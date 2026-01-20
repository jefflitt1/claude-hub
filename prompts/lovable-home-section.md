# Home Section - Dashboard Landing Page

**Purpose:** Add a "Home" section as the default landing page showing daily summary, system health, and quick actions.

## Database Views Needed

First, create these Supabase views for the Home section data:

```sql
-- Daily summary view
CREATE OR REPLACE VIEW dashboard_daily_summary AS
SELECT
  (SELECT COUNT(*) FROM n8n_workflows WHERE active = true AND status != 'deleted') as active_workflows,
  (SELECT COUNT(*) FROM n8n_workflows WHERE status = 'deleted') as deleted_workflows,
  (SELECT SUM(success_count_7d) FROM n8n_workflows) as successful_runs_7d,
  (SELECT SUM(error_count_7d) FROM n8n_workflows) as failed_runs_7d,
  (SELECT COUNT(*) FROM claude_projects WHERE status = 'active') as active_projects,
  (SELECT COUNT(*) FROM claude_agents WHERE enabled = true) as enabled_agents,
  (SELECT COUNT(*) FROM mcp_servers WHERE enabled = true) as enabled_mcp_servers;
```

## 1. Home Section Component

Create a new section that appears first in the sidebar and is the default route:

```jsx
// src/components/sections/HomeSection.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Zap, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export function HomeSection() {
  // Fetch summary stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [workflows, projects, recentErrors] = await Promise.all([
        supabase.from('n8n_workflows').select('active, status, success_count_7d, error_count_7d, last_success_at, last_error_at'),
        supabase.from('claude_projects').select('status'),
        supabase.from('n8n_workflows')
          .select('name, n8n_id, last_error_at')
          .not('last_error_at', 'is', null)
          .order('last_error_at', { ascending: false })
          .limit(5)
      ]);

      const activeWorkflows = workflows.data?.filter(w => w.active && w.status !== 'deleted') || [];
      const totalSuccess = activeWorkflows.reduce((sum, w) => sum + (w.success_count_7d || 0), 0);
      const totalErrors = activeWorkflows.reduce((sum, w) => sum + (w.error_count_7d || 0), 0);

      return {
        activeWorkflows: activeWorkflows.length,
        totalWorkflows: workflows.data?.length || 0,
        successRate: totalSuccess > 0 ? Math.round((totalSuccess / (totalSuccess + totalErrors)) * 100) : 0,
        successCount: totalSuccess,
        errorCount: totalErrors,
        activeProjects: projects.data?.filter(p => p.status === 'active').length || 0,
        recentErrors: recentErrors.data || []
      };
    }
  });

  // Fetch recent workflow activity
  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('n8n_workflows')
        .select('name, n8n_id, last_success_at, last_error_at, active')
        .or('last_success_at.not.is.null,last_error_at.not.is.null')
        .order('last_success_at', { ascending: false, nullsFirst: false })
        .limit(10);
      return data || [];
    }
  });

  return (
    <div className="space-y-6">
      {/* Header with greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <a
          href="https://n8n.l7-partners.com"
          target="_blank"
          className="px-4 py-2 bg-orange-600/20 text-orange-400 rounded-lg hover:bg-orange-600/30 transition"
        >
          Open n8n
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          title="Active Workflows"
          value={stats?.activeWorkflows || 0}
          subtitle={`of ${stats?.totalWorkflows || 0} total`}
          icon={<Zap className="w-5 h-5 text-orange-400" />}
          color="orange"
        />
        <StatsCard
          title="Success Rate (7d)"
          value={`${stats?.successRate || 0}%`}
          subtitle={`${stats?.successCount || 0} successful runs`}
          icon={<CheckCircle className="w-5 h-5 text-green-400" />}
          color="green"
        />
        <StatsCard
          title="Errors (7d)"
          value={stats?.errorCount || 0}
          subtitle="failed executions"
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          color={stats?.errorCount > 0 ? "red" : "gray"}
        />
        <StatsCard
          title="Active Projects"
          value={stats?.activeProjects || 0}
          subtitle="in development"
          icon={<Activity className="w-5 h-5 text-blue-400" />}
          color="blue"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivity?.map((workflow) => (
                <a
                  key={workflow.n8n_id}
                  href={`https://n8n.l7-partners.com/workflow/${workflow.n8n_id}/executions`}
                  target="_blank"
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      workflow.last_error_at &&
                      (!workflow.last_success_at || new Date(workflow.last_error_at) > new Date(workflow.last_success_at))
                        ? 'bg-red-500'
                        : 'bg-green-500'
                    }`} />
                    <span className="text-sm text-white truncate max-w-[200px]">
                      {workflow.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(workflow.last_success_at || workflow.last_error_at)}
                  </span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Recent Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentErrors?.length > 0 ? (
              <div className="space-y-2">
                {stats.recentErrors.map((workflow) => (
                  <a
                    key={workflow.n8n_id}
                    href={`https://n8n.l7-partners.com/workflow/${workflow.n8n_id}/executions`}
                    target="_blank"
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50 transition"
                  >
                    <span className="text-sm text-white truncate max-w-[200px]">
                      {workflow.name}
                    </span>
                    <span className="text-xs text-red-400">
                      {formatTimeAgo(workflow.last_error_at)}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm py-4 text-center">
                No recent errors
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <QuickActionButton
              href="https://n8n.l7-partners.com/workflows"
              label="View All Workflows"
              color="orange"
            />
            <QuickActionButton
              href="https://n8n.l7-partners.com/workflow/new"
              label="Create Workflow"
              color="green"
            />
            <QuickActionButton
              href="https://supabase.com/dashboard/project/donnmhbwhpjlmpnwgdqr"
              label="Supabase Dashboard"
              color="emerald"
            />
            <QuickActionButton
              href="https://github.com/jefflitt1/claude-hub"
              label="GitHub Repo"
              color="purple"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ title, value, subtitle, icon, color }) {
  const colorClasses = {
    orange: 'bg-orange-600/10 border-orange-600/20',
    green: 'bg-green-600/10 border-green-600/20',
    red: 'bg-red-600/10 border-red-600/20',
    blue: 'bg-blue-600/10 border-blue-600/20',
    gray: 'bg-gray-600/10 border-gray-600/20',
  };

  return (
    <Card className={`${colorClasses[color]} border`}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionButton({ href, label, color }) {
  const colorClasses = {
    orange: 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/30',
    green: 'bg-green-600/20 text-green-400 hover:bg-green-600/30',
    emerald: 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30',
    purple: 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30',
  };

  return (
    <a
      href={href}
      target="_blank"
      className={`px-4 py-2 rounded-lg text-sm transition ${colorClasses[color]}`}
    >
      {label}
    </a>
  );
}

function formatTimeAgo(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
```

## 2. Update Sidebar Navigation

Add "Home" as the first item in the sidebar:

```jsx
// In Sidebar.tsx, add Home as first nav item:
const navItems = [
  { name: 'Home', icon: Home, path: '/', section: 'home' },
  { name: 'Workflows', icon: Zap, path: '/workflows', section: 'workflows' },
  { name: 'Projects', icon: FolderKanban, path: '/projects', section: 'projects' },
  // ... rest of nav items
];
```

## 3. Update Routes

```jsx
// In App.tsx or router config:
<Route path="/" element={<HomeSection />} />
<Route path="/home" element={<Navigate to="/" replace />} />
```

## 4. Optional: System Health Widget

If `system_health_checks` table exists, add this widget:

```jsx
// Add to HomeSection.tsx
const { data: healthStatus } = useQuery({
  queryKey: ['system-health'],
  queryFn: async () => {
    const { data } = await supabase
      .from('system_health_checks')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(5);
    return data || [];
  }
});

// Render health indicators
<Card className="bg-gray-800/50 border-gray-700">
  <CardHeader className="pb-2">
    <CardTitle className="text-lg">System Health</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex gap-4">
      {healthStatus?.map((check) => (
        <div key={check.id} className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            check.status === 'healthy' ? 'bg-green-500' :
            check.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="text-sm text-gray-300">{check.service}</span>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

---

## Implementation Steps

1. Create the `HomeSection.tsx` component
2. Add Home to sidebar navigation as first item
3. Update router to use HomeSection at `/`
4. Test data fetching from Supabase
5. Style adjustments as needed

Copy this prompt to Lovable to implement the Home section.
