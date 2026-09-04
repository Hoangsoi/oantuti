import React, { useState, useEffect } from 'react';
import { DailyRewardTask, User } from '../types';
import { api } from '../services/api';
import { triggerHapticNotification, triggerHapticImpact } from '../services/telegram';
import { playCoinSound } from '../services/sound';
import { Gift, CheckCircle2, Trophy, Sparkles, RefreshCw } from 'lucide-react';

interface RewardsPageProps {
  onRewardClaimed: (updatedUser: User) => void;
}

export const RewardsPage: React.FC<RewardsPageProps> = ({ onRewardClaimed }) => {
  const [tasks, setTasks] = useState<DailyRewardTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [vipInfo, setVipInfo] = useState<any>(null);
  const [claimingVip, setClaimingVip] = useState<boolean>(false);

  const fetchRewards = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, vipData] = await Promise.all([
        api.getRewards(),
        api.getVipInfo().catch(() => null),
      ]);
      setTasks(res);
      setVipInfo(vipData);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách phần thưởng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const handleClaimVipSalary = async () => {
    if (claimingVip || !vipInfo) return;
    setClaimingVip(true);
    triggerHapticImpact('medium');
    try {
      const res = await api.claimVipReward();
      playCoinSound();
      triggerHapticNotification('success');
      alert(`🎉 Nhận thành công +${(res?.rewardCoins || 0).toLocaleString()} Xu Lương VIP tháng ${res?.claimedMonth || ''}!`);
      fetchRewards();
      if (res?.updatedUser) {
        onRewardClaimed(res.updatedUser);
      }
    } catch (err: any) {
      triggerHapticNotification('error');
      alert(err.message || 'Không thể nhận thưởng VIP hàng tháng');
    } finally {
      setClaimingVip(false);
    }
  };

  const handleClaim = async (task: DailyRewardTask) => {
    if (task.isClaimed || !task.isCompleted || claimingId) return;

    setClaimingId(task.id);
    triggerHapticImpact('medium');
    try {
      const res = await api.claimReward(task.id);
      playCoinSound();
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

      {/* VIP Level & Monthly Salary Card */}
      {vipInfo && (
        <div className="card-glass p-4 border-amber-500/40 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 space-y-3">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">👑</span>
              <div>
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  QUYỀN LỢI & LƯƠNG VIP (VIP 1 - VIP 30)
                </h3>
                <p className="text-[10px] text-slate-300 font-semibold">
                  Cấp VIP hiện tại: <span className="text-amber-400 font-black">VIP {vipInfo.currentVipLevel}</span>
                </p>
              </div>
            </div>
            {vipInfo.currentVipLevel > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs">
                👑 VIP {vipInfo.currentVipLevel}
              </span>
            )}
          </div>

          {/* Wager Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-300">
              <span>Tổng cược: {vipInfo.totalWagerAmount.toLocaleString()} Xu</span>
              <span>
                {vipInfo.nextVipLevel
                  ? `Mục tiêu VIP ${vipInfo.nextVipLevel}: ${vipInfo.nextMinWager.toLocaleString()} Xu`
                  : 'Đã đạt VIP tối đa!'}
              </span>
            </div>
            {vipInfo.nextVipLevel && (
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, (vipInfo.totalWagerAmount / vipInfo.nextMinWager) * 100)
                    )}%`,
                  }}
                ></div>
              </div>
            )}
          </div>

          {/* Monthly Salary Claim Section */}
          <div className="pt-2 flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <div>
              <div className="text-[10px] font-bold text-slate-400">LƯƠNG VIP HÀNG THÁNG</div>
              <div className="text-sm font-black text-amber-400">
                +{vipInfo.currentMonthlyReward.toLocaleString()} Xu / tháng
              </div>
            </div>

            <button
              onClick={handleClaimVipSalary}
              disabled={claimingVip || vipInfo.isClaimedThisMonth || vipInfo.currentVipLevel === 0}
              className={`px-3.5 py-2 text-xs font-black rounded-xl shadow-md transition-all active:scale-95 ${
                vipInfo.isClaimedThisMonth
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : vipInfo.currentVipLevel === 0
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 shadow-amber-500/20'
              }`}
            >
              {claimingVip
                ? 'ĐANG NHẬN...'
                : vipInfo.isClaimedThisMonth
                ? '✅ ĐÃ NHẬN THÁNG NÀY'
                : vipInfo.currentVipLevel === 0
                ? 'CHƯA ĐẠT VIP 1'
                : '🎁 NHẬN LƯƠNG VIP'}
            </button>
          </div>
        </div>
      )}

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
                <div className="flex items-center gap-2 text-xs font-black pt-1">
                  {task.rewardCoins && (
                    <span className="text-amber-400 font-black flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                      🪙 +{task.rewardCoins.toLocaleString()} Xu
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/30">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    +{task.rewardPoints} điểm
                  </span>
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
