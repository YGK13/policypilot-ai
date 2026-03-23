"use client";

// ============================================================================
// BAR CHART — CSS-based vertical bar chart
// ============================================================================

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

export default function BarChart({ title, data }) {
  const maxVal = data.length ? Math.max(...data.map(([, v]) => v)) : 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      <div className="p-5">
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Send some messages to see data</div>
        ) : (
          <div className="bar-chart">
            {data.map(([label, value], i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div className="text-[10px] font-bold text-gray-700">{value}</div>
                <div
                  className="w-full rounded-t transition-all duration-500"
                  style={{
                    height: `${(value / maxVal) * 100}%`,
                    background: COLORS[i % COLORS.length],
                    minHeight: "3px",
                  }}
                />
                <div className="text-[9px] text-gray-400 whitespace-nowrap">{label.split(" ")[0]}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
