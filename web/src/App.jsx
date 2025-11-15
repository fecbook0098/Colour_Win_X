import React, {useEffect, useState} from 'react';
import io from 'socket.io-client';
const SERVER = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export default function App(){
  const [socket,setSocket]=useState(null);
  const [roundId,setRoundId]=useState('');
  const [lastResult,setLastResult]=useState('');
  const [userId,setUserId]=useState('');
  const [betAmt,setBetAmt]=useState(10);
  useEffect(()=>{ const s = io(SERVER); setSocket(s); s.on('round_start', d=>{ setRoundId(d.id); }); s.on('round_end', d=>{ setLastResult(d.result); alert('Round '+d.id+' result: '+d.result); }); return ()=>s.disconnect(); },[]);
  function placeBet(color){ if(!socket) return alert('Not connected'); if(!userId) return alert('Set userId'); socket.emit('place_bet', { userId, color, amt: betAmt }); }
  return (<div className='container'><h1>Colour Win X - Web</h1><div>Round: {roundId} | Last: {lastResult}</div>
  <div><label>UserId: <input value={userId} onChange={e=>setUserId(e.target.value)}/></label></div>
  <div><label>Bet amt: <input type='number' value={betAmt} onChange={e=>setBetAmt(Number(e.target.value))}/></label></div>
  <div style={{marginTop:10}}>
    <button onClick={()=>placeBet('green')}>Join Green</button>
    <button onClick={()=>placeBet('red')}>Join Red</button>
    <button onClick={()=>placeBet('violet')}>Join Violet</button>
  </div>
  <hr/>
  <div><h3>Number Win (0-9)</h3><div style={{display:'flex',gap:8,flexWrap:'wrap'}}> {Array.from({length:10}).map((_,i)=>(<button key={i} onClick={()=>placeBet(i)} style={{width:48,height:48}}>{i}</button>))}</div></div>
  </div>); }
