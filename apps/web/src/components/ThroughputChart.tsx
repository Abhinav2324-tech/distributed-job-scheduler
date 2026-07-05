import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ThroughputPoint {
  bucket: string;
  completed: number;
  failed: number;
}

function formatHour(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString(undefined, { hour: "numeric" });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-[var(--text-primary)]">{label ? formatHour(label) : ""}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}: <span className="font-medium text-[var(--text-primary)]">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ThroughputChart({ data }: { data: ThroughputPoint[] }) {
  if (data.length === 0 || data.every((d) => d.completed === 0 && d.failed === 0)) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-[var(--text-secondary)]">
        No job activity in the last 12 hours yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--border-subtle)" strokeDasharray="0" />
        <XAxis
          dataKey="bucket"
          tickFormatter={formatHour}
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border-subtle)" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border-subtle)" }} />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
        />
        <Line
          type="monotone"
          dataKey="completed"
          name="Completed"
          stroke="var(--color-status-completed)"
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 2, stroke: "var(--surface)", fill: "var(--color-status-completed)" }}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
        />
        <Line
          type="monotone"
          dataKey="failed"
          name="Failed"
          stroke="var(--color-status-dead-letter)"
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 2, stroke: "var(--surface)", fill: "var(--color-status-dead-letter)" }}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
