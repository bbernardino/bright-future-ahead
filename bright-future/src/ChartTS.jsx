import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function ChartTS({ values = [], years = [], title = 'Series', color = '#4f46e5', yLabel = '' }) {
  const vals = values.map(v => (v == null ? null : v));
  const data = {
    labels: years,
    datasets: [
      {
        label: title,
        data: vals,
        borderColor: color,
        backgroundColor: color,
        spanGaps: true,
        tension: 0.2,
      },
    ],
  };

  // compute OLS trend line if enough points
  const pts = vals.map((v, i) => ({ x: years[i], y: v })).filter(p => p.y != null && Number.isFinite(p.y));
  if (pts.length >= 2) {
    const n = pts.length;
    const xmean = pts.reduce((s,p)=>s+p.x,0)/n;
    const ymean = pts.reduce((s,p)=>s+p.y,0)/n;
    let Sxx = 0, Sxy = 0;
    for (const p of pts) { const dx = p.x - xmean; Sxx += dx*dx; Sxy += dx*(p.y-ymean); }
    const slope = Sxy / Sxx;
    const intercept = ymean - slope * xmean;
    const trendData = years.map(y => (Number.isFinite(y) ? (intercept + slope * y) : null));
    data.datasets.push({ label: 'Trend', data: trendData, borderColor: '#e11d48', borderDash: [6,4], pointRadius: 0, tension: 0 });
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          title: (items) => {
            const it = items && items[0];
            return it && it.label ? `Year: ${it.label}` : '';
          },
          label: (item) => {
            const v = item.raw;
            return `${item.dataset.label}: ${v == null ? 'n/a' : (Number(v).toFixed(2))}`;
          }
        }
      }
    },
    scales: {
      x: { title: { display: true, text: 'Year' } },
      y: { title: { display: !!yLabel, text: yLabel } }
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 720 }}>
      <Line data={data} options={options} height={200} />
    </div>
  );
}
