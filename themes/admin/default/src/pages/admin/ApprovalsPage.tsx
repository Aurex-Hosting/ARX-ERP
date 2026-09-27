import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Bot, Clock } from 'lucide-react';
import api from '../../services/api';
import { ApprovalItem } from '../../types';

export const ApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    try {
      const response = await api.get('/admin/approvals');
      setApprovals(response.data.data || []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/admin/approvals/${id}/approve`, { notes: 'Approved via Admin UI' });
      await fetchApprovals();
      alert(`Action #${id} approved and executed.`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.post(`/admin/approvals/${id}/reject`, { notes: 'Rejected via Admin UI' });
      await fetchApprovals();
      alert(`Action #${id} rejected.`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">AI Human-in-the-Loop Queue</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Review, approve, or reject high-impact or destructive tool calls requested by AI Agents.
        </p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">Loading approval queue...</div>
        ) : approvals.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <CheckCircle className="w-10 h-10 text-emerald-500/50 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-300">Queue is Clear</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No AI actions currently pending authorization.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {approvals.map((item) => (
              <div key={item.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-violet-500/10 text-violet-700 dark:text-violet-300">
                      #{item.id} {item.tool_name}
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full capitalize font-medium">
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Bot className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <span>Agent: {item.agent?.name || `Agent #${item.agent_id}`}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </div>

                  <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-xl font-mono text-[11px] text-slate-800 dark:text-slate-300 overflow-x-auto max-w-xl">
                    <pre>{JSON.stringify(item.parameters, null, 2)}</pre>
                  </div>
                </div>

                {item.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(item.id)}
                      className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
