const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'integration-test-secret-not-for-production';
process.env.BOT_TOKEN = '';
process.env.DATABASE_URL = 'postgres://test:test@localhost/test';
const db = require('../dist/database');
const pg = new PGlite();
let tail = Promise.resolve();
async function acquire() {
  let release;
  const next = new Promise(r=>release=r);
  const previous=tail; tail=next;
  await previous; return release;
}
async function raw(sql,params) {
  if (params?.length) return pg.query(sql,params);
  const results=await pg.exec(sql); return results.at(-1) || {rows:[]};
}
db.query = async (sql,params) => { const release=await acquire(); try { return await raw(sql,params); } finally {release();} };
db.pool.connect = async () => {
  let release;
  return {
    async query(sql,params) {
      if (sql === 'BEGIN') { release=await acquire(); return raw(sql); }
      if (!release) return db.query(sql,params);
      try { return await raw(sql,params); }
      finally { if (sql==='COMMIT'||sql==='ROLLBACK') {release();release=undefined;} }
    },
    release() { if (release) {release();release=undefined;} },
  };
};
const rooms = require('../dist/services/room.service');
const wallet = require('../dist/services/wallet.service');
const admin = require('../dist/services/admin.service');
const auth = require('../dist/services/auth.service');
const {authMiddleware} = require('../dist/middleware/auth.middleware');
const jwt = require('jsonwebtoken');
let serial=100;
async function user(coins=50000, extra={}) {
  serial++;
  const r=await db.query('INSERT INTO users(telegram_id,first_name,coins,referral_code,is_company_account,referred_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [serial,'Test '+serial,coins,'REF_'+serial,!!extra.company,extra.parent||null]);
  return r.rows[0];
}
async function balance(id) {return (await db.query('SELECT coins FROM users WHERE id=$1',[id])).rows[0].coins;}
async function match(bet=10000,coins=50000,extra={}) {
  const h=await user(coins,extra),g=await user(coins);
  const r=await rooms.createRoom(h.id,bet);
  const ready=await rooms.joinRoom(g.id,r.room_code);
  return {h,g,r:ready};
}
before(async () => { await pg.waitReady; await db.initDatabase(); });
after(async()=> {await pg.close();await db.pool.end();});

test('migration is repeatable and never purges a matching demo name', async()=> {
  const u=await user();
  await db.query("UPDATE users SET first_name='Tuấn ( Demo )' WHERE id=$1",[u.id]);
  const before=(await db.query('SELECT COUNT(*) AS n FROM coin_ledger')).rows[0].n;
  await db.initDatabase();
  assert.equal(await balance(u.id),50000);
  assert.equal((await db.query('SELECT COUNT(*) AS n FROM coin_ledger')).rows[0].n,before);
});

test('forged Telegram authentication fails before touching user records', async()=> {
  await assert.rejects(auth.authenticateTelegramUser('user='+encodeURIComponent(JSON.stringify({id:8780377211,first_name:'Fake'}))),/không hợp lệ/);
  await assert.rejects(auth.authenticateTelegramUser(''),/không hợp lệ/);
  assert.equal((await db.query('SELECT id FROM users WHERE telegram_id=8780377211')).rows.length,0);
});

test('topup route is removed and blocked tokens cannot authenticate',async()=> {
  const router=require('../dist/routes/me').default;
  assert.equal(router.stack.some(layer=>layer.route?.path==='/topup'),false);
  const u=await user();
  await admin.toggleBlockUser(u.id);
  let status,body,next=false;
  const res={status(code){status=code;return this;},json(data){body=data;return this;}};
  await authMiddleware({headers:{authorization:'Bearer '+jwt.sign({userId:u.id},process.env.JWT_SECRET)}},res,()=>next=true);
  assert.equal(status,403);assert.equal(next,false);assert.match(body.message,/khóa/);
});

test('escrow prevents withdrawal of staked coins and settle/retry pays once',async()=> {
  const {h,g,r}=await match(10000,10000);
  assert.equal(await balance(h.id),0);assert.equal(await balance(g.id),0);
  await assert.rejects(wallet.createWithdrawRequest(g.id,'bank',10000),/không đủ/);
  await rooms.playRoomMove(h.id,r.room_code,'rock',r.round_no);
  await rooms.playRoomMove(g.id,r.room_code,'scissors',r.round_no);
  await rooms.playRoomMove(g.id,r.room_code,'scissors',r.round_no);
  assert.equal(await balance(h.id),19500);assert.equal(await balance(g.id),0);
  assert.equal((await db.query('SELECT * FROM room_rounds WHERE room_id=$1',[r.id])).rows.length,1);
  await rooms.resetRoom(h.id,r.room_code,r.round_no);
  await assert.rejects(rooms.resetRoom(g.id,r.room_code,r.round_no),/không đủ/);
});

test('competing joins accept one guest; expired rooms and active resets/leaves are rejected',async()=> {
  const h=await user(),a=await user(),b=await user();
  const r=await rooms.createRoom(h.id,10000);
  const results=await Promise.allSettled([rooms.joinRoom(a.id,r.room_code),rooms.joinRoom(b.id,r.room_code)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  await assert.rejects(rooms.resetRoom(h.id,r.room_code,1),/kết thúc/);
  await assert.rejects(rooms.leaveRoom(h.id,r.room_code),/đang diễn ra/);
  const other=await user(); const waiting=await rooms.createRoom(other.id,0);
  await rooms.leaveRoom(other.id,waiting.room_code);
  await assert.rejects(rooms.joinRoom(b.id,waiting.room_code),/kết thúc/);
});

test('draw refunds both stakes, pays no commission/VIP and rematch preserves history',async()=> {
  const parent=await user(0);
  const {h,g,r}=await match(10000,50000,{parent:parent.id});
  await rooms.playRoomMove(h.id,r.room_code,'rock',1);
  await rooms.playRoomMove(g.id,r.room_code,'rock',1);
  assert.equal(await balance(h.id),50000);assert.equal(await balance(g.id),50000);assert.equal(await balance(parent.id),0);
  const row=(await db.query('SELECT * FROM room_rounds WHERE room_id=$1',[r.id])).rows[0];assert.equal(row.fee_amount,0);
  assert.equal(Number((await db.query('SELECT total_wager_amount FROM users WHERE id=$1',[h.id])).rows[0].total_wager_amount),0);
  const consent=await rooms.resetRoom(h.id,r.room_code,1);assert.equal(consent.status,'completed');
  const ready=await rooms.resetRoom(g.id,r.room_code,1);assert.equal(ready.round_no,2);
  await rooms.resetRoom(g.id,r.room_code,1);assert.equal(await balance(g.id),40000);
  await assert.rejects(rooms.playRoomMove(h.id,r.room_code,'rock',1),/thay đổi/);
  await rooms.playRoomMove(h.id,r.room_code,'paper',2);await rooms.playRoomMove(g.id,r.room_code,'rock',2);
  const rounds=(await db.query('SELECT fee_amount FROM room_rounds WHERE room_id=$1 ORDER BY round_no',[r.id])).rows;
  assert.deepEqual(rounds.map(r=>r.fee_amount),[0,500]);assert.equal(await balance(parent.id),100);
});

test('timeout is server-side and settles once without client polling',async()=> {
  const {h,g,r}=await match();
  await rooms.playRoomMove(h.id,r.room_code,'paper',1);
  await db.query("UPDATE rooms SET round_deadline=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE id=$1",[r.id]);
  await Promise.all([rooms.resolveRoomTimeout(r.room_code),rooms.resolveRoomTimeout(r.room_code)]);
  assert.equal(await balance(h.id),59500);assert.equal(await balance(g.id),40000);
});

test('settings survive process-env changes and item 7 company visibility/bot behavior remains',async()=> {
  await admin.updatePaymentConfig({bankName:'Test bank',accountNumber:'987654',accountHolder:'TEST',usdtAddress:'test-wallet',botWinRate:100});
  process.env.ADMIN_BANK_ACCOUNT='old-value';process.env.BOT_WIN_RATE='0';
  assert.equal((await wallet.getAdminPaymentInfo()).accountNumber,'987654');
  const {h,g,r}=await match(0,50000,{company:true});
  await rooms.playRoomMove(g.id,r.room_code,'rock',1);
  assert.equal((await rooms.getRoomState(h.id,r.room_code)).guest_move,'rock');
  await rooms.playRoomMove(h.id,r.room_code,'paper',1);
  await rooms.ensureVirtualRooms();
  const bots=await rooms.getWaitingRooms();const bot=bots.find(r=>r.is_bot_room && r.bet_amount<=50000);
  const player=await user(1000000);const ready=await rooms.joinRoom(player.id,bot.room_code);
  const done=await rooms.playRoomMove(player.id,bot.room_code,'rock',ready.round_no);
  assert.equal(done.host_move,'paper');assert.equal(done.winner_id,done.host_id);
});

test('financial ledger reconciles every balance and admin can clear test data safely',async()=> {
  const u=await user(10000);await admin.adjustUserCoins(u.id,5000,'test');
  await assert.rejects(admin.adjustUserCoins(u.id,-20000),/dưới 0/);
  await admin.deleteUser(u.id);assert.equal(await balance(u.id),15000);
  const resetRes = await admin.clearAllSystemData(0);
  assert.equal(resetRes.success, true);
  const mismatches=await db.query('SELECT u.id FROM users u LEFT JOIN coin_ledger l ON l.user_id=u.id GROUP BY u.id,u.coins HAVING u.coins <> COALESCE(SUM(l.delta),0)');
  assert.equal(mismatches.rows.length,0);
  await assert.rejects(db.query('UPDATE coin_ledger SET delta=0 WHERE user_id=$1',[u.id]),/immutable/);
});

test('withdrawal destination is frozen, approval/rejection and deposits are one-time',async()=> {
  await admin.updatePaymentConfig({bankName:'Test bank',accountNumber:'987654',accountHolder:'TEST',usdtAddress:'test-wallet'});
  const u=await user(50000);
  await wallet.linkBankAccount(u.id,'Bank A','11111','Test A','wallet-a');
  const request=await wallet.createWithdrawRequest(u.id,'bank',10000);
  await wallet.linkBankAccount(u.id,'Bank B','22222','Test B','wallet-b');
  const pending=await admin.getPendingTransactions();
  assert.equal(pending.find(t=>t.id===request.transaction.id).account_number,'11111');
  await admin.rejectTransaction(request.transaction.id);
  await assert.rejects(admin.rejectTransaction(request.transaction.id),/trạng thái/);
  assert.equal(await balance(u.id),50000);
  const deposit=await wallet.createDepositRequest(u.id,'usdt',0.4,'test deposit');
  assert.equal(deposit.coins,10000);
  await admin.approveTransaction(deposit.id);
  await assert.rejects(admin.approveTransaction(deposit.id),/trạng thái/);
  assert.equal(await balance(u.id),60000);
});

test('house profit includes fee once, completed rounds are immutable and no fee on draws',async()=> {
  const before=await admin.getGameStats();
  const {h,g,r}=await match(10000,50000,{company:true});
  await rooms.playRoomMove(h.id,r.room_code,'rock',1);
  await rooms.playRoomMove(g.id,r.room_code,'scissors',1);
  const after=await admin.getGameStats();
  assert.equal(after.netHouseProfit-before.netHouseProfit,10000);
  await assert.rejects(db.query('UPDATE room_rounds SET fee_amount=0 WHERE room_id=$1',[r.id]),/cannot be changed/);
});
