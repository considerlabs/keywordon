export interface SparklinePoint {
  label: string;
  value: number;
}

/** Truncates a Date down to the start of its hour (minutes/seconds/ms zeroed). */
export function truncateToHour(date: Date): Date {
  const truncated = new Date(date);
  truncated.setMinutes(0, 0, 0);
  return truncated;
}

/** Builds SVG polyline points for a simple sparkline (lower rank = higher on chart). */
export function buildSparklinePolyline(
  points: SparklinePoint[],
  width: number,
  height: number,
  padding = 4,
): string {
  if (points.length === 0) return "";

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  return points
    .map((point, index) => {
      const x = padding + (index / Math.max(points.length - 1, 1)) * innerW;
      const normalized = (point.value - min) / range;
      const y = padding + normalized * innerH;
      return `${x},${y}`;
    })
    .join(" ");
}

/** Converts hourly rank snapshots to sparkline points (most recent last). */
export function rankHistoryToSparkline(
  rows: Array<{ bucketHour: Date | string; rank: number | null }>,
): SparklinePoint[] {
  return rows
    .filter((row) => row.rank != null)
    .map((row) => ({
      label:
        row.bucketHour instanceof Date
          ? row.bucketHour.toISOString()
          : String(row.bucketHour),
      value: row.rank as number,
    }));
}
