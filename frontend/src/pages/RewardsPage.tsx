import React, { useState, useEffect } from 'react';
import { DailyRewardTask, User } from '../types';
import { api } from '../services/api';
import { triggerHapticNotification, triggerHapticImpact } from '../services/telegram';
import { Gift, CheckCircle2, Trophy, Sparkles, RefreshCw } from 'lucide-react';

interface RewardsPageProps {
  onRewardClaimed: (updatedUser: User) => void;
}

export const RewardsPage: React.FC<RewardsPageProps> = ({ onRewardClaimed }) => {
  const [tasks, setTasks] = useState<DailyRewardTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRewards();
      setTasks(res);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách phần thưởng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const handleClaim = async (task: DailyRewardTask) => {
    if (task.isClaimed || !task.isCompleted || claimingId) return;

    setClaimingId(task.id);
    triggerHapticImpact('medium');
    try {
      const res = await api.claimReward(task.id);
      triggerHapticNotification('success');
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, isClaimed: true } : t))
      );
      onRewardClaimed(res.updatedUser);
    } catch (err: any) {
      triggerHapticNotification('error');
      alert(err.message || 'Không thể nhận phần thưởng');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto pb-24 space-y-4">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-7 h-7 text-purple-400" />
          <h1 className="text-2xl font-black text-white tracking-wide">PHẦN THƯỞNG</h1>
        </div>
        <button
          onClick={fetchRewards}
          className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition-transform"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Info Banner */}
      <div className="card-glass p-4 border-purple-500/30 bg-gradient-to-r from-purple-950/30 via-slate-900 to-indigo-950/30">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
          <div>
            <h2 className="text-sm font-black text-white">Nhiệm Vụ Hàng Ngày</h2>
            <p className="text-[11px] text-slate-300 font-semibold">
              Hoàn thành các mốc thử thách hàng ngày để tích lũy điểm xếp hạng bonus!
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`card-glass p-4 flex items-center justify-between border-slate-700/80 ${
                task.isClaimed ? 'opacity-60 bg-slate-900/60' : ''
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{task.title}</span>
                  {task.progressText && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-purple-300 border border-slate-700">
                      {task.progressText}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-semibold">{task.description}</p>
                <div className="flex items-center gap-1 text-xs font-black text-amber-400 pt-1">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>+{task.rewardPoints} điểm</span>
                </div>
              </div>

              {/* Action / Claim Button */}
              <div>
                {task.isClaimed ? (
                  <div className="flex items-center gap-1 text-xs font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ĐÃ NHẬN</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleClaim(task)}
                    disabled={!task.isCompleted || claimingId === task.id}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all shadow-md active:scale-95 ${
                      task.isCompleted
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {claimingId === task.id ? 'Đang nhận...' : task.isCompleted ? 'NHẬN QUA' : 'CHƯA ĐẠT'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
