import crypto from 'crypto';
import { verifyTelegramInitData } from './telegram';

function createMockInitData(botToken: string, includeSignature: boolean): string {
  const authDate = Math.floor(Date.now() / 1000);
  const user = {
    id: 123456789,
    first_name: 'TestUser',
    username: 'test_user',
  };

  const params = new URLSearchParams();
  params.set('auth_date', authDate.toString());
  params.set('query_id', 'AAH99887766');
  params.set('user', JSON.stringify(user));

  // Sort and build dataCheckString (excluding hash and signature)
  const paramPairs: string[] = [];
  params.forEach((val, key) => {
    paramPairs.push(`${key}=${val}`);
  });
  paramPairs.sort();

  const dataCheckString = paramPairs.join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  params.set('hash', hash);

  // Telegram iOS app appends signature to initData string alongside hash
  if (includeSignature) {
    params.set('signature', 'mock_telegram_ios_signature_token_abc123');
  }

  return params.toString();
}

function runTests() {
  const testBotToken = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';

  console.log('🧪 Running Telegram InitData Validation Tests...');

  // Test 1: Legacy initData (without signature)
  const legacyInitData = createMockInitData(testBotToken, false);
  const legacyResult = verifyTelegramInitData(legacyInitData, testBotToken);

  if (legacyResult.isValid && legacyResult.user?.id === 123456789) {
    console.log('✅ TEST 1 PASSED: Legacy initData (without signature) verified successfully!');
  } else {
    console.error('❌ TEST 1 FAILED: Legacy initData validation failed!');
    process.exit(1);
  }

  // Test 2: New initData (with signature - iOS Telegram format)
  const newInitData = createMockInitData(testBotToken, true);
  const newResult = verifyTelegramInitData(newInitData, testBotToken);

  if (newResult.isValid && newResult.user?.id === 123456789) {
    console.log('✅ TEST 2 PASSED: New iOS initData (with signature) verified successfully!');
  } else {
    console.error('❌ TEST 2 FAILED: New iOS initData validation failed!');
    process.exit(1);
  }

  console.log('🎉 ALL TELEGRAM INITDATA VALIDATION TESTS PASSED SUCCESSFULLY!');
}

runTests();
