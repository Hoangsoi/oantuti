import React, { useState, useEffect } from 'react';
import { User, WalletData, Transaction } from '../types';
import { api } from '../services/api';
import { shareTelegramLink, openTelegramDirectChat, triggerHapticImpact, triggerHapticNotification } from '../services/telegram';
import { Copy, Check, Wallet as WalletIcon, Building, MessageCircle, Send } from 'lucide-react';

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

  // Link Bank & USDT Form State
  const [bankName, setBankName] = useState<string>(POPULAR_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>('');
  const [usdtAddress, setUsdtAddress] = useState<string>('');

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState<string>('50000');
  const [depositMemo, setDepositMemo] = useState<string>('');

  // Withdraw Form State
  const [withdrawCoins, setWithdrawCoins] = useState<string>('10000');

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
        if (data.bankAccount.usdt_address) {
          setUsdtAddress(data.bankAccount.usdt_address);
        }
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

  const handleSwitchTab = (tab: 'deposit' | 'withdraw' | 'bank' | 'history') => {
    setActiveTab(tab);
    setCreatedTx(null);
    setSuccessMsg(null);
    setError(null);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerHapticImpact('light');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getAdminNotificationText = (tx: Transaction) => {
    const isDeposit = tx.type === 'deposit';

    let bankDetailText = '';
    if (tx.payment_method === 'usdt') {
      bankDetailText = `Ví USDT TRC20: ${walletData?.bankAccount?.usdt_address || usdtAddress || 'Chưa liên kết'}`;
    } else if (walletData?.bankAccount) {
      bankDetailText = `${walletData.bankAccount.bank_name} - STK: ${walletData.bankAccount.account_number} (${walletData.bankAccount.account_holder})`;
    } else {
      bankDetailText = 'Tài khoản Ngân hàng';
    }

    return isDeposit
      ? `💬 BÁO DUYỆT ĐƠN NẠP XU (@${ADMIN_TELEGRAM_USERNAME})\n-----------------------\n🔑 Mã đơn: #${tx.id}\n👤 Khách hàng: ${currentUser?.first_name} (ID: ${currentUser?.id})\n💰 Số tiền: ${Number(tx.amount).toLocaleString()} ${tx.payment_method === 'usdt' ? 'USDT' : 'VNĐ'}\n🪙 Quy đổi: +${tx.coins.toLocaleString()} Xu\n👉 Vui lòng kiểm tra và duyệt Xu giúp tôi!`
      : `💬 BÁO YÊU CẦU RÚT TIỀN (@${ADMIN_TELEGRAM_USERNAME})\n-----------------------\n🔑 Mã đơn rút: #${tx.id}\n👤 Khách hàng: ${currentUser?.first_name} (ID: ${currentUser?.id})\n🏦 Nơi nhận: ${bankDetailText}\n🪙 Số Xu rút: -${tx.coins.toLocaleString()} Xu\n💵 Số tiền thực nhận: ${Number(tx.amount).toLocaleString()} ${tx.payment_method === 'usdt' ? 'USDT' : 'VNĐ'}\n👉 Vui lòng kiểm tra và chuyển tiền giúp tôi!`;
  };

  const handleOpenDirectAdminChat = (tx: Transaction) => {
    const text = getAdminNotificationText(tx);
    navigator.clipboard.writeText(text);
    openTelegramDirectChat(ADMIN_TELEGRAM_USERNAME);
  };

  const handleSendShareWithPrefilledText = (tx: Transaction) => {
    const text = getAdminNotificationText(tx);
    navigator.clipboard.writeText(text);
    shareTelegramLink(`https://t.me/${ADMIN_TELEGRAM_USERNAME}`, text);
  };

  // Submit Link Bank & USDT Account
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    triggerHapticImpact('medium');
    try {
      const bank = await api.linkBankAccount(bankName, accountNumber, accountHolder, usdtAddress);
      triggerHapticNotification('success');
      setSuccessMsg('Cập nhật thông tin Tài khoản & Ví thành công!');
      if (walletData) {
        setWalletData({ ...walletData, bankAccount: bank });
      }
    } catch (err: any) {
      triggerHapticNotification('error');
      setError(err.message || 'Không thể lưu thông tin tài khoản');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Deposit Request
  const handleConfirmDeposit = async () => {
    const amt = Number(depositAmount);
    if (!amt || amt < 10000) {
      setError('Mức nạp tối thiểu là 10,000đ (hoặc 10,000 Xu)');
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
      setSuccessMsg(`Yêu cầu nạp tiền #${tx.id} đã được khởi tạo thành công!`);
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
    if (!coins || coins < 10000) {
      setError('Mức rút tối thiểu là 10,000 Xu Game');
      return;
    }

    if (withdrawMethod === 'usdt') {
      if (!walletData?.bankAccount?.usdt_address) {
        setError('Vui lòng liên kết Địa chỉ ví USDT (TRC20) tại Tab "Tài Khoản" trước khi tạo yêu cầu rút USDT!');
        setActiveTab('bank');
        return;
      }
    } else if (withdrawMethod === 'bank' && !walletData?.bankAccount) {
      setError('Vui lòng liên kết tài khoản ngân hàng tại Tab "Tài Khoản" trước khi gửi yêu cầu rút tiền!');
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
      setSuccessMsg(`Yêu cầu rút #${result.transaction.id} (${coins.toLocaleString()} Xu) đã gửi thành công!`);
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
          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 hover:bg-slate-700"
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
          onClick={() => handleSwitchTab('deposit')}
          className="px-3.5 py-2 btn-game-primary text-xs font-black"
        >
          + NẠP XU
        </button>
      </div>

      {/* 4 Main Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-center">
        <button
          onClick={() => handleSwitchTab('deposit')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'deposit'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📥 Nạp
        </button>
        <button
          onClick={() => handleSwitchTab('withdraw')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'withdraw'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📤 Rút
        </button>
        <button
          onClick={() => handleSwitchTab('bank')}
          className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'bank'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          💳 Tài Khoản
        </button>
        <button
          onClick={() => handleSwitchTab('history')}
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

      {/* ------------------------------------------------------------------ */}
      {/* CREATED TRANSACTION CONFIRMATION CARD (HIDES FORM BELOW) */}
      {/* ------------------------------------------------------------------ */}
      {createdTx ? (
        <div className="card-glass p-5 space-y-4 border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-2xl animate-bounce">
            ✅
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black text-emerald-400 uppercase tracking-wider">
              {createdTx.type === 'deposit' ? 'ĐÃ KHỞI TẠO ĐƠN NẠP XU' : 'ĐÃ GỬI YÊU CẦU RÚT TIỀN'}
            </h3>
            {successMsg && <p className="text-xs font-bold text-emerald-300">{successMsg}</p>}
            <p className="text-xs font-bold text-slate-300">
              Vui lòng gửi thông báo cho Admin (@{ADMIN_TELEGRAM_USERNAME}) để được duyệt tự động.
            </p>
          </div>

          {/* Transaction Summary Box */}
          <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2 text-left">
            <div className="flex justify-between border-b border-slate-800 pb-1.5 font-semibold">
              <span className="text-slate-400">Mã đơn hàng:</span>
              <span className="font-black text-amber-400">#{createdTx.id}</span>
            </div>

            <div className="flex justify-between border-b border-slate-800 py-1.5 font-semibold">
              <span className="text-slate-400">Loại giao dịch:</span>
              <span className="font-extrabold text-white">
                {createdTx.type === 'deposit' ? 'Nạp Xu Game' : 'Rút Xu Game'} ({createdTx.payment_method.toUpperCase()})
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-800 py-1.5 font-semibold">
              <span className="text-slate-400">Số tiền:</span>
              <span className="font-black text-emerald-400 text-sm">
                {Number(createdTx.amount).toLocaleString()} {createdTx.payment_method === 'usdt' ? 'USDT' : 'VNĐ'}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-800 py-1.5 font-semibold">
              <span className="text-slate-400">Số Xu giao dịch:</span>
              <span className="font-black text-amber-400 text-sm">
                {createdTx.type === 'deposit' ? '+' : '-'}{createdTx.coins.toLocaleString()} Xu
              </span>
            </div>

            {createdTx.type === 'deposit' && (
              <div className="flex justify-between py-1.5 font-semibold">
                <span className="text-slate-400">Nội dung CK:</span>
                <span className="font-black text-amber-300">{createdTx.memo}</span>
              </div>
            )}
          </div>

          {/* Action Buttons to Send Admin Message */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleOpenDirectAdminChat(createdTx)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>1. CHAT TRỰC TIẾP VỚI ADMIN THÔNG BÁO DUYỆT 💬</span>
            </button>

            <button
              onClick={() => handleSendShareWithPrefilledText(createdTx)}
              className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              <span>2. GỬI TIN NHẮN THEO MẪU CÓ SẴN 📩</span>
            </button>

            <button
              onClick={() => setCreatedTx(null)}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white font-bold"
            >
               Quay lại Ví
            </button>
          </div>
        </div>
      ) : (
        /* NORMAL TAB CONTENT */
        <>
          {/* ------------------------------------------------------------------ */}
          {/* TAB 1: DEPOSIT */}
          {/* ------------------------------------------------------------------ */}
          {activeTab === 'deposit' && (
            <div className="space-y-4">
              {/* Method Selector */}
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
                  <span>NGÂN HÀNG (VIETQR)</span>
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

                  {/* VietQR / Custom Admin QR Image Preview */}
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl max-w-[200px] mx-auto shadow-xl">
                    <img
                      src={
                        walletData.adminPayment.qrCodeUrl && walletData.adminPayment.qrCodeUrl.trim()
                          ? walletData.adminPayment.qrCodeUrl
                          : `https://img.vietqr.io/image/MBBANK-${walletData.adminPayment.accountNumber}-compact2.png?amount=${depositAmount}&accountName=${encodeURIComponent(walletData.adminPayment.accountHolder)}`
                      }
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
                    <label className="text-xs font-black text-slate-300 block">
                      Số tiền chuyển (VNĐ) - Tối thiểu 10,000đ:
                    </label>
                    <input
                      type="number"
                      min={10000}
                      step={1000}
                      placeholder="Nhập số tiền (VD: 50000)"
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
                      <label className="font-black text-slate-200 block">Số lượng USDT nạp (Tối thiểu 10,000đ):</label>
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
                TẠO YÊU CẦU RÚT TIỀN (TỐI THIỂU 10,000 XU)
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

              {/* Linked Bank Account Preview */}
              {withdrawMethod === 'bank' && (
                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">Tài khoản ngân hàng nhận:</span>
                    {walletData?.bankAccount ? (
                      <span className="text-emerald-400 font-black">ĐÃ LIÊN KẾT ✓</span>
                    ) : (
                      <button
                        onClick={() => handleSwitchTab('bank')}
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

              {/* Linked USDT Wallet Address Preview */}
              {withdrawMethod === 'usdt' && (
                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">Địa chỉ ví USDT (TRC20) nhận tiền:</span>
                    {walletData?.bankAccount?.usdt_address ? (
                      <span className="text-emerald-400 font-black">ĐÃ LIÊN KẾT ✓</span>
                    ) : (
                      <button
                        onClick={() => handleSwitchTab('bank')}
                        className="text-emerald-400 underline font-black"
                      >
                        + THÊM ĐỊA CHỈ VÍ USDT
                      </button>
                    )}
                  </div>

                  {walletData?.bankAccount?.usdt_address ? (
                    <div className="text-xs font-mono font-bold text-emerald-400 break-all bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      {walletData.bankAccount.usdt_address}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold space-y-1">
                      <div>⚠️ Bạn chưa cài đặt Địa chỉ ví USDT nhận tiền.</div>
                      <button
                        onClick={() => handleSwitchTab('bank')}
                        className="text-amber-400 font-black underline text-xs block"
                      >
                        👉 Bấm vào đây để cài đặt ví USDT ngay tại Tab "Tài Khoản"
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Withdraw Amount Input */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 block">
                  Số Xu muốn rút (Tối thiểu 10,000 Xu):
                </label>
                <input
                  type="number"
                  min={10000}
                  step={1000}
                  placeholder="Nhập số Xu (Ví dụ: 10000)"
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
          {/* TAB 3: LINK BANK & USDT ACCOUNT */}
          {/* ------------------------------------------------------------------ */}
          {activeTab === 'bank' && (
            <form onSubmit={handleSaveBank} className="card-glass p-5 space-y-4 border-slate-700/80">
              <h3 className="text-sm font-black text-amber-400 text-center uppercase tracking-wider">
                LIÊN KẾT TÀI KHOẢN NGÂN HÀNG & VÍ USDT
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
                    placeholder="Nhập số tài khoản ngân hàng"
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

                {/* USDT Wallet Address Field */}
                <div className="space-y-1 pt-2 border-t border-slate-800">
                  <label className="block text-emerald-400 flex items-center gap-1 font-black">
                    <span>₮ Địa chỉ ví USDT nhận tiền (Mạng TRC20):</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập địa chỉ ví USDT TRC20 (VD: T9yD14Nj...)"
                    value={usdtAddress}
                    onChange={(e) => setUsdtAddress(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs font-bold p-3 rounded-xl w-full focus:outline-none focus:border-emerald-400"
                  />
                  <p className="text-[10px] text-slate-400 font-normal">
                    💡 Dùng để tự động rút tiền khi bạn chọn rút về <strong>Ví USDT (TRC20)</strong>.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 btn-game-primary text-base"
              >
                <span>LƯU THÔNG TIN TÀI KHOẢN & VÍ 💾</span>
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
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                              isDeposit
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {isDeposit ? '📥' : '📤'}
                          </div>

                          <div className="space-y-0.5">
                            <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                              <span>{isDeposit ? 'Nạp Xu Game' : 'Rút Xu Game'}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({tx.payment_method.toUpperCase()})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              #{tx.id} • {new Date(tx.created_at).toLocaleString('vi-VN')}
                            </div>
                          </div>
                        </div>

                        <div className="text-right space-y-0.5">
                          <div
                            className={`text-xs font-black ${
                              isDeposit ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {isDeposit ? '+' : '-'}{tx.coins.toLocaleString()} Xu
                          </div>

                          <div>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                tx.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : tx.status === 'rejected'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                              }`}
                            >
                              {tx.status === 'approved'
                                ? 'Đã duyệt ✓'
                                : tx.status === 'rejected'
                                ? 'Từ chối'
                                : 'Đang xử lý ⏳'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
