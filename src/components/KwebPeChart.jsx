import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function PeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
      <b>{d.year}</b>&nbsp;&nbsp;PE ≈ {d.pe}
      {d.official && <span style={{ marginLeft: 6, fontSize: 11, background: '#d97706', color: '#fff', borderRadius: 99, padding: '2px 8px' }}>官方 TTM</span>}
      <div style={{ color: '#6b7280', fontSize: 12 }}>{d.note}</div>
    </div>
  );
}

export default function KwebPeChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 16, right: 24, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis domain={[8, 38]} tick={{ fontSize: 12, fill: '#6b7280' }} label={{ value: 'PE（倍）', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#6b7280' }} />
        <Tooltip content={<PeTooltip />} />
        <Legend />
        <Line type="monotone" dataKey="pe" name="加权 PE（倍）" stroke="#2563eb" strokeWidth={2} dot={{ r: 5, fill: '#2563eb' }} activeDot={{ r: 7 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
