interface Point {
  label: string;
  value: number;
}

interface Props {
  data: Point[];
  color?: string;
  valueFormatter?: (v: number) => string;
  height?: number;
}

function niceMax(raw: number) {
  if (raw <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / exp;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * exp;
}

function shortValue(v: number, formatter?: (v: number) => string) {
  if (formatter) return formatter(v);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(v * 100) / 100);
}

/** Vertical bar chart with Y-axis, hover values, and readable labels */
export function BarChart({
  data,
  color = "var(--primary)",
  valueFormatter,
  height = 220,
}: Props) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-border bg-surface/60 text-sm text-muted"
        style={{ height }}
      >
        No data for this period
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const yMax = niceMax(maxValue);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => yMax * t);
  const hasAny = maxValue > 0;

  return (
    <div className="w-full">
      <div className="flex gap-3" style={{ height }}>
        {/* Y-axis */}
        <div className="relative flex w-10 shrink-0 flex-col justify-between pb-7 pt-1 text-right">
          {[...ticks].reverse().map((t, i) => (
            <span key={i} className="text-[10px] leading-none text-muted">
              {shortValue(t, valueFormatter)}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div className="relative min-w-0 flex-1">
          {/* Grid lines */}
          <div className="pointer-events-none absolute inset-x-0 top-1 bottom-7 flex flex-col justify-between">
            {ticks.map((_, i) => (
              <div key={i} className="border-t border-border/70" />
            ))}
          </div>

          <div className="absolute inset-x-0 top-1 bottom-7 flex items-end gap-1.5 sm:gap-2">
            {data.map((d, i) => {
              const pct = yMax > 0 ? (d.value / yMax) * 100 : 0;
              return (
                <div key={i} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden -translate-y-0 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg group-hover:block">
                    <div>{d.label}</div>
                    <div className="text-primary-muted">
                      {valueFormatter ? valueFormatter(d.value) : d.value}
                    </div>
                  </div>

                  <div
                    className="w-full max-w-[42px] rounded-t-md transition-all duration-300 group-hover:opacity-90"
                    style={{
                      height: hasAny ? `${Math.max(pct, d.value > 0 ? 3 : 0)}%` : "0%",
                      backgroundColor: color,
                      opacity: d.value > 0 ? 1 : 0.18,
                      minHeight: d.value > 0 ? 4 : 2,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* X labels */}
          <div className="absolute inset-x-0 bottom-0 flex h-7 items-start gap-1.5 sm:gap-2">
            {data.map((d, i) => {
              // For dense charts, show every nth label
              const step = data.length > 14 ? Math.ceil(data.length / 8) : data.length > 8 ? 2 : 1;
              const show = i % step === 0 || i === data.length - 1;
              return (
                <div key={i} className="min-w-0 flex-1 text-center">
                  {show ? (
                    <span className="block truncate text-[10px] text-muted">{d.label}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
