# Home Section Adjustments

**Purpose:** Handle empty stats state and add manual sync trigger.

## Issue
The `n8n_workflows` table has `success_count_7d`, `error_count_7d`, `last_success_at`, `last_error_at` columns but they're currently all zeros/null until the sync workflow runs.

## Adjustments Needed

### 1. Empty State Handling

In `HomeSection.tsx`, add a check for when stats haven't been populated:

```jsx
// After the stats query, check if data exists
const hasExecutionData = stats?.successCount > 0 || stats?.errorCount > 0 ||
  recentActivity?.some(w => w.last_success_at || w.last_error_at);

// In the render, show info banner if no data
{!hasExecutionData && (
  <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-6">
    <p className="text-blue-400 text-sm">
      Execution stats are synced daily at 6am. Click "Sync Now" to populate immediately.
    </p>
  </div>
)}
```

### 2. Add Sync Now Button

Add a button to manually trigger the sync workflow:

```jsx
// In the header section, next to "Open n8n" button
<button
  onClick={async () => {
    try {
      await fetch('https://n8n.l7-partners.com/webhook/sync-execution-stats');
      // Refetch stats after sync
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['recent-activity']);
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }}
  className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition"
>
  Sync Stats
</button>
```

### 3. Handle Null Timestamps in Recent Activity

The current query filters for non-null timestamps, but if ALL are null, show a message:

```jsx
{recentActivity?.length === 0 && (
  <p className="text-gray-500 text-sm py-4 text-center">
    No recent activity yet. Run workflows to see activity here.
  </p>
)}
```

### 4. Alternative: Use n8n Executions API Directly

If you want real-time stats without waiting for sync, query n8n directly:

```jsx
// This is optional - the sync approach is simpler
const { data: liveStats } = useQuery({
  queryKey: ['live-execution-stats'],
  queryFn: async () => {
    const res = await fetch('https://n8n.l7-partners.com/api/v1/executions?limit=100', {
      headers: { 'X-N8N-API-KEY': 'YOUR_API_KEY' }
    });
    const data = await res.json();
    // Calculate stats from live data
    return calculateStats(data);
  },
  refetchInterval: 60000 // Refresh every minute
});
```

---

## Quick Summary

1. Add empty state banner with "Sync Now" explanation
2. Add "Sync Stats" button that calls the webhook
3. Handle empty recent activity gracefully

The webhook URL for manual sync: `https://n8n.l7-partners.com/webhook/sync-execution-stats`

(Note: The webhook needs to be added to the n8n workflow - currently only has schedule trigger)
