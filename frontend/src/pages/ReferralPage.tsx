import React, { useState, useEffect } from 'react';
import { ReferralStat } from '../types';
import { api } from '../services/api';
import { shareTelegramLink } from '../services/telegram';
import { Users, Share2, Copy, Check, Network, ShieldCheck } from 'lucide-react';

export const ReferralPage: React.FC = () => {
  const [stat, setStat] = useState<ReferralStat | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    async function loadReferrals() {
      try {
        const res = await api.getReferrals();
        setStat(res);
      } catch (err: any) {
        console.error('Không thể tải thông tin giới thiệu:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReferrals();
  }, []);

  const handleShare = () => {
    if (!stat) return;
    const shareText = `🎮 VÀO ĐẤU OẲN TÙ TÌ CÙNG TÔI TRÊN TELEGRAM MINI APP!\n🏆 Nhận ngay hoa hồng 5 cấp độ hấp dẫn khi giới thiệu bạn bè:`;
    shareTelegramLink(stat.referralLink, shareText);
  };

  const handleCopyLink = () => {
    if (!stat) return;
    navigator.clipboard.writeText(stat.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto pb-24 space-y-4">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-amber-400 animate-pulse" />
          <h1 className="text-xl font-black text-amber-400 tracking-wide">MỜI BẠN BÈ (5 CẤP)</h1>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black">
          2.0% HOA HỒNG
        </div>
      </div>

      {/* Main Banner & Total Earnings */}
      <div className="card-glass p-5 border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-500/10">
          🎁
        </div>
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">
            HOA HỒNG GIỚI THIỆU 5 CẤP ĐỘ
          </h2>
          <p className="text-xs text-slate-300 font-semibold mt-1">
            Nhận chiết khấu hoa hồng tự động trên mọi ván cược từ hệ thống bạn bè 5 cấp!
          </p>
        </div>

        {/* Counter Summary Cards */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Bạn bè F1 trực tiếp</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">
              {loading ? '...' : (stat?.totalReferrals || 0).toLocaleString()} <span className="text-xs text-slate-400 font-bold">người</span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Tổng Xu hoa hồng nhận</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
              <span>🪙</span>
              <span>{loading ? '...' : (stat?.totalCommissions || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Level Commission Structure Breakdown */}
      <div className="card-glass p-4 space-y-3 border-amber-500/30 bg-slate-900/90">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wider">
            <Network className="w-4 h-4 text-amber-400" />
            <span>CƠ CHẾ PHÂN CHIA PHÍ 5%</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold">Sàn: 3.0% • Ref: 2.0%</span>
        </div>

        {/* Platform Rake Note */}
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Phí sàn giữ lại:</span>
          </span>
          <span className="font-black text-indigo-400">3.0% giá phòng</span>
        </div>

        {/* 5 Tiers Grid */}
        <div className="space-y-1.5">
          <div className="text-xs font-black text-slate-300 uppercase">Cơ cấu hoa hồng 5 cấp (Tổng 2.0%):</div>
          <div className="grid grid-cols-5 gap-1 text-center">
            {(
              stat?.tiers || [
                { level: 1, ratePercent: '1.0%', count: 0, commissionCoins: 0 },
                { level: 2, ratePercent: '0.4%', count: 0, commissionCoins: 0 },
                { level: 3, ratePercent: '0.3%', count: 0, commissionCoins: 0 },
                { level: 4, ratePercent: '0.2%', count: 0, commissionCoins: 0 },
                { level: 5, ratePercent: '0.1%', count: 0, commissionCoins: 0 },
              ]
            ).map((t) => (
              <div
                key={t.level}
                className={`p-2 rounded-xl border flex flex-col items-center justify-between transition-all ${
                  t.level === 1
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="text-[10px] font-black uppercase text-amber-400">F{t.level}</div>
                <div className="text-xs font-black text-white">{t.ratePercent}</div>
                <div className="text-[9px] text-slate-400 font-semibold mt-1">
                  {t.commissionCoins ? `+${t.commissionCoins}` : `${t.count} ref`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Share Link Card */}
      <div className="card-glass p-4 space-y-3 border-slate-700">
        <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
          Link giới thiệu duy nhất của bạn:
        </label>
        
        <div className="flex items-center gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
          <input
            type="text"
            readOnly
            value={stat?.referralLink || 'Đang tạo link...'}
            className="bg-transparent text-xs font-bold text-slate-300 w-full focus:outline-none truncate"
          />
          <button
            onClick={handleCopyLink}
            disabled={!stat}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95 transition-transform"
            title="Sao chép link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* BIG SHARE LINK BUTTON */}
        <button
          onClick={handleShare}
          disabled={!stat}
          className="w-full py-4 btn-game-primary text-base shadow-amber-500/20"
        >
          <Share2 className="w-5 h-5 mr-2" />
          <span>CHIA SẺ LINK MỜI 🚀</span>
        </button>
      </div>

      {/* Invited Friends List */}
      <div className="space-y-2">
        <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider">
          Danh sách bạn bè F1 ({stat?.referredUsers.length || 0})
        </h3>

        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Đang tải danh sách...</div>
        ) : stat?.referredUsers.length === 0 ? (
          <div className="card-glass p-6 text-center text-xs font-semibold text-slate-400">
            Bạn chưa mời bạn bè nào. Hãy bấm <span className="text-amber-400 font-extrabold">Chia sẻ link mời</span> để nhận hoa hồng 5 cấp ngay!
          </div>
        ) : (
          <div className="space-y-2">
            {stat?.referredUsers.map((friend) => (
              <div key={friend.id} className="card-glass p-3 flex items-center justify-between border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400">
                    👤
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-white">{friend.first_name}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">
                      @{friend.username || 'user'}
                    </div>
                  </div>
                </div>
                <div className="text-xs font-black text-amber-400">
                  {friend.rating} điểm
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
