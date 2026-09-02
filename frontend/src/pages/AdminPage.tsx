import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { api } from '../services/api';
import { triggerHapticImpact, triggerHapticNotification } from '../services/telegram';
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle, User, Clock, Copy, Check, Building } from 'lucide-react';

interface AdminPageProps {
  onBackHome: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onBackHome }) => {
  const [pendingList, setPendingList] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getAdminPendingTransactions();
      setPendingList(list);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách đơn chờ duyệt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerHapticImpact('light');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApprove = async (tx: Transaction) => {
    setSubmittingId(tx.id);
    setError(null);
    triggerHapticImpact('medium');
    try {
      const updated = await api.approveAdminTransaction(tx.id);
      triggerHapticNotification('success');
      if (tx.type === 'deposit') {
        setToastMsg(`✅ Đã duyệt nạp đơn #${tx.id}! Đã cộng +${updated.coins.toLocaleString()} Xu cho người chơi.`);
      } else {
        setToastMsg(`✅ Đã xác nhận chuyển tiền rút cho đơn #${tx.id}!`);
      }
      setTimeout(() => setToastMsg(null), 4000);
      loadPending();
    } catch (err: any) {
      triggerHapticNotification('error');
      setError(err.message || 'Lỗi khi duyệt đơn');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (tx: Transaction) => {
    setSubmittingId(tx.id);
    setError(null);
    triggerHapticImpact('medium');
    try {
      await api.rejectAdminTransaction(tx.id, 'Từ chối bởi Admin');
      triggerHapticNotification('warning');
      if (tx.type === 'withdraw') {
        setToastMsg(`❌ Đã từ chối đơn rút #${tx.id} và hoàn trả lại ${tx.coins.toLocaleString()} Xu cho khách hàng.`);
      } else {
        setToastMsg(`❌ Đã từ chối đơn nạp #${tx.id}`);
      }
      setTimeout(() => setToastMsg(null), 4000);
      loadPending();
    } catch (err: any) {
      triggerHapticNotification('error');
      setError(err.message || 'Lỗi khi từ chối đơn');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto pb-24 space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackHome}
          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700"
        >
          ← TRANG CHỦ
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-black text-white">ADMIN DUYỆT ĐƠN</h1>
        </div>
      </div>

      {/* Admin Title Card & Refresh Button */}
      <div className="card-glass p-4 border-amber-500/30 bg-slate-900/90 flex items-center justify-between">
        <div>
          <div className="text-xs font-black text-amber-400 uppercase tracking-widest">
            PANEL QUẢN TRỊ ADMIN
          </div>
          <div className="text-xs text-slate-300 font-semibold mt-0.5">
            Duyệt đơn nạp/rút ➔ Tự động cộng/hoàn điểm cho khách
          </div>
        </div>

        <button
          onClick={loadPending}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-800 text-amber-400 hover:bg-slate-700 active:scale-95 border border-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl text-center">
          {error}
        </div>
      )}

      {toastMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold rounded-xl text-center shadow-lg animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* Pending Transactions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-black text-slate-300 uppercase tracking-wider">
          <span>ĐƠN ĐANG CHỜ DUYỆT</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {pendingList.length} đơn
          </span>
        </div>

        {loading && pendingList.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400 font-semibold">
            Đang tải đơn hàng chờ duyệt...
          </div>
        ) : pendingList.length === 0 ? (
          <div className="card-glass p-8 text-center space-y-2 border-slate-800">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
            <div className="text-sm font-black text-white">KHÔNG CÓ ĐƠN CHỜ DUYỆT</div>
            <div className="text-xs text-slate-400 font-semibold">
              Tất cả các yêu cầu nạp rút của khách hàng đã được xử lý xong!
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingList.map((tx) => {
              const isDeposit = tx.type === 'deposit';
              const isSubmittingThis = submittingId === tx.id;

              return (
                <div
                  key={tx.id}
                  className="card-glass p-4 space-y-3 border-amber-500/30 bg-slate-900/90 shadow-xl"
                >
                  {/* Header info */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md font-black text-[10px] uppercase ${
                        isDeposit ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {isDeposit ? '📥 NẠP TIỀN' : '📤 RÚT TIỀN'}
                      </span>
                      <span className="text-xs font-black text-amber-400">#{tx.id}</span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(tx.created_at).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>

                  {/* Customer details */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-300">
                    <div className="space-y-1">
                      <span className="text-slate-400 text-[11px] block">Người chơi:</span>
                      <div className="font-extrabold text-white truncate flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>{tx.first_name || `User #${tx.user_id}`}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        @{tx.username || `id_${tx.telegram_id}`}
                      </div>
                    </div>

                    <div className="space-y-1 text-right">
                      <span className="text-slate-400 text-[11px] block">
                        {isDeposit ? 'Số Xu quy đổi:' : 'Số Xu trừ ví:'}
                      </span>
                      <div className="text-sm font-black text-amber-400">
                        {isDeposit ? `+${tx.coins.toLocaleString()}` : `-${tx.coins.toLocaleString()}`} Xu
                      </div>
                      <div className="text-[11px] font-bold text-emerald-400">
                        {tx.payment_method === 'usdt' ? `${tx.amount} USDT` : `${Number(tx.amount).toLocaleString()} VNĐ`}
                      </div>
                    </div>
                  </div>

                  {/* If WITHDRAWAL, render Linked Bank details for Admin to transfer */}
                  {!isDeposit && (
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="text-[11px] font-black text-amber-400 flex items-center gap-1 uppercase">
                        <Building className="w-3.5 h-3.5" />
                        <span>THÔNG TIN NGÂN HÀNG KHÁCH NHẬN TIỀN:</span>
                      </div>
                      {tx.bank_name ? (
                        <div className="text-slate-300 space-y-0.5 pt-1 font-semibold">
                          <div><span className="text-slate-400">N.Hàng:</span> <strong className="text-white">{tx.bank_name}</strong></div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">STK:</span>
                            <strong className="text-amber-400 font-black">{tx.account_number}</strong>
                            <button
                              onClick={() => handleCopy(tx.account_number || '', `stk_${tx.id}`)}
                              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                            >
                              {copiedKey === `stk_${tx.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <div><span className="text-slate-400">Chủ TK:</span> <strong className="text-white">{tx.account_holder}</strong></div>
                        </div>
                      ) : (
                        <div className="text-emerald-400 font-black">Rút về địa chỉ ví USDT (TRC20)</div>
                      )}
                    </div>
                  )}

                  {tx.memo && (
                    <div className="bg-slate-950 p-2 rounded-lg text-xs font-mono text-slate-300 border border-slate-800 break-all">
                      <span className="text-slate-400 font-sans">Ghi chú:</span> {tx.memo}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleReject(tx)}
                      disabled={isSubmittingThis}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-red-400 font-black text-xs border border-slate-700 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{isDeposit ? 'TỪ CHỐI' : 'TỪ CHỐI (HOÀN XU)'}</span>
                    </button>

                    <button
                      onClick={() => handleApprove(tx)}
                      disabled={isSubmittingThis}
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSubmittingThis ? 'Đang xử lý...' : isDeposit ? 'DUYỆT & CỘNG XU' : 'XÁC NHẬN ĐÃ CHUYỂN TIỀN'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
