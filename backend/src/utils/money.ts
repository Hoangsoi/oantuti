export const USDT_RATE = 25000;
export const MAX_TRANSACTION_COINS = 100000000;
export function depositCoins(method: 'bank' | 'usdt', amount: number): number {
  if (!['bank', 'usdt'].includes(method) || !Number.isFinite(amount) || amount <= 0) {
    throw new Error('Số tiền không hợp lệ');
  }
  const coins = Math.floor(amount * (method === 'usdt' ? USDT_RATE : 1));
  if (coins < 10000 || coins > MAX_TRANSACTION_COINS) {
    throw new Error('Mức nạp từ 10.000 đến 100.000.000 Xu (USDT từ 0,4 đến 4.000)');
  }
  return coins;
}
