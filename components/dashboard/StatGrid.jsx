"use client";

// ============================================================================
// STAT GRID — Row of KPI cards
// ============================================================================

export default function StatGrid({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
      {stats.map((s, i) => (
        <div key={i} className="bg-white rounded-lg p-4 border border-gray-200 flex items-center gap-3.5 hover:shadow-sm transition-shadow">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${
            s.cls === "brand" ? "bg-brand-50 text-brand-600" :
            s.cls === "green" ? "bg-success-50 text-success-600" :
            s.cls === "amber" ? "bg-warning-50 text-warning-600" :
            s.cls === "red" ? "bg-danger-50 text-danger-600" :
            "bg-info-50 text-info-600"
          }`}>
            {s.icon}
          </div>
          <div>
            <div className="text-2xl font-extrabold text-gray-900 leading-tight">{s.value}</div>
            <div className="text-[11px] text-gray-400 font-medium mt-0.5">{s.label}</div>
            {s.delta && (
              <span className={`text-[11px] font-semibold ${s.dir === "up" ? "text-success-600" : s.dir === "down" ? "text-danger-600" : "text-gray-400"}`}>
                {s.delta}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
