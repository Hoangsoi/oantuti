import React, { useState, useEffect } from 'react';
import { ReferralStat } from '../types';
import { api } from '../services/api';
import { shareTelegramLink } from '../services/telegram';
import { Users, Share2, Copy, Check } from 'lucide-react';

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
    const shareText = `🎮 VÀO ĐẤU OẲN TÙ TÌ CÙNG TÔI TRÊN TELEGRAM MINI APP!\n🏆 Thách đấu nhận điểm thưởng ngay tại đây:`;
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
      <div className="flex items-center gap-2">
        <Users className="w-7 h-7 text-blue-400" />
        <h1 className="text-2xl font-black text-white tracking-wide">MỜI BẠN BÈ</h1>
      </div>

      {/* Main Banner */}
      <div className="card-glass p-5 border-blue-500/30 bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950/40 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-3xl mx-auto mb-3">
          🎁
        </div>
        <h2 className="text-xl font-black text-white">MỜI BẠN - NHẬN THƯỞNG KÉP</h2>
        <p className="text-xs text-slate-300 font-semibold mt-1">
          Giới thiệu bạn bè tham gia game Oẳn Tù Tì để nhận ngay điểm xếp hạng và hoàn thành nhiệm vụ hàng ngày!
        </p>

        {/* Invited Count Counter */}
        <div className="mt-4 pt-4 border-t border-slate-700/80 flex items-center justify-around">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Bạn bè đã mời</div>
            <div className="text-2xl font-black text-blue-400">
              {loading ? '...' : stat?.totalReferrals || 0} người
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Phần thưởng</div>
            <div className="text-2xl font-black text-amber-400">+100 điểm/bạn</div>
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
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* BIG SHARE LINK BUTTON */}
        <button
          onClick={handleShare}
          disabled={!stat}
          className="w-full py-4 btn-game-primary text-lg shadow-blue-500/20"
        >
          <Share2 className="w-5 h-5 mr-2" />
          <span>CHIA SẺ LINK MỜI</span>
        </button>
      </div>

      {/* Invited Friends List */}
      <div className="space-y-2">
        <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider">
          Danh sách đã giới thiệu ({stat?.referredUsers.length || 0})
        </h3>

        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Đang tải danh sách...</div>
        ) : stat?.referredUsers.length === 0 ? (
          <div className="card-glass p-6 text-center text-xs font-semibold text-slate-400">
            Bạn chưa mời bạn bè nào. Hãy bấm <span className="text-amber-400 font-extrabold">Chia sẻ link mời</span> để gửi cho bạn bè ngay!
          </div>
        ) : (
          <div className="space-y-2">
            {stat?.referredUsers.map((friend) => (
              <div key={friend.id} className="card-glass p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-400">
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
