"use client";

// ============================================================================
// DONUT CHART — CSS conic-gradient donut
// ============================================================================

export default function DonutChart({ title, segments }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const pct = (v) => Math.round((v / total) * 100);

  // -- Build conic gradient stops --
  let gradientParts = [];
  let currentDeg = 0;
  segments.forEach((s) => {
    const deg = (s.value / total) * 360;
    gradientParts.push(`${s.color} ${currentDeg}deg ${currentDeg + deg}deg`);
    currentDeg += deg;
  });
  const gradient = `conic-gradient(${gradientParts.join(", ")})`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-center gap-6">
          <div className="w-[130px] h-[130px] rounded-full relative" style={{ background: gradient }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70px] h-[70px] rounded-full bg-white flex flex-col items-center justify-center">
              <div className="text-2xl font-extrabold text-gray-900">{total}</div>
              <div className="text-[10px] text-gray-400">Total</div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {segments.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                {s.label} ({pct(s.value)}%)
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
