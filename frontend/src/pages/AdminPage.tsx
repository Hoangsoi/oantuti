import React, { useState, useEffect } from 'react';
import { Transaction, User } from '../types';
import { api } from '../services/api';
import { triggerHapticImpact, triggerHapticNotification } from '../services/telegram';
import { ShieldCheck, Check, X, RefreshCw, Copy, Search, Lock, Unlock, Coins, KeyRound } from 'lucide-react';

interface AdminPageProps {
  onBackHome: () => void;
  currentUser?: User | null;
  onAdminAuthenticated?: (user: User) => void;
}

const ADMIN_TELEGRAM_ID = import.meta.env.VITE_ADMIN_ID || '8780377211';

export const AdminPage: React.FC<AdminPageProps> = ({ onBackHome, currentUser, onAdminAuthenticated }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'stats' | 'settings'>('pending');
  const [txFilter, setTxFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  // Admin Login State
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<User | null>(
    currentUser && String(currentUser.telegram_id) === String(ADMIN_TELEGRAM_ID) ? currentUser : null
  );

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState<boolean>(true);

  // Users Management State
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState<string>('');
  const [selectedUserForCoins, setSelectedUserForCoins] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('1000');
  const [adjustReason, setAdjustReason] = useState<string>('Nạp thưởng Admin');

  // System Stats State
  const [gameStats, setGameStats] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);

  // Payment Settings State
  const [paymentConfig, setPaymentConfig] = useState<{
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    usdtAddress: string;
    adminTelegramUsername: string;
    qrCodeUrl: string;
    botWinRate: number;
  }>({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    usdtAddress: '',
    adminTelegramUsername: '',
    qrCodeUrl: '',
    botWinRate: 70,
  });
  const [configLoading, setConfigLoading] = useState<boolean>(false);

  // General Messages
  const [actionLoading, setActionLoading] = useState<number | boolean | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isAdminAuthenticated = Boolean(adminUser && String(adminUser.telegram_id) === String(ADMIN_TELEGRAM_ID));

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    triggerHapticImpact('medium');

    try {
      const res = await api.adminLogin(adminUsername, adminPassword);
      triggerHapticNotification('success');
      setAdminUser(res.user);
      if (onAdminAuthenticated) {
        onAdminAuthenticated(res.user);
      }
    } catch (err: any) {
      triggerHapticNotification('error');
      setLoginError(err.message || 'Đăng nhập Admin thất bại');
    } finally {
      setLoginLoading(false);
    }
  };

  const loadTransactions = async () => {
    setTxLoading(true);
    try {
      if (txFilter === 'pending') {
        const data = await api.getAdminPendingTransactions();
        setTransactions(data);
      } else {
        const data = await api.getAdminAllTransactions(txFilter);
        setTransactions(data);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Không thể tải danh sách đơn hàng' });
    } finally {
      setTxLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await api.getAdminUsers(userSearch);
      setUsers(data);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Không thể tải danh sách khách hàng' });
    } finally {
      setUsersLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const data = await api.getAdminGameStats();
      setGameStats(data);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Không thể tải thống kê hệ thống' });
    } finally {
      setStatsLoading(false);
    }
  };

  const loadPaymentConfig = async () => {
    setConfigLoading(true);
    try {
      const data = await api.getAdminPaymentConfig();
      setPaymentConfig(data);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Không thể tải cấu hình thanh toán Admin' });
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      if (activeTab === 'pending') loadTransactions();
      else if (activeTab === 'users') loadUsers();
      else if (activeTab === 'stats') loadStats();
      else if (activeTab === 'settings') loadPaymentConfig();
    }
  }, [activeTab, txFilter, isAdminAuthenticated]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerHapticImpact('light');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApprove = async (txId: number) => {
    setActionLoading(txId);
    setStatusMsg(null);
    triggerHapticImpact('medium');
    try {
      await api.approveAdminTransaction(txId);
      triggerHapticNotification('success');
      setStatusMsg({ type: 'success', text: `Đã duyệt đơn #${txId} và cộng Xu tự động thành công!` });
      loadTransactions();
    } catch (err: any) {
      triggerHapticNotification('error');
      setStatusMsg({ type: 'error', text: err.message || 'Lỗi khi duyệt đơn' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (txId: number) => {
    setActionLoading(txId);
    setStatusMsg(null);
    triggerHapticImpact('medium');
    try {
      await api.rejectAdminTransaction(txId, 'Từ chối bởi Admin');
      triggerHapticNotification('success');
      setStatusMsg({ type: 'success', text: `Đã từ chối đơn #${txId} thành công!` });
      loadTransactions();
    } catch (err: any) {
      triggerHapticNotification('error');
      setStatusMsg({ type: 'error', text: err.message || 'Lỗi khi từ chối đơn' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdjustCoinsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForCoins) return;

    const amt = Number(adjustAmount);
    if (isNaN(amt) || amt === 0) {
      setStatusMsg({ type: 'error', text: 'Số Xu phải khác 0' });
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);
    try {
      await api.adjustAdminUserCoins(selectedUserForCoins.id, amt, adjustReason);
      triggerHapticNotification('success');
      setStatusMsg({ type: 'success', text: `Đã ${amt > 0 ? 'cộng' : 'trừ'} ${Math.abs(amt).toLocaleString()} Xu cho khách ${selectedUserForCoins.first_name}!` });
      setSelectedUserForCoins(null);
      loadUsers();
    } catch (err: any) {
      triggerHapticNotification('error');
      setStatusMsg({ type: 'error', text: err.message || 'Lỗi điều chỉnh Xu' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBlock = async (userId: number, currentBlocked: boolean) => {
    setActionLoading(userId);
    setStatusMsg(null);
    try {
      await api.toggleBlockAdminUser(userId);
      triggerHapticNotification('success');
      setStatusMsg({ type: 'success', text: `Đã ${currentBlocked ? 'mở khóa' : 'khóa'} tài khoản ID #${userId} thành công!` });
      loadUsers();
    } catch (err: any) {
      triggerHapticNotification('error');
      setStatusMsg({ type: 'error', text: err.message || 'Lỗi khi đổi trạng thái tài khoản' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMsg(null);
    try {
      await api.updateAdminPaymentConfig(paymentConfig);
      triggerHapticNotification('success');
      setStatusMsg({ type: 'success', text: 'Đã cập nhật thông tin thanh toán Admin thành công!' });
    } catch (err: any) {
      triggerHapticNotification('error');
      setStatusMsg({ type: 'error', text: err.message || 'Lỗi lưu cấu hình Admin' });
    } finally {
      setActionLoading(false);
    }
  };

  // Render Admin Login Form if not yet authenticated as Admin
  if (!isAdminAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen px-4 py-8 max-w-md mx-auto items-center justify-center space-y-5">
        <div className="w-full card-glass p-6 space-y-5 border-purple-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-purple-950/30 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/40 flex items-center justify-center mx-auto text-3xl shadow-lg shadow-purple-500/20">
            <KeyRound className="w-8 h-8 text-purple-400" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-black text-purple-400 uppercase tracking-wider">
              ĐĂNG NHẬP QUẢN TRỊ ADMIN
            </h1>
            <p className="text-xs text-slate-300 font-semibold">
              Nhập tài khoản & mật khẩu để truy cập trang quản lý
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} className="space-y-3.5 text-left text-xs font-bold text-slate-300">
            <div className="space-y-1">
              <label className="block text-slate-300">Tài khoản Admin:</label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Nhập tài khoản Admin..."
                className="bg-slate-950 border border-slate-700 text-white font-bold p-3 rounded-xl w-full focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300">Mật khẩu Admin:</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Nhập mật khẩu Admin..."
                className="bg-slate-950 border border-slate-700 text-amber-400 font-black p-3 rounded-xl w-full focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-purple-500/25 active:scale-95 transition-all mt-2 flex items-center justify-center gap-2"
            >
              <span>🔐 ĐĂNG NHẬP QUẢN TRỊ ADMIN</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={onBackHome}
              className="text-xs font-bold text-slate-400 hover:text-white underline"
            >
              ← Quay lại Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto pb-24 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackHome}
          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700"
        >
          ← TRANG CHỦ
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-purple-400" />
          <h1 className="text-xl font-black text-purple-400">QUẢN TRỊ ADMIN</h1>
        </div>
      </div>

      {/* Admin Nav Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-center">
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-2 text-[11px] font-extrabold rounded-xl transition-all ${
            activeTab === 'pending'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          💳 Nạp/Rút
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 text-[11px] font-extrabold rounded-xl transition-all ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          👥 Khách Hàng
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`py-2 text-[11px] font-extrabold rounded-xl transition-all ${
            activeTab === 'stats'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📊 Thống Kê
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-2 text-[11px] font-extrabold rounded-xl transition-all ${
            activeTab === 'settings'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ⚙️ Cấu Hình
        </button>
      </div>

      {statusMsg && (
        <div className={`p-3 text-xs font-bold rounded-xl text-center border ${
          statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {statusMsg.text}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 1: DEPOSIT / WITHDRAW APPROVAL & TRANSACTIONS */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {/* Sub Filter */}
          <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <div className="flex gap-1">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setTxFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                    txFilter === st ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'pending' ? 'Chờ duyệt ⏳' : st === 'approved' ? 'Đã duyệt ✅' : st === 'rejected' ? 'Từ chối ❌' : 'Tất cả 📜'}
                </button>
              ))}
            </div>
            <button onClick={loadTransactions} className="p-1 rounded bg-slate-800 text-slate-300">
              <RefreshCw className={`w-3.5 h-3.5 ${txLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {txLoading ? (
            <div className="text-center py-12 text-xs text-slate-400 font-bold">Đang tải danh sách giao dịch...</div>
          ) : transactions.length === 0 ? (
            <div className="card-glass p-6 text-center text-xs font-semibold text-slate-400">
              Không có giao dịch nào ở trạng thái này.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isDeposit = tx.type === 'deposit';
                return (
                  <div key={tx.id} className="card-glass p-4 border-slate-700/80 space-y-3">
                    {/* Header line */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          isDeposit ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}>
                          {isDeposit ? '📥 NẠP TIỀN' : '📤 RÚT TIỀN'} ({tx.payment_method.toUpperCase()})
                        </span>
                        <span className="text-xs font-black text-amber-400">#{tx.id}</span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(tx.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="flex items-center justify-between text-xs bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <div className="font-extrabold text-white">
                          {tx.first_name} {tx.last_name || ''} (@{tx.username || 'n/a'})
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">Telegram ID: {tx.telegram_id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-emerald-400">
                          {Number(tx.amount).toLocaleString()} {tx.payment_method === 'usdt' ? 'USDT' : 'VNĐ'}
                        </div>
                        <div className="text-[10px] font-extrabold text-amber-400">
                          Quy đổi: {tx.coins.toLocaleString()} Xu
                        </div>
                      </div>
                    </div>

                    {/* Withdrawal Bank Account Preview */}
                    {tx.bank_name && (
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1">
                        <div className="text-[10px] font-bold text-slate-400">Nơi nhận chuyển tiền (Khách hàng):</div>
                        <div className="flex items-center justify-between font-bold text-slate-200">
                          <span>{tx.bank_name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-400 font-black">{tx.account_number}</span>
                            <button
                              onClick={() => handleCopy(tx.account_number || '', 'stk_' + tx.id)}
                              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                            >
                              {copiedKey === 'stk_' + tx.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Chủ tài khoản:</span>
                          <span className="font-extrabold text-white uppercase">{tx.account_holder}</span>
                        </div>
                      </div>
                    )}

                    {/* Admin Action Buttons for Pending */}
                    {tx.status === 'pending' ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleApprove(tx.id)}
                          disabled={actionLoading === tx.id}
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <Check className="w-4 h-4" />
                          <span>DUYỆT & CỘNG XU</span>
                        </button>

                        <button
                          onClick={() => handleReject(tx.id)}
                          disabled={actionLoading === tx.id}
                          className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <X className="w-4 h-4" />
                          <span>TỪ CHỐI (HOÀN XU)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center pt-1">
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                          tx.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}>
                          Trạng thái: {tx.status === 'approved' ? 'Đã duyệt ✅' : 'Đã từ chối ❌'} ({tx.admin_note || ''})
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 2: USER MANAGEMENT */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc Telegram ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                className="bg-slate-900 border border-slate-700 text-xs text-white p-2.5 pl-9 rounded-xl w-full focus:outline-none"
              />
            </div>
            <button
              onClick={loadUsers}
              className="px-3 py-2 bg-purple-600 text-white font-black text-xs rounded-xl"
            >
              TÌM
            </button>
          </div>

          {/* Adjust Coins Modal Popup */}
          {selectedUserForCoins && (
            <form onSubmit={handleAdjustCoinsSubmit} className="card-glass p-4 space-y-3 border-amber-500/40 bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-black text-amber-400 uppercase">
                  CỘNG / TRỪ XU KHÁCH HÀNG: {selectedUserForCoins.first_name}
                </h4>
                <button type="button" onClick={() => setSelectedUserForCoins(null)} className="text-slate-400">✕</button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-slate-300 font-bold block">Số Xu (Dương = Cộng, Âm = Trừ):</label>
                  <input
                    type="number"
                    placeholder="VD: 5000 hoặc -2000"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-amber-400 font-black p-2.5 rounded-xl w-full text-center focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block">Lý do điều chỉnh:</label>
                  <input
                    type="text"
                    placeholder="Lý do nạp / trừ xu"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-xs text-white p-2.5 rounded-xl w-full focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={actionLoading === true}
                  className="flex-1 py-2.5 bg-amber-500 text-slate-950 font-black text-xs rounded-xl"
                >
                  XÁC NHẬN ĐIỀU CHỈNH
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserForCoins(null)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  HỦY
                </button>
              </div>
            </form>
          )}

          {usersLoading ? (
            <div className="text-center py-12 text-xs text-slate-400 font-bold">Đang tải danh sách khách hàng...</div>
          ) : users.length === 0 ? (
            <div className="card-glass p-6 text-center text-xs font-semibold text-slate-400">
              Không tìm thấy khách hàng nào.
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((u) => {
                const totalG = Number(u.wins || 0) + Number(u.losses || 0) + Number(u.draws || 0);
                const wr = totalG > 0 ? ((Number(u.wins || 0) / totalG) * 100).toFixed(1) : '0';

                return (
                  <div key={u.id} className="card-glass p-4 border-slate-700/80 space-y-3">
                    {/* User Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.telegram_id}`}
                          alt={u.first_name}
                          className="w-10 h-10 rounded-full border border-purple-400/60 object-cover bg-slate-900"
                        />
                        <div>
                          <div className="text-xs font-extrabold text-white">
                            {u.first_name} {u.last_name || ''}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            @{u.username || 'n/a'} (ID: {u.telegram_id})
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black text-amber-400 flex items-center justify-end gap-1">
                          <span>🪙</span>
                          <span>{Number(u.coins || 0).toLocaleString()} Xu</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">
                          Thắng: <strong className="text-emerald-400">{u.wins}</strong> | Thua: <strong className="text-red-400">{u.losses}</strong> ({wr}%)
                        </div>
                      </div>
                    </div>

                    {/* Bank Info if linked */}
                    {u.bank_name ? (
                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-[11px] space-y-0.5">
                        <div className="text-[10px] font-bold text-slate-400">Ngân hàng đã liên kết:</div>
                        <div className="font-bold text-white">{u.bank_name} - STK: <span className="text-amber-400">{u.account_number}</span> ({u.account_holder})</div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic">Chưa liên kết ngân hàng</div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                      <button
                        onClick={() => setSelectedUserForCoins(u)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] flex items-center gap-1 active:scale-95"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>CỘNG / TRỪ XU</span>
                      </button>

                      <button
                        onClick={() => handleToggleBlock(u.id, u.is_blocked)}
                        disabled={actionLoading === u.id}
                        className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] flex items-center gap-1 active:scale-95 ${
                          u.is_blocked ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}
                      >
                        {u.is_blocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        <span>{u.is_blocked ? 'MỞ KHÓA TK' : 'KHÓA TK'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 3: GAME WIN/LOSS STATISTICS */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {statsLoading ? (
            <div className="text-center py-12 text-xs text-slate-400 font-bold">Đang tải thống kê game...</div>
          ) : gameStats && (
            <>
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="card-glass p-3.5 border-purple-500/30 text-center space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Khách Hàng Đăng Ký</div>
                  <div className="text-xl font-black text-purple-400">{gameStats.totalUsers.toLocaleString()}</div>
                </div>

                <div className="card-glass p-3.5 border-amber-500/30 text-center space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Tổng Số Xu Hệ Thống</div>
                  <div className="text-xl font-black text-amber-400">{gameStats.totalCoins.toLocaleString()}</div>
                </div>

                <div className="card-glass p-3.5 border-blue-500/30 text-center space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Tổng Số Trận Đã Đấu</div>
                  <div className="text-xl font-black text-blue-400">{gameStats.totalMatches.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400 font-bold">Tỷ lệ thắng: {gameStats.winRatePercent}%</div>
                </div>

                <div className="card-glass p-3.5 border-emerald-500/30 text-center space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Phế Nhà Cái Đã Thu (5%)</div>
                  <div className="text-xl font-black text-emerald-400">{gameStats.totalRakeCollected.toLocaleString()} Xu</div>
                </div>
              </div>

              {/* Match Logs */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  LỊCH SỬ THẮNG THUA GẦN ĐÂY ({gameStats.recentMatches.length})
                </h3>

                <div className="space-y-2">
                  {gameStats.recentMatches.map((m: any) => (
                    <div key={m.id} className="card-glass p-3 flex items-center justify-between text-xs border-slate-700/60">
                      <div>
                        <div className="font-extrabold text-white">
                          {m.player_name} ({m.player_move === 'rock' ? '✊ Đấm' : m.player_move === 'paper' ? '✋ Bao' : '✌️ Kéo'})
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Máy: {m.bot_move === 'rock' ? '✊' : m.bot_move === 'paper' ? '✋' : '✌️'} | {new Date(m.created_at).toLocaleTimeString('vi-VN')}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          m.result === 'win' ? 'bg-emerald-500/20 text-emerald-400' : m.result === 'loss' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {m.result === 'win' ? 'THẮNG 🏆' : m.result === 'loss' ? 'THUA ❌' : 'HÒA 🤝'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 4: ADMIN PAYMENT SETTINGS */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSavePaymentConfig} className="card-glass p-5 space-y-4 border-slate-700/80">
          <h3 className="text-sm font-black text-purple-400 text-center uppercase tracking-wider">
            CẤU HÌNH THANH TOÁN ADMIN (NGÂN HÀNG & VÍ)
          </h3>

          {configLoading ? (
            <div className="text-center py-8 text-xs text-slate-400">Đang tải cấu hình Admin...</div>
          ) : (
            <div className="space-y-3 text-xs font-bold text-slate-300">
              <div className="space-y-1">
                <label className="block">Tên Ngân hàng Admin:</label>
                <input
                  type="text"
                  value={paymentConfig.bankName}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, bankName: e.target.value })}
                  className="bg-slate-900 border border-slate-700 text-white font-bold p-3 rounded-xl w-full focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block">Số tài khoản Admin:</label>
                <input
                  type="text"
                  value={paymentConfig.accountNumber}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, accountNumber: e.target.value })}
                  className="bg-slate-900 border border-slate-700 text-amber-400 font-black p-3 rounded-xl w-full focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block">Tên chủ tài khoản Admin:</label>
                <input
                  type="text"
                  value={paymentConfig.accountHolder}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, accountHolder: e.target.value.toUpperCase() })}
                  className="bg-slate-900 border border-slate-700 text-white font-black p-3 rounded-xl w-full uppercase focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block">Địa chỉ ví USDT (TRC20) Admin:</label>
                <input
                  type="text"
                  value={paymentConfig.usdtAddress}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, usdtAddress: e.target.value })}
                  className="bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs font-bold p-3 rounded-xl w-full focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block">Username Telegram Admin (VD: ottadmin2026):</label>
                <input
                  type="text"
                  value={paymentConfig.adminTelegramUsername}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, adminTelegramUsername: e.target.value })}
                  className="bg-slate-900 border border-slate-700 text-purple-400 font-bold p-3 rounded-xl w-full focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block">Link Ảnh Mã QR Ngân Hàng (Tùy chọn):</label>
                <input
                  type="text"
                  placeholder="https://... (Để trống để tự động tạo mã VietQR theo STK)"
                  value={paymentConfig.qrCodeUrl || ''}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, qrCodeUrl: e.target.value })}
                  className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-bold p-3 rounded-xl w-full focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 font-normal">
                  💡 Nếu điền link ảnh QR (Ví dụ ảnh Imgur hoặc Cloudinary), hệ thống sẽ ưu tiên hiển thị ảnh QR này khi khách hàng nạp tiền. Nếu để trống, hệ thống tự động tạo mã VietQR theo STK Ngân Hàng ở trên.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block">Tỷ Lệ Máy Thắng Trong Phòng Ảo (% Bot Win Rate):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={paymentConfig.botWinRate || 70}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, botWinRate: parseInt(e.target.value, 10) || 70 })}
                  className="bg-slate-900 border border-slate-700 text-amber-400 font-black text-sm p-3 rounded-xl w-full focus:outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400 font-normal">
                  🤖 Mặc định: <strong>70%</strong> (Máy thắng 70%, Người chơi thắng 30%). Bạn có thể điều chỉnh từ 0% đến 100%.
                </p>
              </div>

              <button
                type="submit"
                disabled={actionLoading === true}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-base shadow-lg shadow-purple-500/20 active:scale-95 transition-all mt-2"
              >
                <span>LƯU CẤU HÌNH ADMIN 💾</span>
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
