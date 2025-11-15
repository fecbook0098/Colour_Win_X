import React, {useState,useEffect} from 'react';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
function Login({onLogin}){ const [u,setU]=useState('admin'); const [p,setP]=useState('pass@123'); async function sub(){ try{ const r = await axios.post(API+'/admin/login',{username:u,password:p}); onLogin(r.data.token); }catch(e){ alert('Login failed'); } } return (<div><h3>Login</h3><input value={u} onChange={e=>setU(e)}/><input value={p} onChange={e=>setP(e)}/><button onClick={sub}>Login</button></div>); }
export default function App(){ const [token,setToken]=useState(localStorage.getItem('admintoken')); const [round,setRound]=useState(null);
 useEffect(()=>{ if(token){ axios.get(API+'/admin/active-round',{ headers:{ Authorization:`Bearer ${token}` }}).then(r=>setRound(r.data)).catch(e=>{ setToken(null); localStorage.removeItem('admintoken'); }); }},[token]);
 async function force(r){ if(!round) return alert('No active round'); try{ await axios.post(`${API}/admin/rounds/${round.id}/force-result`, { result: r }, { headers:{ Authorization:`Bearer ${token}` } }); alert('Forced'); }catch(e){ alert('Failed'); } }
 if(!token) return <Login onLogin={(t)=>{ setToken(t); localStorage.setItem('admintoken',t); }} />;
 return (<div style={{padding:20}}><h2>Admin</h2>{round? (<div><div>Round: {round.id}</div><div>Ends: {round.endsAt?new Date(round.endsAt).toLocaleString():''}</div><div>Bets: {round.betsCount}</div><div>Payout×: {round.payoutMultiplier}</div><button onClick={()=>force('green')}>Force Green</button><button onClick={()=>force('red')}>Force Red</button><button onClick={()=>force('violet')}>Force Violet</button></div>) : <div>No active round</div>}</div>); }
