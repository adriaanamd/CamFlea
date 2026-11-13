import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import type { CSSProperties, ComponentProps, ReactNode } from "react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AdminDistribution } from "@/features/admin/admin-dashboard-data";

export type AdminChartKind = "bar" | "column" | "donut" | "area";
export type AdminChartLabelKind =
  "default" | "listing-status" | "price-type" | "transaction-status" | "month";

const chartPalette = [
  "var(--cf-green)",
  "#1f8a70",
  "#d97706",
  "#2563eb",
  "#b45309",
  "#7c3aed",
];

const chartDomains: Partial<Record<AdminChartKind, string[]>> = {
  column: [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "New",
    "Like new",
    "Good",
    "Fair",
    "Under ₱500",
    "₱500–₱1,499",
    "₱1,500–₱2,999",
    "₱3,000+",
    "Price hidden",
  ],
};

function sortChartValues(values: AdminDistribution[], kind: AdminChartKind) {
  const domain = chartDomains[kind];

  if (kind === "area") {
    return [...values].sort((left, right) => left.label.localeCompare(right.label));
  }

  if (!domain) return values;

  const order = new Map(domain.map((label, index) => [label.toLowerCase(), index]));
  return [...values].sort((left, right) => {
    const leftIndex = order.get(left.label.toLowerCase()) ?? domain.length;
    const rightIndex = order.get(right.label.toLowerCase()) ?? domain.length;
    return leftIndex - rightIndex;
  });
}

function formatMonthLabel(value: string) {
  const date = new Date(`${value}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    date,
  );
}

const categoryLabelMaps: Partial<Record<AdminChartLabelKind, Record<string, string>>> = {
  "listing-status": {
    available: "Available",
    reserved: "Reserved",
    sold: "Sold",
  },
  "price-type": {
    single: "One price",
    range: "Price range",
    hidden: "Discuss price",
  },
  "transaction-status": {
    pending: "Pending",
    accepted: "Accepted",
    completed: "Completed",
    cancelled: "Cancelled",
    canceled: "Cancelled",
  },
};

function formatCategoryLabel(label: string, labelKind: AdminChartLabelKind) {
  if (labelKind === "month") return formatMonthLabel(label);

  return categoryLabelMaps[labelKind]?.[label.trim().toLowerCase()] ?? label;
}

type ChartTooltipLabelFormatter = NonNullable<
  ComponentProps<typeof ChartTooltipContent>["labelFormatter"]
>;

const formatTooltipCategory: ChartTooltipLabelFormatter = (_value, payload) => {
  const category = payload?.[0]?.payload?.label;
  return typeof category === "string" ? category : null;
};

function chartConfig(valueLabel: string): ChartConfig {
  return {
    count: {
      label: valueLabel,
      color: "var(--cf-green)",
    },
  };
}

function chartColor(index: number) {
  return chartPalette[index % chartPalette.length] ?? "var(--cf-green)";
}

function chartMax(values: AdminDistribution[]) {
  return Math.max(1, ...values.map((value) => value.count));
}

function renderBarTooltip(value: AdminDistribution): ReactNode {
  return (
    <span className="admin-chart-bar-tooltip" role="tooltip">
      <span className="admin-chart-bar-tooltip-label">{value.label}</span>
      <strong className="admin-chart-bar-tooltip-value">{value.count}</strong>
    </span>
  );
}

function renderHorizontalBars(values: AdminDistribution[]): ReactNode {
  const maximum = chartMax(values);

  return (
    <div className="admin-horizontal-bars" role="list">
      {values.map((value, index) => {
        const color = chartColor(index);

        return (
          <div className="admin-horizontal-bar-row" key={value.label} role="listitem">
            <div className="admin-horizontal-bar-meta">
              <span className="admin-horizontal-bar-label">{value.label}</span>
            </div>
            <div className="admin-horizontal-bar-track">
              <span
                className="admin-chart-bar-interaction"
                role="img"
                tabIndex={0}
                aria-label={`${value.label}: ${value.count}`}
                title={`${value.label}: ${value.count}`}
              >
                <span
                  className="admin-horizontal-bar-fill"
                  data-chart-color={color}
                  style={
                    {
                      width: `${(value.count / maximum) * 100}%`,
                      "--chart-bar-color": color,
                    } as CSSProperties
                  }
                />
                {renderBarTooltip(value)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderColumnBars(values: AdminDistribution[]): ReactNode {
  const maximum = chartMax(values);

  return (
    <div className="admin-column-bars" role="list">
      {values.map((value, index) => {
        const color = chartColor(index);
        const percentage = (value.count / maximum) * 100;

        return (
          <div className="admin-column-bar-item" key={value.label} role="listitem">
            <div className="admin-column-bar-plot">
              <div className="admin-column-bar-track">
                <span
                  className="admin-chart-bar-interaction"
                  role="img"
                  tabIndex={0}
                  aria-label={`${value.label}: ${value.count}`}
                  title={`${value.label}: ${value.count}`}
                >
                  <span
                    className="admin-column-bar-fill"
                    data-chart-color={color}
                    style={
                      {
                        height: `${percentage}%`,
                        "--chart-bar-color": color,
                      } as CSSProperties
                    }
                  />
                  {renderBarTooltip(value)}
                </span>
              </div>
            </div>
            <span className="admin-column-bar-label">{value.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function renderDonutChart(values: AdminDistribution[]): ReactNode {
  return (
    <PieChart>
      <ChartTooltip content={<ChartTooltipContent labelFormatter={formatTooltipCategory} />} />
      <Pie
        data={values}
        dataKey="count"
        nameKey="label"
        innerRadius={52}
        outerRadius={78}
        paddingAngle={3}
        stroke="var(--cf-surface)"
        strokeWidth={3}
        isAnimationActive={false}
      >
        {values.map((value, index) => (
          <Cell key={value.label} fill={chartColor(index)} />
        ))}
      </Pie>
      <Legend verticalAlign="bottom" height={34} iconType="circle" />
    </PieChart>
  );
}

function renderAreaChart(
  values: AdminDistribution[],
  categoryLabel: string,
  valueLabel: string,
): ReactNode {
  return (
    <AreaChart data={values} margin={{ top: 8, right: 16, bottom: 34, left: 24 }}>
      <defs>
        <linearGradient id="admin-listing-trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="var(--cf-green)" stopOpacity={0.35} />
          <stop offset="95%" stopColor="var(--cf-green)" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis
        dataKey="label"
        tickFormatter={(value) => formatMonthLabel(String(value))}
        axisLine={false}
        tickLine={false}
        label={{ value: categoryLabel, position: "insideBottom", offset: -18 }}
      />
      <YAxis
        allowDecimals={false}
        axisLine={false}
        tickLine={false}
        label={{ value: valueLabel, angle: -90, position: "insideLeft", offset: 8 }}
      />
      <ChartTooltip content={<ChartTooltipContent labelFormatter={formatTooltipCategory} />} />
      <Area
        type="monotone"
        dataKey="count"
        stroke="var(--cf-green)"
        strokeWidth={2.5}
        fill="url(#admin-listing-trend-fill)"
        isAnimationActive={false}
      />
    </AreaChart>
  );
}

export function AdminAnalyticsChart({
  title,
  values,
  kind,
  valueLabel,
  categoryLabel,
  labelKind = "default",
}: {
  title: string;
  values: AdminDistribution[];
  kind: AdminChartKind;
  valueLabel: string;
  categoryLabel: string;
  labelKind?: AdminChartLabelKind;
}) {
  const chartValues = sortChartValues(values, kind).map((value) => ({
    ...value,
    label: formatCategoryLabel(value.label, labelKind),
  }));

  return (
    <div
      className={`admin-chart-frame admin-chart-frame-${kind}`}
      role="img"
      aria-label={`${title} chart showing ${valueLabel.toLowerCase()} by ${categoryLabel.toLowerCase()}`}
    >
      {chartValues.length ? (
        kind === "bar" ? (
          renderHorizontalBars(chartValues)
        ) : kind === "column" ? (
          renderColumnBars(chartValues)
        ) : (
          <ChartContainer
            config={chartConfig(valueLabel)}
            className={`admin-chart-container admin-chart-${kind}`}
          >
            {kind === "donut"
              ? renderDonutChart(chartValues)
              : renderAreaChart(chartValues, categoryLabel, valueLabel)}
          </ChartContainer>
        )
      ) : (
        <p className="muted-copy">No data yet.</p>
      )}
      <ul className="sr-only" aria-label={`${title} data`}>
        {chartValues.length ? (
          chartValues.map((value) => (
            <li key={value.label}>
              {value.label}: {value.count}
            </li>
          ))
        ) : (
          <li>No data yet.</li>
        )}
      </ul>
    </div>
  );
}
