require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { Server } = require('socket.io');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/colour_win_x';
const ROUND_INTERVAL = parseInt(process.env.ROUND_INTERVAL_SECONDS || '30', 10);
const PAYOUT = parseFloat(process.env.PAYOUT_MULTIPLIER || '2.85');

mongoose.connect(MONGO).then(()=>console.log('mongo connected')).catch(e=>console.error(e));

const Schema = mongoose.Schema;
const UserSchema = new Schema({ phone:String, displayName:String, wallet:{type:Number,default:1000} });
const RoundSchema = new Schema({ id:Number, seedHash:String, revealedSeed:String, result:String, startAt:Date, endsAt:Date, payoutMultiplier:Number, betsCount:Number, nonce:Number });
const BetSchema = new Schema({ userId:Schema.Types.ObjectId, roundId:Number, color:Schema.Types.Mixed, amt:Number, payout:Number, win:Boolean, createdAt:{type:Date,default:Date.now} });

const User = mongoose.model('User', UserSchema);
const Round = mongoose.model('Round', RoundSchema);
const Bet = mongoose.model('Bet', BetSchema);

function genServerSeed(){ const seed = crypto.randomBytes(32).toString('hex'); const hash = crypto.createHash('sha256').update(seed).digest('hex'); return {seed,hash}; }
function computeResult(serverSeed, nonce=0){ const data = `${serverSeed}::${nonce}`; const h = crypto.createHash('sha256').update(data).digest('hex'); const num = parseInt(h.slice(0,8),16); const pick = num % 3; return pick===0?'green':pick===1?'red':'violet'; }

let currentRound = null;

async function startRound(io){
  const id = Date.now();
  const s = genServerSeed();
  currentRound = { id, seedHash: s.hash, serverSeed: s.seed, bets:[], startAt:Date.now(), endsAt: Date.now()+ROUND_INTERVAL*1000, nonce:0, payoutMultiplier: PAYOUT };
  io.emit('round_start', { id: currentRound.id, seedHash: currentRound.seedHash, endsAt: currentRound.endsAt, payoutMultiplier: currentRound.payoutMultiplier });
  console.log('round', currentRound.id, 'started');
  setTimeout(async ()=>{ await endRound(io); setTimeout(()=>startRound(io), 3000); }, ROUND_INTERVAL*1000);
}

async function endRound(io){
  if(!currentRound) return;
  const result = currentRound.forcedResult || computeResult(currentRound.serverSeed, currentRound.nonce);
  const r = new Round({ id: currentRound.id, seedHash: currentRound.seedHash, revealedSeed: currentRound.serverSeed, result, startAt:new Date(currentRound.startAt), endsAt:new Date(currentRound.endsAt), payoutMultiplier: currentRound.payoutMultiplier, betsCount: currentRound.bets.length, nonce: currentRound.nonce });
  await r.save();
  const payouts = [];
  for(const b of currentRound.bets){
    const win = b.color === result || (typeof b.color === 'number' && Number(b.color)===Number(result));
    const payout = win ? Math.round(b.amt * currentRound.payoutMultiplier) : 0;
    payouts.push({ user: b.userId, color: b.color, amt: b.amt, win, payout });
    await Bet.create({ userId: b.userId, roundId: currentRound.id, color: b.color, amt: b.amt, payout, win });
    if(win){ await User.findByIdAndUpdate(b.userId, { $inc: { wallet: payout } }); }
  }
  io.emit('round_end', { id: currentRound.id, result, revealedSeed: currentRound.serverSeed, payouts });
  currentRound = null;
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });

io.on('connection', socket=>{
  console.log('socket connected', socket.id);
  if(currentRound) socket.emit('round_start', { id: currentRound.id, seedHash: currentRound.seedHash, endsAt: currentRound.endsAt, payoutMultiplier: currentRound.payoutMultiplier });
  socket.on('place_bet', async (data)=>{
    try{
      if(!currentRound){ socket.emit('bet_failed',{msg:'No active round'}); return; }
      if(!data.userId){ socket.emit('bet_failed',{msg:'User required'}); return; }
      const user = await User.findById(data.userId);
      if(!user){ socket.emit('bet_failed',{msg:'User not found'}); return; }
      if(user.wallet < data.amt){ socket.emit('bet_failed',{msg:'Insufficient balance'}); return; }
      await User.findByIdAndUpdate(user._id, { $inc: { wallet: -Math.abs(data.amt) } });
      currentRound.nonce += 1;
      currentRound.bets.push({ userId: user._id, color: data.color, amt: data.amt });
      socket.emit('bet_accepted', { roundId: currentRound.id, color: data.color, amt: data.amt });
      io.emit('bets_update', { roundId: currentRound.id, totalBets: currentRound.bets.length });
    }catch(e){ console.error(e); socket.emit('bet_failed',{msg:'Server error'}); }
  });
  socket.on('get_history', async ()=>{ const h = await Round.find().sort({startAt:-1}).limit(20).lean(); socket.emit('history', h); });
});

server.listen(PORT, ()=>{ console.log('server listening', PORT); startRound(io); });
