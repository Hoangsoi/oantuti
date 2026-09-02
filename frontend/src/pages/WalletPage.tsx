import React, { useState, useEffect } from 'react';
import { User, WalletData, Transaction } from '../types';
import { api } from '../services/api';
import { openTelegramDirectChat, triggerHapticImpact, triggerHapticNotification } from '../services/telegram';
import { Copy, Check, Wallet as WalletIcon, Building, MessageCircle } from 'lucide-react';

interface WalletPageProps {
  currentUser: User | null;
  onUserUpdated: (user: User) => void;
  onBackHome: () => void;
}

const POPULAR_BANKS = [
  'MBBank (Ngân Hàng Quân Đội)',
  'Vietcombank',
  'Techcombank',
  'VPBank',
  'ACB (Á Châu)',
  'BIDV',
  'Agribank',
  'TPBank',
  'Sacombank',
  'VIB',
  'VietinBank',
];

const ADMIN_TELEGRAM_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || 'ottadmin2026';

export const WalletPage: React.FC<WalletPageProps> = ({ currentUser, onUserUpdated, onBackHome }) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'bank' | 'history'>('deposit');
  const [depositMethod, setDepositMethod] = useState<'bank' | 'usdt'>('bank');
  const [withdrawMethod, setWithdrawMethod] = useState<'bank' | 'usdt'>('bank');

  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [createdTx, setCreatedTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Link Bank Form State
  const [bankName, setBankName] = useState<string>(POPULAR_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>('');

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState<string>('50000');
  const [depositMemo, setDepositMemo] = useState<string>('');

  // Withdraw Form State
  const [withdrawCoins, setWithdrawCoins] = useState<string>('1000');

  const loadWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getWalletInfo();
      setWalletData(data);
      if (data.bankAccount) {
        setBankName(data.bankAccount.bank_name);
        setAccountNumber(data.bankAccount.account_number);
        setAccountHolder(data.bankAccount.account_holder);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải thông tin ví');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerHapticImpact('light');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getAdminNotificationText = (tx: Transaction) => {
    const isDeposit = tx.type === 'deposit';

    let bankDetailText = '';
    if (walletData?.bankAccount) {
      bankDetailText = `${walletData.bankAccount.bank_name} - STK: ${walletData.bankAccount.account_number} (${walletData.bankAccount.account_holder})`;
    } else {
      bankDetailText = 'Ví USDT TRC20';
    }

    return isDeposit
      ? `💬 BÁO DUYỆT ĐƠN NẠP XU (@${ADMIN_TELEGRAM_USERNAME})\n-----------------------\n🔑 Mã đơn: #${tx.id}\n👤 Khách hàng: ${currentUser?.first_name} (ID: ${currentUser?.id})\n💰 Số tiền: ${Number(tx.amount).toLocaleString()} ${tx.payment_method === 'usdt' ? 'USDT' : 'VNĐ'}\n🪙 Quy đổi: +${tx.coins.toLocaleString()} Xu\n👉 Vui lòng kiểm tra và duyệt Xu giúp tôi!`
      : `💬 BÁO YÊU CẦU RÚT TIỀN (@${ADMIN_TELEGRAM_USERNAME})\n-----------------------\n🔑 Mã đơn rút: #${tx.id}\n👤 Khách hàng: ${currentUser?.first_name} (ID: ${currentUser?.id})\n🏦 Nơi nhận: ${bankDetailText}\n🪙 Số Xu rút: -${tx.coins.toLocaleString()} Xu\n💵 Số tiền thực nhận: ${Number(tx.amount).toLocaleString()} ${tx.payment_method === 'usdt' ? 'USDT' : 'VNĐ'}\n👉 Vui lòng kiểm tra và chuyển tiền giúp tôi!`;
  };

  const handleOpenDirectAdminChat = (tx: Transaction) => {
    const text = getAdminNotificationText(tx);
    // 1. Copy formatted order details to clipboard automatically
    navigator.clipboard.writeText(text);

    // 2. Open private chat window with Admin directly without SHARE dialog
    openTelegramDirectChat(ADMIN_TELEGRAM_USERNAME);
  };

  // Submit Link Bank
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    triggerHapticImpact('medium');
    try {
      const bank = await api.linkBankAccount(bankName, accountNumber, accountHolder);
      triggerHapticNotification('success');
      setSuccessMsg('Liên kết tài khoản ngân hàng thành công!');
      if (walletData) {
        setWalletData({ ...walletData, bankAccount: bank });
      }
    } catch (err: any) {
      triggerHapticNotification('error');
      setError(err.message || 'Không thể lưu tài khoản ngân hàng');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Deposit Request
  const handleConfirmDeposit = async () => {
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) {
      setError('Vui lòng nhập số tiền nạp hợp lệ');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    triggerHapticImpact('medium');

    const defaultMemo = `NAP XU_${currentUser?.id}_${Date.now().toString().slice(-4)}`;
    try {
      const tx = await api.deposit(depositMethod, amt, depositMemo || defaultMemo);
      setCreatedTx(tx);
      triggerHapticNotification('success');
      setSuccessMsg(`Yêu cầu nạp tiền #${tx.id} đã khởi tạo thành công! Bấm nút bên dưới để mở khung chat trực tiếp với Admin (@${ADMIN_TELEGRAM_USERNAME}).`);
      handleOpenDirectAdminChat(tx);
      loadWallet();
    } catch (err: any) {
      triggerHapticNotification('error');
      setError(err.message || 'Lỗi khi gửi yêu cầu nạp');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Withdraw Request
  const handleConfirmWithdraw = async () => {
    const coins = Number(withdrawCoins);
    if (!coins || coins < 1000) {
      setError('Mức rút tối thiểu là 1,000 Xu Game');
      return;
    }

    if (withdrawMethod === 'bank' && !walletData?.bankAccount) {
      setError('Vui lòng liên kết ngân hàng trước khi gửi yêu cầu rút tiền');
      setActiveTab('bank');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    triggerHapticImpact('medium');

    try {
      const result = await api.withdraw(withdrawMethod, coins);
      setCreatedTx(result.transaction);
      triggerHapticNotification('success');
      setSuccessMsg(`Yêu cầu rút #${result.transaction.id} (${coins.toLocaleString()} Xu) đã gửi thành công! Bấm nút bên dưới để mở khung chat trực tiếp với Admin (@${ADMIN_TELEGRAM_USERNAME}).`);
      handleOpenDirectAdminChat(result.transaction);
      onUserUpdated(result.updatedUser);
      loadWallet();
    } catch (err: any) {
      triggerHapticNotification('error');
      setError(err.message || 'Không thể gửi yêu cầu rút');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 max-w-md mx-auto pb-24 space-y-4">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackHome}
          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700"
        >
          ← TRANG CHỦ
        </button>
        <div className="flex items-center gap-2">
          <WalletIcon className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-black text-white">VÍ & THANH TOÁN</h1>
        </div>
      </div>

      {/* User Balance Card */}
      <div className="card-glass p-4 border-amber-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase">Số dư Xu của bạn:</div>
          <div className="text-2xl font-black text-amber-400 flex items-center gap-1 mt-0.5">
            <span>🪙</span>
            <span>{currentUser?.coins ? currentUser.coins.toLocaleString() : 0} Xu</span>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('deposit')}
          className="px-3.5 py-2 btn-game-primary text-xs font-black"
        >
          + NẠP XU
        </button>
      </div>

      {/* 4 Main Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-center">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'deposit'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📥 Nạp
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'withdraw'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📤 Rút
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'bank'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          💳 N.Hàng
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'history'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📜 Lịch sử
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl text-center">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl text-center space-y-3">
          <div>{successMsg}</div>
          {createdTx && (
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleOpenDirectAdminChat(createdTx)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <MessageCircle className="w-4 h-4 text-amber-400" />
                <span>💬 NHẮN TRỰC TIẾP ADMIN @ottadmin2026 (# {createdTx.id})</span>
              </button>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => handleCopy(getAdminNotificationText(createdTx), 'admin_msg')}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 text-slate-300 font-extrabold text-[11px] border border-slate-700 flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {copiedKey === 'admin_msg' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'admin_msg' ? 'ĐÃ SAO CHÉP MÃ ĐƠN' : 'SAO CHÉP NỘI DUNG ĐƠN'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-semibold text-center pt-0.5">
                (Đã tự động sao chép mã đơn. Mở chat Admin ➔ Bấm <strong>Dán (Paste)</strong> để gửi ngay)
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 1: DEPOSIT (VietQR Bank & USDT) */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'deposit' && (
        <div className="space-y-4">
          {/* Method selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDepositMethod('bank')}
              className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-black transition-all ${
                depositMethod === 'bank'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>CHUYỂN KHOẢN NGÂN HÀNG</span>
            </button>

            <button
              onClick={() => setDepositMethod('usdt')}
              className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-black transition-all ${
                depositMethod === 'usdt'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span className="text-base">₮</span>
              <span>NẠP USDT (TRC20)</span>
            </button>
          </div>

          {/* BANK DEPOSIT (ADMIN VIETQR) */}
          {depositMethod === 'bank' && walletData && (
            <div className="card-glass p-5 space-y-4 border-slate-700/80">
              <h3 className="text-sm font-black text-amber-400 text-center uppercase tracking-wider">
                THÔNG TIN CHUYỂN KHOẢN ADMIN
              </h3>

              {/* VietQR Image Preview */}
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl max-w-[200px] mx-auto shadow-xl">
                <img
                  src={`https://img.vietqr.io/image/MBBANK-${walletData.adminPayment.accountNumber}-compact2.png?amount=${depositAmount}&accountName=${encodeURIComponent(walletData.adminPayment.accountHolder)}`}
                  alt="VietQR Admin"
                  className="w-44 h-44 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-[10px] font-bold text-slate-800 mt-1">Quét QR chuyển khoản nhanh</span>
              </div>

              {/* Admin Bank Details Grid */}
              <div className="space-y-2 text-xs font-semibold text-slate-300 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Ngân hàng:</span>
                  <span className="font-black text-white">{walletData.adminPayment.bankName}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-amber-400 text-sm">{walletData.adminPayment.accountNumber}</span>
                    <button
                      onClick={() => handleCopy(walletData.adminPayment.accountNumber, 'acc_num')}
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {copiedKey === 'acc_num' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Chủ tài khoản:</span>
                  <span className="font-black text-white">{walletData.adminPayment.accountHolder}</span>
                </div>
              </div>

              {/* Amount selector */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 block">Số tiền chuyển (VNĐ):</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-amber-400 font-black text-lg p-3 rounded-xl w-full text-center focus:outline-none focus:border-amber-400"
                />
                <div className="text-[11px] text-slate-400 text-center font-bold">
                  Nhận ngay: <span className="text-amber-400">{Number(depositAmount || 0).toLocaleString()} Xu</span>
                </div>
              </div>

              <button
                onClick={handleConfirmDeposit}
                disabled={submitting}
                className="w-full py-4 btn-game-primary text-base"
              >
                <span>XÁC NHẬN ĐÃ CHUYỂN KHOẢN 🚀</span>
              </button>
            </div>
          )}

          {/* USDT DEPOSIT */}
          {depositMethod === 'usdt' && walletData && (
            <div className="card-glass p-5 space-y-4 border-slate-700/80">
              <h3 className="text-sm font-black text-emerald-400 text-center uppercase tracking-wider">
                NẠP USDT KỶ NGUYÊN SỐ (TRC20)
              </h3>

              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-center space-y-2">
                <div className="text-xs font-bold text-slate-400">Địa chỉ ví Admin USDT (TRC20):</div>
                <div className="bg-slate-950 p-2.5 rounded-lg text-xs font-mono font-bold text-emerald-400 break-all border border-slate-800">
                  {walletData.adminPayment.usdtAddress}
                </div>
                <button
                  onClick={() => handleCopy(walletData.adminPayment.usdtAddress, 'usdt_addr')}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 inline-flex items-center gap-1.5 active:scale-95"
                >
                  {copiedKey === 'usdt_addr' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'usdt_addr' ? 'Đã sao chép' : 'Sao chép địa chỉ ví'}</span>
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <div className="flex justify-between border-b border-slate-800 py-1 font-semibold">
                  <span className="text-slate-400">Tỷ giá nạp:</span>
                  <span className="font-black text-emerald-400">1 USDT = 25,000 Xu Game</span>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="font-black text-slate-200 block">Số lượng USDT nạp:</label>
                  <input
                    type="number"
                    placeholder="VD: 10"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-emerald-400 font-black text-lg p-3 rounded-xl w-full text-center focus:outline-none focus:border-emerald-400"
                  />
                  <div className="text-[11px] text-slate-400 text-center font-bold">
                    Quy đổi: <span className="text-amber-400">{(Number(depositAmount || 0) * 25000).toLocaleString()} Xu</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Mã giao dịch Hash / Ghi chú:</label>
                  <input
                    type="text"
                    placeholder="Nhập TxHash hoặc ghi chú chuyển"
                    value={depositMemo}
                    onChange={(e) => setDepositMemo(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 p-3 rounded-xl w-full focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleConfirmDeposit}
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <span>XÁC NHẬN ĐÃ NẠP USDT 🚀</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 2: WITHDRAW */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'withdraw' && (
        <div className="card-glass p-5 space-y-4 border-slate-700/80">
          <h3 className="text-sm font-black text-amber-400 text-center uppercase tracking-wider">
            TẠO YÊU CẦU RÚT TIỀN
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setWithdrawMethod('bank')}
              className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-black transition-all ${
                withdrawMethod === 'bank'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>VỀ NGÂN HÀNG</span>
            </button>

            <button
              onClick={() => setWithdrawMethod('usdt')}
              className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-black transition-all ${
                withdrawMethod === 'usdt'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span className="text-base">₮</span>
              <span>VỀ VÍ USDT</span>
            </button>
          </div>

          {/* Linked Bank Card Preview */}
          {withdrawMethod === 'bank' && (
            <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">Tài khoản nhận:</span>
                {walletData?.bankAccount ? (
                  <span className="text-emerald-400 font-black">ĐÃ LIÊN KẾT ✓</span>
                ) : (
                  <button
                    onClick={() => setActiveTab('bank')}
                    className="text-amber-400 underline font-black"
                  >
                    + CHƯA LIÊN KẾT (LIÊN KẾT NGAY)
                  </button>
                )}
              </div>

              {walletData?.bankAccount && (
                <div className="text-xs font-semibold text-slate-200 space-y-0.5">
                  <div><strong>N.Hàng:</strong> {walletData.bankAccount.bank_name}</div>
                  <div><strong>STK:</strong> {walletData.bankAccount.account_number}</div>
                  <div><strong>Chủ TK:</strong> {walletData.bankAccount.account_holder}</div>
                </div>
              )}
            </div>
          )}

          {/* Withdraw Amount Input */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-300 block">Số Xu muốn rút:</label>
            <input
              type="number"
              placeholder="Nhập số Xu (Ví dụ: 5000)"
              value={withdrawCoins}
              onChange={(e) => setWithdrawCoins(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-amber-400 font-black text-lg p-3 rounded-xl w-full text-center focus:outline-none focus:border-amber-400"
            />

            <div className="text-[11px] text-slate-400 text-center font-semibold">
              {withdrawMethod === 'bank' ? (
                <span>Số tiền thực nhận: <strong className="text-amber-400 font-black">{Number(withdrawCoins || 0).toLocaleString()} VNĐ</strong></span>
              ) : (
                <span>Số USDT thực nhận: <strong className="text-emerald-400 font-black">{(Number(withdrawCoins || 0) / 25000).toFixed(2)} USDT</strong></span>
              )}
            </div>
          </div>

          <button
            onClick={handleConfirmWithdraw}
            disabled={submitting}
            className="w-full py-4 btn-game-primary text-base"
          >
            <span>GỬI YÊU CẦU RÚT TIỀN 📤</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 3: LINK BANK ACCOUNT */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'bank' && (
        <form onSubmit={handleSaveBank} className="card-glass p-5 space-y-4 border-slate-700/80">
          <h3 className="text-sm font-black text-amber-400 text-center uppercase tracking-wider">
            LIÊN KẾT TÀI KHOẢN NGÂN HÀNG CÁ NHÂN
          </h3>

          <div className="space-y-3 text-xs font-bold text-slate-300">
            <div className="space-y-1">
              <label className="block">Tên Ngân hàng:</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white p-3 rounded-xl w-full focus:outline-none"
              >
                {POPULAR_BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block">Số tài khoản ngân hàng:</label>
              <input
                type="text"
                placeholder="Nhập số tài khoản"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-amber-400 font-black p-3 rounded-xl w-full focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block">Tên chủ tài khoản (Viết hoa không dấu):</label>
              <input
                type="text"
                placeholder="VD: NGUYEN VAN A"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                className="bg-slate-900 border border-slate-700 text-white font-black p-3 rounded-xl w-full uppercase focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 btn-game-primary text-base"
          >
            <span>LƯU THÔNG TIN NGÂN HÀNG 💾</span>
          </button>
        </form>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 4: TRANSACTION HISTORY */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider">
            LỊCH SỬ NẠP / RÚT ({walletData?.transactions.length || 0})
          </h3>

          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">Đang tải lịch sử...</div>
          ) : walletData?.transactions.length === 0 ? (
            <div className="card-glass p-6 text-center text-xs font-semibold text-slate-400">
              Bạn chưa có giao dịch nạp rút nào.
            </div>
          ) : (
            <div className="space-y-2.5">
              {walletData?.transactions.map((tx) => {
                const isDeposit = tx.type === 'deposit';
                return (
                  <div key={tx.id} className="card-glass p-3 flex items-center justify-between border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        isDeposit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {isDeposit ? '📥' : '📤'}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-white">
                          {isDeposit ? 'Nạp Xu Game' : 'Rút Xu Game'} ({tx.payment_method.toUpperCase()})
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">
                          {new Date(tx.created_at).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-xs font-black ${isDeposit ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isDeposit ? `+${tx.coins.toLocaleString()}` : `-${tx.coins.toLocaleString()}`} Xu
                      </div>
                      <div className="mt-0.5">
                        {tx.status === 'pending' && (
                          <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            Chờ duyệt ⏳
                          </span>
                        )}
                        {tx.status === 'approved' && (
                          <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Thành công ✅
                          </span>
                        )}
                        {tx.status === 'rejected' && (
                          <span className="text-[10px] font-extrabold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                            Từ chối ❌
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
