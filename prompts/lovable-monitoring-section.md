# Lovable Prompt: Monitoring Section for Claude Hub Dashboard

## Prompt

Add a new **Infrastructure Monitoring** section to the Claude Hub dashboard. This section shows real-time system health from two Supabase tables that are synced from Beszel (system metrics) and Uptime Kuma (HTTP endpoint monitoring).

### New Supabase Tables

**`beszel_systems`** - Server hardware metrics (2 rows: Mac Studio, Raspberry Pi)
```
id: text (PK) - e.g. "f76lb0zqd68qkpi"
name: text - e.g. "Mac Studio"
host: text - IP address
status: text - "up" or "down"
cpu_percent: numeric
memory_percent: numeric
disk_percent: numeric
cpu_threads: int
uptime_seconds: bigint
agent_version: text
info: jsonb - raw metrics blob
updated_at: timestamptz
```

**`uptime_kuma_monitors`** - HTTP endpoint uptime (10 rows)
```
id: int (PK) - Kuma monitor ID
name: text - e.g. "n8n", "Claude Hub"
status: smallint - 1=up, 0=down
ping_ms: int - latency in ms
uptime_24h: numeric(6,4) - 0.0000 to 1.0000
last_message: text - error message if down
group_name: text - always "Services"
is_paused: boolean
updated_at: timestamptz
```

### Component Requirements

Create `src/components/sections/MonitoringSection.tsx` with these sections:

**1. Summary Stats Row (4 cards matching HomeSection pattern)**
- **Systems** - Count of up/total Beszel systems with green/red indicator
- **Endpoints** - Count of up/total Kuma monitors
- **Avg Uptime** - Average `uptime_24h` across all monitors, formatted as percentage
- **Avg Latency** - Average `ping_ms` across all up monitors, formatted as "Xms"

Use the same StatsCard styling as HomeSection: `bg-[#161b22] border border-[#30363d] rounded-lg` with colored accent icons.

**2. Two-Column Layout Below Stats**

**Left Column: System Health (from `beszel_systems`)**
- Card with header "System Health" and Server icon
- For each system, show:
  - Name with up/down badge
  - Three horizontal progress bars: CPU%, Memory%, Disk%
  - Color coding: green <60%, yellow 60-80%, red >80%
  - Uptime formatted as days/hours
  - Last updated timestamp (relative, e.g. "2m ago")

**Right Column: Endpoint Status (from `uptime_kuma_monitors`)**
- Card with header "Endpoint Status" and Globe icon
- List of monitors sorted by status (down first, then by name)
- Each row shows: status dot (green/red/gray for paused), name, uptime %, ping ms
- Paused monitors shown with gray dot and "Paused" badge
- Down monitors highlighted with red background tint

**3. Quick Links Row**
- "Open Beszel" → https://beszel.l7-partners.com (external link)
- "Open Uptime Kuma" → https://kuma.l7-partners.com (external link)
- "Status Page" → https://status.l7-partners.com (external link)

### Data Fetching

Use `@tanstack/react-query` with `useQuery` matching the existing pattern:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['monitoring-beszel'],
  queryFn: async () => {
    const { data } = await supabase.from('beszel_systems').select('*');
    return data || [];
  },
  refetchInterval: 30000 // 30 seconds
});
```

Two separate queries: one for `beszel_systems`, one for `uptime_kuma_monitors`.

### Integration

Add the MonitoringSection to `ClaudeCatalog.tsx`:
1. Import MonitoringSection
2. Add it to the HomeSection area (show it on the home view, below the existing HomeSection content)
3. Or add as a new sidebar nav item called "Infrastructure" with a `Server` icon

Use the existing GitHub dark theme colors from the codebase:
- Background: `#0d1117`
- Card bg: `#161b22`
- Border: `#30363d`
- Text primary: `#f0f6fc`
- Text secondary: `#8b949e`
- Green: `#3fb950`
- Red: `#f85149`
- Yellow: `#d29922`
- Blue: `#58a6ff`

### Props Interface
```typescript
interface MonitoringSectionProps {
  onNavigate?: (section: string) => void;
}
```

Match the same prop pattern as HomeSection for consistency.

### Supabase Types

You will need to add the new tables to the Supabase types. If the types file doesn't auto-generate, add these interfaces:

```typescript
interface BeszelSystem {
  id: string;
  name: string;
  host: string;
  port: string;
  status: string;
  cpu_percent: number | null;
  memory_percent: number | null;
  disk_percent: number | null;
  cpu_threads: number | null;
  uptime_seconds: number | null;
  agent_version: string | null;
  info: Record<string, any>;
  beszel_created_at: string | null;
  beszel_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UptimeKumaMonitor {
  id: number;
  name: string;
  type: string;
  group_name: string;
  status: number;
  ping_ms: number | null;
  uptime_24h: number | null;
  last_message: string | null;
  last_heartbeat_at: string | null;
  is_paused: boolean;
  created_at: string;
  updated_at: string;
}
```
