import https from 'https';
import { config } from '../config';

let isPolling = false;
let offset = 0;

function makeTelegramRequest(method: string, payload: any, requestTimeoutMs: number = 8000): Promise<any> {
  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${config.botToken}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: requestTimeoutMs,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.on('error', () => resolve(null));
    req.write(postData);
    req.end();
  });
}

async function registerBotCommands() {
  const commands = [
    { command: 'start', description: '🎮 Mở Game Oẳn Tù Tì Mini App' },
    { command: 'play', description: '⚔️ Vào Đấu Trường ngay' },
    { command: 'help', description: '💡 Hướng dẫn chơi & hỗ trợ' },
  ];
  await makeTelegramRequest('setMyCommands', { commands });
}

async function sendWelcomeMessage(chatId: number, firstName: string, startParam?: string) {
  const webAppUrl = process.env.FRONTEND_URL || 'https://oantuti.onrender.com';
  const targetUrl = startParam ? `${webAppUrl}?startapp=${startParam}` : webAppUrl;

  const text =
    `⚔️ *CHÀO MỪNG ${firstName.toUpperCase()} ĐẾN VỚI OẲN TÙ TÌ ARENA!*\n\n` +
    `🎮 *Đấu Trường Oẳn Tù Tì Telegram Mini App* đỉnh cao:\n` +
    `• 🥊 *Thách đấu PvP* trực tiếp với người chơi real-time!\n` +
    `• 🤖 *Đấu với Bot* miễn phí thử sức!\n` +
    `• 🎁 *Hoa Hồng Giới Thiệu* 5 cấp độ hấp dẫn!\n` +
    `• 🏆 *Bảng Xếp Hạng* Cao Thủ cập nhật liên tục!\n\n` +
    `👇 Bấm nút *🎮 CHƠI NGAY* bên dưới để tham gia đấu trường ngay lập tức:`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '🎮 CHƠI NGAY 🚀',
          web_app: { url: targetUrl },
        },
      ],
      [
        {
          text: '💬 Hỗ Trợ Admin',
          url: `https://t.me/${config.adminTelegramUsername || 'ottadmin2026'}`,
        },
      ],
    ],
  };

  await makeTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

async function pollUpdates() {
  if (!isPolling) return;

  let nextPollDelay = 2000;

  try {
    const res = await makeTelegramRequest(
      'getUpdates',
      {
        offset: offset,
        timeout: 2, // Fast non-blocking 2s poll
        allowed_updates: ['message'],
      },
      5000
    );

    if (res && res.ok && Array.isArray(res.result)) {
      nextPollDelay = 1000;
      for (const update of res.result) {
        offset = update.update_id + 1;

        if (update.message && update.message.chat) {
          const chatId = update.message.chat.id;
          const firstName = update.message.from?.first_name || 'Bạn';
          const text = update.message.text || '';

          let startParam = '';
          if (text.startsWith('/start')) {
            const parts = text.split(' ');
            if (parts.length > 1) {
              startParam = parts[1];
            }
          }

          console.log(`[Telegram Bot] Chat ${chatId} sent command: ${text}`);
          await sendWelcomeMessage(chatId, firstName, startParam);
        }
      }
    } else if (res && !res.ok) {
      // If 409 Conflict or other error, pause polling to avoid CPU/network socket saturation
      console.warn('[Telegram Bot Polling Warning]', res.description || 'Conflict or error');
      nextPollDelay = 5000;
    }
  } catch (err) {
    console.error('[Telegram Bot Polling Error]:', err);
    nextPollDelay = 5000;
  }

  if (isPolling) {
    setTimeout(pollUpdates, nextPollDelay);
  }
}

export function startTelegramBot() {
  if (!config.botToken || config.botToken.includes('AAEXAMPLE')) {
    console.log('⚠️ [Telegram Bot] BOT_TOKEN không được cấu hình. Bỏ qua bot listener.');
    return;
  }

  if (isPolling) return;
  isPolling = true;

  console.log('🤖 [Telegram Bot] Đang khởi chạy Telegram Bot Polling...');
  registerBotCommands();
  setTimeout(pollUpdates, 3000);
}

export function stopTelegramBot() {
  isPolling = false;
}
