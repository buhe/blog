import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function PeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#c0c0c0', border: '1px solid #000', padding: '6px 10px', fontSize: 13, fontFamily: 'Tahoma, Verdana, sans-serif', boxShadow: '2px 2px 0 rgba(0,0,0,.4)' }}>
      <b>{d.year}</b>&nbsp;&nbsp;PE ≈ {d.pe}
      {d.official && <span style={{ marginLeft: 6, fontSize: 11, background: '#000080', color: '#fff', padding: '2px 6px' }}>官方 TTM</span>}
      <div style={{ color: '#404040', fontSize: 12 }}>{d.note}</div>
    </div>
  );
}

export default function KwebPeChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 16, right: 24, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#808080" />
        <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#000', fontFamily: 'Courier New, monospace' }} />
        <YAxis domain={[8, 38]} tick={{ fontSize: 12, fill: '#000', fontFamily: 'Courier New, monospace' }} label={{ value: 'PE（倍）', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#000' }} />
        <Tooltip content={<PeTooltip />} />
        <Legend />
        <Line type="monotone" dataKey="pe" name="加权 PE（倍）" stroke="#000080" strokeWidth={2} dot={{ r: 4, fill: '#000080' }} activeDot={{ r: 6, fill: '#cc0000' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
