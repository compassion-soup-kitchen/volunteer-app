"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useReducedMotion } from "motion/react";
import type { MonthlyTrend } from "@/lib/report-actions";

const numberFormat = new Intl.NumberFormat("en-NZ", { maximumFractionDigits: 1 });

/** One measure the chart draws, with the words a reader needs for it. */
interface Measure {
  key: "hours" | "uniqueVolunteers";
  title: string;
  /** The y-axis title's unit. */
  axisUnit: string;
  /** The unit, as the tooltip and the summary say it after a number. */
  unit: (value: number) => string;
  allowDecimals: boolean;
}

const MEASURES: Measure[] = [
  {
    key: "hours",
    title: "Hours given",
    axisUnit: "hours",
    unit: () => "h",
    allowDecimals: true,
  },
  {
    key: "uniqueVolunteers",
    title: "Volunteers who came",
    axisUnit: "people",
    unit: (value) => (value === 1 ? " person" : " people"),
    allowDecimals: false,
  },
];

function formatValue(measure: Measure, value: number): string {
  return `${numberFormat.format(value)}${measure.unit(value)}`;
}

/**
 * What a screen reader hears in place of the lines: the range covered, and
 * each measure's low, high and latest month - the shape a sighted reader takes
 * from the chart at a glance.
 */
export function summarizeTrends(data: MonthlyTrend[]): string {
  if (data.length === 0) return "No months to show.";
  const first = data[0];
  const last = data[data.length - 1];
  const span =
    data.length === 1 ? first.label : `${first.label} to ${last.label}`;
  const parts = MEASURES.map((measure) => {
    let low = first;
    let high = first;
    for (const month of data) {
      if (month[measure.key] < low[measure.key]) low = month;
      if (month[measure.key] > high[measure.key]) high = month;
    }
    const format = (month: MonthlyTrend) =>
      `${formatValue(measure, month[measure.key])} in ${month.label}`;
    return data.length === 1
      ? `${measure.title}: ${format(last)}.`
      : `${measure.title}: lowest ${format(low)}, highest ${format(high)}, latest ${format(last)}.`;
  });
  return [`Monthly trends, ${span}.`, ...parts].join(" ");
}

const TICK = { fontSize: 12, fill: "var(--muted-foreground)" };

/**
 * Hours and volunteers per month as two small charts stacked on one month
 * axis. They're different measures on very different scales - forty hours,
 * five people - so sharing a y-axis flattened the volunteers line, and a
 * second axis would invite reading the crossing of two unrelated lines as
 * meaningful. Hovering either chart moves the crosshair on both.
 */
export function TrendsChart({ data }: { data: MonthlyTrend[] }) {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <figure className="flex h-full min-h-72 flex-col">
      <div role="img" aria-label={summarizeTrends(data)} className="flex flex-1 flex-col gap-4">
        {MEASURES.map((measure, index) => {
          const isLast = index === MEASURES.length - 1;
          return (
            <div key={measure.key} className="flex min-h-32 flex-1 flex-col">
              {/* The y-axis title, set level above the axis so it reads without tilting your head. */}
              <p aria-hidden className="mb-1 text-xs font-semibold text-muted-foreground">
                {measure.title}{" "}
                <span className="font-normal">({measure.axisUnit})</span>
              </p>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data}
                    syncId="monthly-trends"
                    margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={isLast ? TICK : false}
                      height={isLast ? 24 : 4}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={TICK}
                      width={36}
                      // Three ticks - nought, middle, top - suit a chart this
                      // short, and none may be dropped for crowding.
                      tickCount={3}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={measure.allowDecimals}
                      tickFormatter={(value: number) => numberFormat.format(value)}
                    />
                    <Tooltip
                      cursor={{ stroke: "var(--border)" }}
                      formatter={(value) => [
                        formatValue(measure, Number(value)),
                        measure.title,
                      ]}
                      separator=": "
                      itemStyle={{ color: "var(--popover-foreground)" }}
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        fontSize: 13,
                        color: "var(--popover-foreground)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={measure.key}
                      name={measure.title}
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "var(--chart-1)" }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={!reduceMotion}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
      <figcaption aria-hidden className="mt-1 text-center text-xs text-muted-foreground">
        Month
      </figcaption>
      <table className="sr-only">
        <caption>Monthly trends</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            {MEASURES.map((measure) => (
              <th key={measure.key} scope="col">
                {measure.title} ({measure.axisUnit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((month) => (
            <tr key={month.month}>
              <th scope="row">{month.label}</th>
              {MEASURES.map((measure) => (
                <td key={measure.key}>{numberFormat.format(month[measure.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
