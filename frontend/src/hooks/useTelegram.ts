import { useEffect, useState } from 'react';
import { getTelegramWebApp, initTelegramApp } from '../services/telegram';

export function useTelegram() {
  const [initData, setInitData] = useState<string>('');
  const [startParam, setStartParam] = useState<string | undefined>(undefined);
  const [isTelegram, setIsTelegram] = useState<boolean>(false);

  useEffect(() => {
    initTelegramApp();
    const tg = getTelegramWebApp();
    if (tg) {
      setIsTelegram(true);
      setInitData(tg.initData || '');
      setStartParam(tg.initDataUnsafe?.start_param);
    }
  }, []);

  return {
    initData,
    startParam,
    isTelegram,
  };
}
