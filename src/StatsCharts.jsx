import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const STATUS_COLORS = {
  good:    '#00a950',
  bad:     '#f67019',
  fail:    '#f53794',
  unknown: '#537bc4',
};
const CAT_COLORS = ['#4dc9f6','#acc236','#166a8f','#58595b','#e8c534','#9b59b6','#e74c3c','#1abc9c'];

function LineChart({ labels, datasets, showLegendValues }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const serialized = JSON.stringify({ labels, datasets });

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
        elements: { point: { radius: 2 } },
        plugins: showLegendValues ? {
          legend: {
            labels: {
              generateLabels: (chart) =>
                chart.data.datasets.map((ds, i) => {
                  const last = ds.data[ds.data.length - 1] ?? '';
                  return {
                    text: `${ds.label} (${last})`,
                    fillStyle: ds.borderColor,
                    strokeStyle: ds.borderColor,
                    lineWidth: 2,
                    hidden: !chart.isDatasetVisible(i),
                    datasetIndex: i,
                  };
                }),
            },
          },
        } : {},
      },
    });
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [serialized]); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={canvasRef} />;
}

export function StatsCharts({ distro, release, arch }) {
  const [period, setPeriod] = useState('365');
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ limit: 10000 });
    if (distro)  params.set('distribution', distro);
    if (release) params.set('release', release);
    if (arch)    params.set('architecture', arch);
    if (period) {
      const since = new Date(Date.now() - Number(period) * 86400 * 1000).toISOString().slice(0, 19);
      params.set('since', since);
    }

    fetch('/api/v1/stats?' + params)
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(all => {
        all.sort((a, b) => a.captured_at.localeCompare(b.captured_at));
        const grouped = {};
        for (const s of all) {
          const key = [s.distribution, s.release, s.architecture].filter(Boolean).join(' / ');
          (grouped[key] = grouped[key] || []).push(s);
        }
        setGroups(grouped);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [distro, release, arch, period]);

  return (
    <section className="section" style={{ paddingTop: '1.5rem', paddingBottom: '1rem' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <div className="field is-horizontal">
            <div className="field-label is-normal">
              <label className="label">Period</label>
            </div>
            <div className="field-body">
              <div className="field">
                <div className="control">
                  <div className="select">
                    <select value={period} onChange={e => setPeriod(e.target.value)}>
                      <option value="7">1 week</option>
                      <option value="30">1 month</option>
                      <option value="365">1 year</option>
                      <option value="">full</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading && <p className="has-text-centered">Loading charts…</p>}
        {error   && <p className="has-text-centered has-text-danger">Failed to load stats.</p>}
        {!loading && !error && Object.keys(groups).length === 0 && (
          <p className="has-text-centered has-text-grey">No stats data available for this period.</p>
        )}

        {!loading && !error && Object.entries(groups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([groupKey, snapshots]) => {
            const labels = snapshots.map(s => s.captured_at.slice(0, 10));

            const statusDatasets = ['good', 'bad', 'fail', 'unknown'].map(status => ({
              label: status,
              data: snapshots.map(s => s[status] || 0),
              borderColor: STATUS_COLORS[status],
              backgroundColor: STATUS_COLORS[status] + '33',
              fill: false,
            }));

            const catNames = [...new Set(snapshots.flatMap(s => (s.categories || []).map(c => c.category)))];
            const catDatasets = catNames.map((cat, i) => ({
              label: cat,
              data: snapshots.map(s => {
                const c = (s.categories || []).find(c => c.category === cat);
                return c ? c.count : 0;
              }),
              borderColor: CAT_COLORS[i % CAT_COLORS.length],
              backgroundColor: CAT_COLORS[i % CAT_COLORS.length] + '33',
              fill: false,
            }));

            return (
              <div key={groupKey} className="box" style={{ marginBottom: '1.5rem' }}>
                <div className="columns">
                  <div className="column">
                    <p className="heading">Status over time</p>
                    <LineChart labels={labels} datasets={statusDatasets} />
                  </div>
                  {catDatasets.length > 0 && (
                    <div className="column">
                      <p className="heading">Failure categories over time</p>
                      <LineChart labels={labels} datasets={catDatasets} showLegendValues />
                      <p style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.5rem' }}>
                        ⓘ Category counts are per binary package — a single build that produces multiple unreproducible binaries is counted once in the BAD total but for every binary here. The purpose is to count the reasons why individual binaries fail.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        }
      </div>
    </section>
  );
}
