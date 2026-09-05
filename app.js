const STORE = 'tradelog-v1';
const $ = (id) => document.getElementById(id);
let state = JSON.parse(localStorage.getItem(STORE) || '{"capital":10000,"trades":[]}');
let selectedMonth = 'all';

const money = (n, signed = false) => `${signed && n > 0 ? '+' : ''}${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n)}`;
const save = () => localStorage.setItem(STORE, JSON.stringify(state));
const dateLabel = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN',{day:'2-digit',month:'short',year:'numeric'});
const monthKey = (date) => date.slice(0,7);
const today = () => new Date().toISOString().slice(0,10);

function visibleTrades(){ return [...state.trades].filter(t => selectedMonth === 'all' || monthKey(t.date) === selectedMonth).sort((a,b) => b.date.localeCompare(a.date)); }
function allChronological(){ return [...state.trades].sort((a,b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)); }
function renderMonths(){
  const months = [...new Set(state.trades.map(t => monthKey(t.date)))].sort().reverse();
  const now = new Date().toISOString().slice(0,7);
  if (!months.includes(now)) months.unshift(now);
  $('monthFilter').innerHTML = `<option value="all">Tất cả thời gian</option>${months.map(m=>`<option value="${m}" ${m===selectedMonth?'selected':''}>${new Date(`${m}-01T12:00:00`).toLocaleDateString('vi-VN',{month:'long',year:'numeric'})}</option>`).join('')}`;
}
function render(){
  renderMonths(); const trades = visibleTrades(); const closed = trades.length;
  const net = trades.reduce((sum,t)=>sum + Number(t.pnl),0); const wins = trades.filter(t=>t.pnl>0); const losses = trades.filter(t=>t.pnl<0);
  const grossWin = wins.reduce((s,t)=>s + Number(t.pnl),0); const grossLoss = Math.abs(losses.reduce((s,t)=>s + Number(t.pnl),0));
  const overall = state.trades.reduce((s,t)=>s+Number(t.pnl),0); const balance = Number(state.capital)+overall;
  $('currentBalance').textContent = money(balance); $('startingBalance').textContent = money(Number(state.capital),false).replace('.00','');
  $('totalReturn').textContent = `${overall >= 0?'+':''}${state.capital ? (overall/state.capital*100).toFixed(2) : '0.00'}%`;
  $('totalReturn').className = overall >=0 ? 'positive' : 'negative';
  $('netProfit').textContent = money(net,true); $('netProfit').className = net >= 0 ? 'positive' : 'negative'; $('profitSubtext').textContent = `${closed} lệnh đã đóng`;
  $('winRate').textContent = closed ? `${Math.round(wins.length/closed*100)}%` : '—'; $('winRateSubtext').textContent = closed ? `${wins.length} thắng · ${losses.length} thua` : 'Chưa có dữ liệu';
  $('profitFactor').textContent = grossLoss ? (grossWin/grossLoss).toFixed(2) : grossWin ? '∞' : '—';
  let streak=0,maxStreak=0; allChronological().forEach(t=>{streak=t.pnl>0?streak+1:0;maxStreak=Math.max(maxStreak,streak)}); $('winStreak').textContent=maxStreak;
  $('emptyState').hidden = !!closed; $('tradeList').innerHTML = trades.map(t=>`<article class="trade-item" data-id="${t.id}"><div class="trade-icon ${t.side==='Buy'?'buy':'sell'}">${t.side==='Buy'?'↑':'↓'}</div><div class="trade-main"><strong>${escapeHtml(t.pair)} <small>${t.side}</small></strong><span>${dateLabel(t.date)} · ${t.lot} lot</span></div><div class="trade-result"><strong class="${t.pnl>=0?'positive':'negative'}">${money(Number(t.pnl),true)}</strong><span>${t.note ? 'Có ghi chú' : 'Chạm để sửa'}</span></div></article>`).join('');
  drawChart();
}
function drawChart(){
  const svg=$('equityChart'); const data=allChronological(); const values=[Number(state.capital)]; data.forEach(t=>values.push(values.at(-1)+Number(t.pnl)));
  if(data.length===0){svg.innerHTML='<text x="160" y="70" text-anchor="middle" fill="#97a1b1" font-size="12">Biểu đồ sẽ xuất hiện khi có giao dịch</text>'; $('chartCaption').textContent='Chưa có dữ liệu'; return;}
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1,w=320,h=135,p=12;
  const points=values.map((v,i)=>`${p+i*(w-p*2)/(values.length-1)},${h-p-(v-min)*(h-p*2)/range}`); const line=points.join(' '); const area=`${p},${h-p} ${line} ${w-p},${h-p}`;
  svg.innerHTML=`<line class="grid-line" x1="0" y1="30" x2="320" y2="30"/><line class="grid-line" x1="0" y1="68" x2="320" y2="68"/><line class="grid-line" x1="0" y1="106" x2="320" y2="106"/><polygon class="chart-area" points="${area}"/><polyline class="chart-line" points="${line}"/><circle class="chart-dot" cx="${points.at(-1).split(',')[0]}" cy="${points.at(-1).split(',')[1]}" r="4"/>`;
  $('chartCaption').textContent=`${values.length-1} lệnh`;
}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function openTrade(trade){ $('tradeForm').reset(); $('tradeId').value=trade?.id||''; $('formTitle').textContent=trade?'Sửa giao dịch':'Thêm giao dịch'; ['pair','date','side','lot','entry','exit','pnl','note'].forEach(k=>$(k).value=trade?.[k]??(k==='date'?today():k==='side'?'Buy':'')); $('tradeDialog').showModal(); }
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2200)}
$('addTradeButton').onclick=()=>openTrade(); $('settingsButton').onclick=()=>{$('initialCapital').value=state.capital;$('settingsDialog').showModal()};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('monthFilter').onchange=e=>{selectedMonth=e.target.value;render()}; $('clearFilter').onclick=()=>{selectedMonth='all';render()};
$('tradeForm').onsubmit=e=>{e.preventDefault();const id=$('tradeId').value;const trade={id:id||crypto.randomUUID(),createdAt:id?state.trades.find(t=>t.id===id).createdAt:new Date().toISOString(),pair:$('pair').value.trim().toUpperCase(),date:$('date').value,side:$('side').value,lot:$('lot').value,entry:$('entry').value,exit:$('exit').value,pnl:Number($('pnl').value),note:$('note').value.trim()}; state.trades=id?state.trades.map(t=>t.id===id?trade:t):[...state.trades,trade];save();$('tradeDialog').close();render();toast(id?'Đã cập nhật giao dịch':'Đã lưu giao dịch')};
$('tradeList').onclick=e=>{const item=e.target.closest('[data-id]');if(item)openTrade(state.trades.find(t=>t.id===item.dataset.id))};
$('settingsForm').onsubmit=e=>{e.preventDefault();state.capital=Number($('initialCapital').value);save();$('settingsDialog').close();render();toast('Đã lưu cài đặt')};
$('resetButton').onclick=()=>{if(confirm('Xóa vĩnh viễn toàn bộ giao dịch?')){state.trades=[];save();$('settingsDialog').close();render();toast('Đã xóa nhật ký')}};
$('exportButton').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`tradelog-${today()}.json`;a.click();URL.revokeObjectURL(url);toast('Đã xuất dữ liệu')};
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js'); render();
;(()=>{let pic=null;const f=document.getElementById('chartImage'),pre=document.getElementById('previewImage');if(!f)return;f.onchange=e=>{const r=new FileReader();r.onload=()=>{pic=r.result;pre.src=pic;pre.style.display='block'};if(e.target.files[0])r.readAsDataURL(e.target.files[0])};const old=document.getElementById('tradeForm').onsubmit;document.getElementById('tradeForm').onsubmit=e=>{e.preventDefault();const id=document.getElementById('tradeId').value,prev=state.trades.find(t=>t.id===id);const t={id:id||crypto.randomUUID(),createdAt:prev?.createdAt||new Date().toISOString(),pair:document.getElementById('pair').value,date:document.getElementById('date').value,side:document.getElementById('side').value,lot:document.getElementById('lot').value,entry:document.getElementById('entry').value,exit:document.getElementById('exit').value,pnl:Number(document.getElementById('pnl').value),note:document.getElementById('note').value.trim(),image:pic||prev?.image||null};state.trades=id?state.trades.map(x=>x.id===id?t:x):[...state.trades,t];save();document.getElementById('tradeDialog').close();render();toast('Đã lưu giao dịch')};const base=render;render=()=>{base();document.querySelectorAll('.trade-item').forEach(el=>{const t=state.trades.find(x=>x.id===el.dataset.id);if(t?.image){const im=document.createElement('img');im.src=t.image;im.className='chart-thumb';im.onclick=e=>{e.stopPropagation();let v=document.getElementById('imageOverlay');if(!v){v=document.createElement('div');v.id='imageOverlay';v.className='image-overlay';v.innerHTML='<button type="button">×</button><img alt="Ảnh chart giao dịch">';document.body.append(v);v.onclick=e=>{if(e.target===v||e.target.tagName==='BUTTON')v.classList.remove('show')}}v.querySelector('img').src=t.image;v.classList.add('show')};el.querySelector('.trade-result').append(im)}})};render()})();

if(document.getElementById('closeImageViewer'))document.getElementById('closeImageViewer').onclick=()=>document.getElementById('imageViewer').close();;(()=>{let pf='all',sf='all',rf='all';visibleTrades=()=>[...state.trades].filter(t=>(selectedMonth==='all'||monthKey(t.date)===selectedMonth)&&(pf==='all'||t.pair===pf)&&(sf==='all'||t.side===sf)&&(rf==='all'||(rf==='tp'?t.pnl>0:t.pnl<0))).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));const p=document.getElementById('pairTradeFilter'),s=document.getElementById('sideTradeFilter'),r=document.getElementById('resultTradeFilter');const fill=()=>{const keep=pf;p.innerHTML='<option value="all">Tất cả cặp</option>'+[...new Set(state.trades.map(t=>t.pair))].sort().map(x=>'<option value="'+x+'">'+x+'</option>').join('');p.value=keep};const draw=render;render=()=>{fill();draw()};p.onchange=e=>{pf=e.target.value;render()};s.onchange=e=>{sf=e.target.value;render()};r.onchange=e=>{rf=e.target.value;render()};render()})();
