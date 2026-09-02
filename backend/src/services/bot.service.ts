import https from 'https';
import { config } from '../config';

let isPolling = false;
let offset = 0;

function makeTelegramRequest(method: string, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${config.botToken}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
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

    req.on('error', (err) => resolve(null));
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

  try {
    const res = await makeTelegramRequest('getUpdates', {
      offset: offset,
      timeout: 20,
      allowed_updates: ['message'],
    });

    if (res && res.ok && Array.isArray(res.result)) {
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
    }
  } catch (err) {
    console.error('[Telegram Bot Polling Error]:', err);
  }

  if (isPolling) {
    setTimeout(pollUpdates, 1000);
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
  pollUpdates();
}

export function stopTelegramBot() {
  isPolling = false;
}
