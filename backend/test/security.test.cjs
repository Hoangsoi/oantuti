const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'a-test-secret-that-is-never-used-in-production';
process.env.BOT_TOKEN = 'test:token';
process.env.DATABASE_URL = 'postgres://test:test@localhost/test';
const { verifyTelegramInitData } = require('../dist/utils/telegram');
const { depositCoins } = require('../dist/utils/money');

function signed(extra = {}, user = {id: 12345, first_name: 'Tester'}) {
  const fields = {auth_date: String(Math.floor(Date.now()/1000)), user: JSON.stringify(user), ...extra};
  const data = Object.keys(fields).sort().map(k => `${k}=${fields[k]}`).join('\n');
  const key = crypto.createHmac('sha256','WebAppData').update(process.env.BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256',key).update(data).digest('hex');
  return new URLSearchParams({...fields,hash}).toString();
}

test('Telegram: valid HMAC including signature; tampered fields, duplicates, expired and malformed users fail', () => {
  for (const extra of [{}, {signature:'signed-third-party-field'}]) {
    const data = signed(extra);
    assert.equal(verifyTelegramInitData(data,process.env.BOT_TOKEN).isValid,true);
    const tampered = new URLSearchParams(data);
    tampered.set('user',JSON.stringify({id:8780377211,first_name:'Admin'}));
    assert.equal(verifyTelegramInitData(tampered.toString(),process.env.BOT_TOKEN).isValid,false);
    assert.equal(verifyTelegramInitData(data+'&user=%7B%7D',process.env.BOT_TOKEN).isValid,false);
  }
  assert.equal(verifyTelegramInitData(signed({auth_date:'1'}),process.env.BOT_TOKEN).isValid,false);
  assert.equal(verifyTelegramInitData(signed({auth_date:'123abc'}),process.env.BOT_TOKEN).isValid,false);
  assert.equal(verifyTelegramInitData(signed({}, {id:-101,first_name:'Bot'}),process.env.BOT_TOKEN).isValid,false);
  assert.equal(verifyTelegramInitData('user={}',process.env.BOT_TOKEN).isValid,false);
});

test('deposit units and maximum conversion protect INT balance inputs', () => {
  assert.equal(depositCoins('usdt',0.4),10000);
  assert.equal(depositCoins('usdt',10),250000);
  assert.equal(depositCoins('bank',10000),10000);
  for (const amount of [0,-1,0.399,4000.1,Infinity,NaN]) assert.throws(()=>depositCoins('usdt',amount));
});

test('CORS only allows configured origins and production fails without mandatory secrets', () => {
  const {config,validateConfig}=require('../dist/config');
  const {isAllowedOrigin}=require('../dist/config/cors');
  process.env.FRONTEND_URL='https://game.example';
  assert.equal(isAllowedOrigin('https://game.example'),true);
  assert.equal(isAllowedOrigin('https://attacker.onrender.com'),false);
  assert.equal(isAllowedOrigin('https://game.example.evil.com'),false);
  const previous=config.nodeEnv;
  config.nodeEnv='production';
  const secret=process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  assert.throws(validateConfig,/JWT_SECRET/);
  process.env.JWT_SECRET=secret;config.nodeEnv=previous;
});
