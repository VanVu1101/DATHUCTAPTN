import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';

const SummaryCard = ({ title, value }) => (
  <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 8, minWidth: 160 }}>
    <div style={{ fontSize: 12, color: '#666' }}>{title}</div>
    <div style={{ fontSize: 20, fontWeight: '600' }}>{value}</div>
  </div>
);

export default function EnterpriseDashboard() {
  const [enterpriseId, setEnterpriseId] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enterpriseId) return;
    setLoading(true);
    apiClient.get(`/enterprise/${enterpriseId}/summary`).then((res) => {
      setSummary(res.data.data);
    }).catch((e) => {
      console.error(e);
      setSummary(null);
    }).finally(() => setLoading(false));
  }, [enterpriseId]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Enterprise Dashboard (scaffold)</h2>
      <div style={{ marginBottom: 12 }}>
        <input placeholder="Enterprise user id" value={enterpriseId} onChange={(e) => setEnterpriseId(e.target.value)} />
      </div>

      {loading && <div>Loading...</div>}
      {summary && (
        <div style={{ display: 'flex', gap: 12 }}>
          <SummaryCard title="Total students" value={summary.totalStudents} />
          <SummaryCard title="Mentors" value={summary.mentorCount} />
          <SummaryCard title="% reports submitted" value={`${summary.percentReportsSubmitted}%`} />
          <SummaryCard title="Pending reports" value={summary.pendingReports} />
          <SummaryCard title="Inactive students" value={summary.inactiveStudents} />
        </div>
      )}
    </div>
  );
}
