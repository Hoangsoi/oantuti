// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WalletPage } from '../src/pages/WalletPage';
import { api } from '../src/services/api';

vi.mock('../src/services/api', () => ({ api: {
  getWalletInfo: vi.fn(), withdraw: vi.fn(), linkBankAccount: vi.fn(), deposit: vi.fn(),
} }));
vi.mock('../src/services/telegram', () => ({
  shareTelegramLink: vi.fn(), openTelegramDirectChat: vi.fn(),
  triggerHapticImpact: vi.fn(), triggerHapticNotification: vi.fn(),
}));

const user = { id: 1, first_name: 'Khách', coins: 20000 } as any;
const wallet = {
  bankAccount: { id: 1, user_id: 1, bank_name: 'Bank', account_number: '123', account_holder: 'KHACH' },
  transactions: [],
  adminPayment: {
    bankName: 'Admin Bank', accountNumber: '999', accountHolder: 'ADMIN',
    usdtAddress: 'wallet', usdtNetwork: 'TRC20', usdtRate: 25000, bankRate: 1,
  },
  withdrawalTurnover: {
    requiredWager: 10000, completedWager: 4000, remainingWager: 6000,
    progressPercent: 40, isEligible: false,
  },
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('withdrawal turnover UI', () => {
  it('shows 4,000/10,000 progress and disables withdrawal before eligibility', async () => {
    vi.mocked(api.getWalletInfo).mockResolvedValue(wallet as any);
    render(<WalletPage currentUser={user} onUserUpdated={vi.fn()} onBackHome={vi.fn()} />);
    await waitFor(() => expect(api.getWalletInfo).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Rút/ }));
    expect(screen.getByText('4.000/10.000 Xu')).toBeTruthy();
    expect(screen.getByText('Cần thêm 6.000 Xu')).toBeTruthy();
    const progress = screen.getByRole('progressbar', { name: 'Tiến độ doanh số cược' });
    expect(progress.getAttribute('aria-valuenow')).toBe('40');
    expect(screen.getByRole('button', { name: 'CHƯA ĐỦ DOANH SỐ CƯỢC' })).toHaveProperty('disabled', true);
  });

  it('enables withdrawal when wagering reaches the approved deposit total', async () => {
    vi.mocked(api.getWalletInfo).mockResolvedValue({
      ...wallet,
      withdrawalTurnover: {
        requiredWager: 10000, completedWager: 10000, remainingWager: 0,
        progressPercent: 100, isEligible: true,
      },
    } as any);
    render(<WalletPage currentUser={user} onUserUpdated={vi.fn()} onBackHome={vi.fn()} />);
    await waitFor(() => expect(api.getWalletInfo).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Rút/ }));
    expect(screen.getByText('ĐỦ ĐIỀU KIỆN ✓')).toBeTruthy();
    expect(screen.getByRole('button', { name: /GỬI YÊU CẦU RÚT TIỀN/ })).toHaveProperty('disabled', false);
  });
});
