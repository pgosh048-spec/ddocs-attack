/* ── SecureWave Cyber Command Center — app.js ── */
'use strict';

// ── Boot Sequence ──────────────────────────────────────────────
const bootMessages = [
  'Initializing kernel modules…',
  'Loading eBPF/XDP programs…',
  'Connecting to Redis cluster…',
  'Syncing BPF blacklist maps…',
  'Starting ML inference service…',
  'Opening WebSocket streams…',
  'Rendering Cyber Command Center…',
];

let bootIdx = 0;
const bootBar = document.getElementById('boot-bar');
const bootStatus = document.getElementById('boot-status');

function runBoot() {
  const interval = setInterval(() => {
    const pct = ((bootIdx + 1) / bootMessages.length) * 100;
    bootBar.style.width = pct + '%';
    bootStatus.textContent = bootMessages[bootIdx];
    bootIdx++;
    if (bootIdx >= bootMessages.length) {
      clearInterval(interval);
      setTimeout(() => {
        document.getElementById('boot-screen').style.opacity = '0';
        document.getElementById('boot-screen').style.transition = 'opacity .6s';
        setTimeout(() => {
          document.getElementById('boot-screen').classList.add('hidden');
          document.getElementById('app').classList.remove('hidden');
          initApp();
        }, 600);
      }, 400);
    }
  }, 280);
}
runBoot();

// ── Navigation ─────────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('view-' + btn.dataset.view).classList.add('active');
      if (btn.dataset.view === 'threatmap') startThreatMap();
      if (btn.dataset.view === 'incidents') renderIncidentTable();
      if (btn.dataset.view === 'rules') renderRulesTable();
    });
  });
}

// ── Clock ──────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  document.getElementById('top-clock').textContent =
    now.toUTCString().slice(17, 25);
}
setInterval(updateClock, 1000);
updateClock();

// ── Live Data Simulation ───────────────────────────────────────
const state = {
  rps: 2418302, blocked: 98.3, cpu: 34, mem: 61,
  rpsHistory: Array.from({length: 60}, () => 2e6 + Math.random() * 8e5),
  allowedHistory: Array.from({length: 24}, () => 100 + Math.random() * 80),
  blockedHistory: Array.from({length: 24}, () => 1200 + Math.random() * 600),
  activeRules: 1247,
};

function fluctuate(val, pct) { return val * (1 + (Math.random() - .5) * pct); }

function tickData() {
  state.rps = Math.round(fluctuate(state.rps, .08));
  state.blocked = Math.min(99.9, Math.max(90, fluctuate(state.blocked, .02)));
  state.cpu = Math.min(95, Math.max(10, fluctuate(state.cpu, .15)));
  state.mem = Math.min(90, Math.max(30, fluctuate(state.mem, .05)));
  state.rpsHistory.push(state.rps);
  state.rpsHistory.shift();
  updateStatCards();
  updateCharts();
}

// ── Stat Cards ─────────────────────────────────────────────────
function updateStatCards() {
  document.getElementById('val-rps').textContent = state.rps.toLocaleString();
  document.getElementById('val-blocked').textContent = state.blocked.toFixed(1) + '%';
  document.getElementById('val-cpu').textContent =
    Math.round(state.cpu) + '% / ' + Math.round(state.mem) + '%';
}

// ── ECharts Instances ──────────────────────────────────────────
let rpsChart, donutChart, gaugeChart, trafficChart;

function initCharts() {
  // RPS Sparkline
  rpsChart = echarts.init(document.getElementById('chart-rps'), null, {renderer:'svg'});
  rpsChart.setOption({
    grid: {top:0,bottom:0,left:0,right:0},
    xAxis: {type:'category', show:false, data: state.rpsHistory.map((_,i)=>i)},
    yAxis: {type:'value', show:false},
    series:[{
      type:'line', data: state.rpsHistory, smooth:true, symbol:'none',
      lineStyle:{color:'#06b6d4', width:2},
      areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,
        colorStops:[{offset:0,color:'rgba(6,182,212,.3)'},{offset:1,color:'rgba(6,182,212,0)'}]}}
    }]
  });

  // Blocked Donut
  donutChart = echarts.init(document.getElementById('chart-donut'), null, {renderer:'svg'});
  donutChart.setOption({
    series:[{
      type:'pie', radius:['55%','80%'], center:['50%','50%'],
      itemStyle:{borderRadius:3},
      label:{show:false}, legendHoverLink:false,
      data:[
        {value: state.blocked, name:'Blocked', itemStyle:{color:'#ef4444'}},
        {value: 100-state.blocked, name:'Allowed', itemStyle:{color:'rgba(6,182,212,.3)'}}
      ]
    }]
  });

  // CPU/Mem Gauges
  gaugeChart = echarts.init(document.getElementById('chart-gauge'), null, {renderer:'svg'});
  gaugeChart.setOption({
    series:[
      mkGauge(state.cpu, '30%', '#06b6d4', 'CPU'),
      mkGauge(state.mem, '70%', '#8b5cf6', 'MEM'),
    ]
  });

  // Traffic Area
  trafficChart = echarts.init(document.getElementById('chart-traffic'), null, {renderer:'svg'});
  const hours = Array.from({length:24}, (_,i) => `${i}:00`);
  trafficChart.setOption({
    backgroundColor:'transparent',
    tooltip:{trigger:'axis', backgroundColor:'rgba(2,8,23,.9)', borderColor:'rgba(6,182,212,.3)', textStyle:{color:'#e2e8f0', fontSize:12}},
    grid:{top:10, bottom:24, left:36, right:16},
    xAxis:{type:'category', data:hours, axisLine:{lineStyle:{color:'rgba(6,182,212,.15)'}}, axisLabel:{color:'#64748b', fontSize:10}},
    yAxis:{type:'value', axisLine:{show:false}, splitLine:{lineStyle:{color:'rgba(6,182,212,.06)'}}, axisLabel:{color:'#64748b', fontSize:10}},
    series:[
      {name:'Allowed', type:'line', data:state.allowedHistory, smooth:true, symbol:'none',
       lineStyle:{color:'#06b6d4', width:2},
       areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1, colorStops:[{offset:0,color:'rgba(6,182,212,.25)'},{offset:1,color:'rgba(6,182,212,0)'}]}}},
      {name:'Blocked', type:'line', data:state.blockedHistory, smooth:true, symbol:'none',
       lineStyle:{color:'#ef4444', width:2},
       areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1, colorStops:[{offset:0,color:'rgba(239,68,68,.2)'},{offset:1,color:'rgba(239,68,68,0)'}]}}}
    ]
  });
}

function mkGauge(val, cx, color, name) {
  return {
    type:'gauge', center:[cx,'50%'], radius:'90%', startAngle:200, endAngle:-20,
    min:0, max:100, splitNumber:2,
    pointer:{show:false},
    axisLine:{lineStyle:{width:6, color:[[val/100,color],[1,'rgba(100,116,139,.15)']]}},
    axisTick:{show:false}, splitLine:{show:false}, axisLabel:{show:false},
    title:{show:true, offsetCenter:[0,'60%'], color:'#64748b', fontSize:9, fontFamily:'JetBrains Mono'},
    detail:{valueAnimation:true, formatter:'{value}%', color, fontSize:12, fontFamily:'JetBrains Mono', offsetCenter:[0,'10%']},
    data:[{value: Math.round(val), name}]
  };
}

function updateCharts() {
  if (!rpsChart) return;
  rpsChart.setOption({series:[{data: state.rpsHistory}]});
  donutChart.setOption({series:[{data:[
    {value: state.blocked, itemStyle:{color:'#ef4444'}},
    {value: 100-state.blocked, itemStyle:{color:'rgba(6,182,212,.3)'}}
  ]}]});
  gaugeChart.setOption({series:[
    mkGauge(state.cpu,'30%','#06b6d4','CPU'),
    mkGauge(state.mem,'70%','#8b5cf6','MEM')
  ]});
}

// ── Rules Mini Badges ──────────────────────────────────────────
function renderRulesBadges() {
  const types = ['eBPF','SYN','UDP','HTTP','GeoIP','SWP'];
  document.getElementById('rules-mini').innerHTML =
    types.map(t => `<span class="rule-badge">${t}</span>`).join('');
}

// ── Protection Toggles ─────────────────────────────────────────
const modules = [
  {id:'syn',    label:'SYN Flood Guard',       status:'ACTIVE',  on:true},
  {id:'udp',    label:'UDP Amp Block',          status:'ACTIVE',  on:true},
  {id:'http',   label:'HTTP Rate Limiting',     status:'ACTIVE',  on:true},
  {id:'geo',    label:'GeoIP Blocking',         status:'STANDBY', on:false},
  {id:'iot',    label:'IoT Device Auth (SWP)',  status:'ACTIVE',  on:true},
  {id:'captcha',label:'CAPTCHA Challenge Gate', status:'MANUAL',  on:false},
];

function renderToggles() {
  const grid = document.getElementById('toggle-grid');
  grid.innerHTML = modules.map(m => `
    <div class="toggle-item ${m.on?'on':''}" id="tog-${m.id}">
      <div>
        <div class="toggle-label">${m.label}</div>
        <div class="toggle-status" id="ts-${m.id}">${m.status}</div>
      </div>
      <button class="sw-toggle ${m.on?'on':''}" id="tb-${m.id}" onclick="flipToggle('${m.id}')"></button>
    </div>`).join('');
}

function flipToggle(id) {
  const m = modules.find(x=>x.id===id);
  m.on = !m.on;
  m.status = m.on ? 'ACTIVE' : 'DISABLED';
  document.getElementById('tog-'+id).classList.toggle('on', m.on);
  document.getElementById('tb-'+id).classList.toggle('on', m.on);
  document.getElementById('ts-'+id).textContent = m.status;
  showToast(m.label + (m.on?' enabled':' disabled'), m.on?'success':'error');
}

document.getElementById('global-toggle-btn').addEventListener('click', () => {
  const allOn = modules.every(m=>m.on);
  modules.forEach(m => { m.on = !allOn; m.status = m.on?'ACTIVE':'DISABLED'; });
  renderToggles();
  showToast(allOn ? 'All modules disabled' : 'All modules enabled', allOn?'error':'success');
});

// ── Incident Feed ──────────────────────────────────────────────
const incidentPool = [
  {type:'SYN Flood',     country:'CN', ip:'218.92.0.x',  sev:'critical'},
  {type:'UDP Amplification', country:'RU', ip:'85.95.0.x', sev:'critical'},
  {type:'HTTP Flood',    country:'BR', ip:'177.8.0.x',   sev:'warning'},
  {type:'ICMP Sweep',    country:'KP', ip:'175.45.0.x',  sev:'critical'},
  {type:'Slow Loris',    country:'US', ip:'104.16.0.x',  sev:'warning'},
  {type:'DNS Amp',       country:'DE', ip:'46.252.0.x',  sev:'warning'},
  {type:'Resolved',      country:'IN', ip:'49.32.0.x',   sev:'resolved'},
];
const liveIncidents = [];

function addIncident() {
  const template = incidentPool[Math.floor(Math.random()*incidentPool.length)];
  const inc = {...template, time: new Date(), pps: Math.round(1e4 + Math.random()*5e5)};
  liveIncidents.unshift(inc);
  if (liveIncidents.length > 40) liveIncidents.pop();
  renderIncidentFeed();
  updateNotifCount();
}

function renderIncidentFeed() {
  const list = document.getElementById('incident-list');
  list.innerHTML = liveIncidents.slice(0,8).map(inc => `
    <div class="incident-item ${inc.sev}">
      <div class="inc-dot ${inc.sev}"></div>
      <div class="inc-body">
        <div class="inc-type">${inc.type}</div>
        <div class="inc-meta">${inc.ip} — ${inc.country}</div>
      </div>
      <div class="inc-time">${timeAgo(inc.time)}</div>
    </div>`).join('');
}

function renderIncidentTable() {
  document.getElementById('incident-table-body').innerHTML =
    liveIncidents.map((inc, i) => `
      <tr>
        <td style="font-family:var(--mono);color:var(--muted)">${fmt(inc.time)}</td>
        <td>${inc.type}</td>
        <td style="font-family:var(--mono)">${inc.ip}</td>
        <td>${inc.country}</td>
        <td style="font-family:var(--mono)">${inc.pps.toLocaleString()}</td>
        <td><span class="pill pill-${inc.sev==='critical'?'red':inc.sev==='warning'?'amber':'green'}">${inc.sev.toUpperCase()}</span></td>
        <td><button class="btn-sm btn-danger" onclick="blockIncident(${i})">Block IP</button></td>
      </tr>`).join('');
}

window.blockIncident = (i) => {
  liveIncidents[i].sev = 'resolved';
  renderIncidentTable();
  showToast('IP blocked: ' + liveIncidents[i].ip, 'success');
};

// ── Rules Table ────────────────────────────────────────────────
const rulesData = [
  {id:'R-001', type:'Rate Limit', target:'*/TCP SYN',  limit:'10,000 pps', action:'DROP',    hits:Math.round(Math.random()*1e6)},
  {id:'R-002', type:'Rate Limit', target:'*/UDP',      limit:'100 Mbps',   action:'DROP',    hits:Math.round(Math.random()*5e5)},
  {id:'R-003', type:'GeoIP Block',target:'CN/ALL',     limit:'–',          action:'REJECT',  hits:Math.round(Math.random()*2e5)},
  {id:'R-004', type:'GeoIP Block',target:'KP/ALL',     limit:'–',          action:'REJECT',  hits:Math.round(Math.random()*3e4)},
  {id:'R-005', type:'L7 Filter',  target:'*/HTTP',     limit:'1,000 rps',  action:'CAPTCHA', hits:Math.round(Math.random()*1e5)},
  {id:'R-006', type:'IP Blacklist',target:'218.92.0.0/16','limit':'–',     action:'DROP',    hits:Math.round(Math.random()*8e5)},
];

function renderRulesTable() {
  document.getElementById('rules-table-body').innerHTML = rulesData.map(r => `
    <tr>
      <td style="font-family:var(--mono);color:var(--cyan)">${r.id}</td>
      <td><span class="pill pill-cyan">${r.type}</span></td>
      <td style="font-family:var(--mono)">${r.target}</td>
      <td style="font-family:var(--mono)">${r.limit}</td>
      <td><span class="pill ${r.action==='DROP'?'pill-red':r.action==='REJECT'?'pill-amber':'pill-purple'}">${r.action}</span></td>
      <td style="font-family:var(--mono)">${r.hits.toLocaleString()}</td>
      <td><button class="btn-sm btn-ghost">Edit</button></td>
    </tr>`).join('');
}

document.getElementById('add-rule-btn')?.addEventListener('click', () => {
  showToast('Rule editor coming soon', 'success');
});

// ── Notifications ──────────────────────────────────────────────
const notifications = [
  {title:'🔴 SYN Flood — Critical', body:'Source: 218.92.0.0/16 | 480K pps', sev:'critical', time: new Date(Date.now()-13e3)},
  {title:'🟡 UDP Amplification', body:'Source: 85.95.0.0/24 | 220 Gbps', sev:'warning', time: new Date(Date.now()-2*60e3)},
  {title:'🟢 Incident Resolved', body:'HTTP Flood from BR mitigated', sev:'resolved', time: new Date(Date.now()-5*60e3)},
];

function renderNotifications() {
  document.getElementById('notif-items').innerHTML = notifications.map(n => `
    <div class="notif-item ${n.sev}">
      <div class="notif-title">${n.title}</div>
      <div style="font-size:11px;color:var(--muted);margin:4px 0">${n.body}</div>
      <div class="notif-time">${timeAgo(n.time)}</div>
    </div>`).join('');
}

function updateNotifCount() {
  const criticals = liveIncidents.filter(i=>i.sev==='critical').length;
  document.getElementById('notif-count').textContent = Math.min(criticals + 3, 99);
}

document.getElementById('notif-btn').addEventListener('click', () => {
  document.getElementById('notif-drawer').classList.toggle('open');
  renderNotifications();
});

// ── Threat Map Canvas ──────────────────────────────────────────
let threatAnimFrame;
const arcs = [];

function startThreatMap() {
  const canvas = document.getElementById('threat-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  canvas.width = W; canvas.height = H;

  const cols = ['#ef4444','#f59e0b','#8b5cf6','#06b6d4'];
  const labels = ['Volumetric','Protocol','Application','Scrubbed'];

  // stats
  document.getElementById('map-stats').innerHTML = [
    {label:'Attack Sources', val: '47 nations'},
    {label:'Active Arcs', val: arcs.length + '+'},
    {label:'Peak Gbps', val: '1,240 Gbps'},
  ].map(s=>`<div class="map-stat-item">${s.label}: <strong style="color:var(--cyan)">${s.val}</strong></div>`).join('');

  // Spawn arcs
  function spawnArc() {
    arcs.push({
      sx: Math.random()*W*.7 + W*.05,
      sy: Math.random()*H*.6 + H*.1,
      ex: W*.5 + (Math.random()-.5)*50,
      ey: H*.5 + (Math.random()-.5)*30,
      t: 0, speed: .005 + Math.random()*.008,
      color: cols[Math.floor(Math.random()*cols.length)],
      r: 1.5 + Math.random()*2,
    });
    if (arcs.length > 60) arcs.shift();
  }
  const spawnTimer = setInterval(spawnArc, 400);

  function drawWorld(ctx, W, H) {
    // Simple grid backdrop
    ctx.strokeStyle = 'rgba(6,182,212,.06)';
    ctx.lineWidth = 0.5;
    for (let x=0; x<W; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y=0; y<H; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    // Center target
    ctx.strokeStyle = 'rgba(6,182,212,.4)'; ctx.lineWidth=1;
    [20,40,60].forEach(r=>{
      ctx.beginPath(); ctx.arc(W*.5, H*.5, r, 0, Math.PI*2); ctx.stroke();
    });
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath(); ctx.arc(W*.5, H*.5, 6, 0, Math.PI*2); ctx.fill();
    // Glow
    const g = ctx.createRadialGradient(W*.5, H*.5, 0, W*.5, H*.5, 80);
    g.addColorStop(0,'rgba(6,182,212,.15)'); g.addColorStop(1,'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W*.5, H*.5, 80, 0, Math.PI*2); ctx.fill();
  }

  function drawArc(ctx, arc) {
    const mx = (arc.sx+arc.ex)/2 - (arc.ey-arc.sy)*.5;
    const my = (arc.sy+arc.ey)/2 + (arc.ex-arc.sx)*.3;
    const t = arc.t;
    const x = (1-t)*(1-t)*arc.sx + 2*(1-t)*t*mx + t*t*arc.ex;
    const y = (1-t)*(1-t)*arc.sy + 2*(1-t)*t*my + t*t*arc.ey;

    ctx.beginPath();
    ctx.arc(arc.sx, arc.sy, arc.r+1, 0, Math.PI*2);
    ctx.fillStyle = arc.color; ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, arc.r, 0, Math.PI*2);
    ctx.fillStyle = arc.color;
    ctx.shadowBlur = 8; ctx.shadowColor = arc.color;
    ctx.fill(); ctx.shadowBlur = 0;

    arc.t += arc.speed;
    return arc.t < 1;
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#020817'; ctx.fillRect(0,0,W,H);
    drawWorld(ctx, W, H);
    for (let i = arcs.length-1; i>=0; i--) {
      if (!drawArc(ctx, arcs[i])) arcs.splice(i,1);
    }
    threatAnimFrame = requestAnimationFrame(frame);
  }

  if (threatAnimFrame) cancelAnimationFrame(threatAnimFrame);
  frame();
}

// ── Settings ───────────────────────────────────────────────────
function initSettings() {
  const sens = document.getElementById('s-sensitivity');
  const theta = document.getElementById('s-theta');
  sens.addEventListener('input', () => document.getElementById('sv-sensitivity').textContent = sens.value);
  theta.addEventListener('input', () => document.getElementById('sv-theta').textContent = (theta.value/100).toFixed(2));

  document.getElementById('save-btn').addEventListener('click', () => {
    showToast('✓ Settings saved successfully', 'success');
  });
  document.getElementById('reset-btn').addEventListener('click', () => {
    showToast('Settings reset to defaults', 'error');
  });
  document.getElementById('export-btn')?.addEventListener('click', () => {
    showToast('Generating PDF report…', 'success');
  });
  document.getElementById('incident-filter')?.addEventListener('change', (e) => {
    const val = e.target.value;
    const filtered = val === 'all' ? liveIncidents : liveIncidents.filter(i=>i.sev===val);
    document.getElementById('incident-table-body').innerHTML =
      filtered.map((inc, i) => `<tr><td style="font-family:var(--mono);color:var(--muted)">${fmt(inc.time)}</td><td>${inc.type}</td><td style="font-family:var(--mono)">${inc.ip}</td><td>${inc.country}</td><td style="font-family:var(--mono)">${inc.pps.toLocaleString()}</td><td><span class="pill pill-${inc.sev==='critical'?'red':inc.sev==='warning'?'amber':'green'}">${inc.sev.toUpperCase()}</span></td><td><button class="btn-sm btn-danger" onclick="blockIncident(${i})">Block IP</button></td></tr>`).join('');
  });
}

// ── GeoIP Tags ─────────────────────────────────────────────────
window.removeTag = (btn) => btn.parentElement.remove();
window.addGeoTag = () => {
  const input = document.getElementById('geo-input');
  const code = input.value.trim().toUpperCase().slice(0,2);
  if (!code) return;
  const tag = document.createElement('span');
  tag.className = 'geo-tag';
  tag.innerHTML = `${code} <button onclick="removeTag(this)">×</button>`;
  document.getElementById('geo-tags').appendChild(tag);
  input.value = '';
};

window.miniToggle = (el) => {
  const knob = el.querySelector('.toggle-mini-knob');
  knob.classList.toggle('active');
};

// ── Toast ──────────────────────────────────────────────────────
function showToast(msg, type='success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .4s'; setTimeout(()=>t.remove(), 400); }, 3000);
}

// ── Helpers ────────────────────────────────────────────────────
function timeAgo(date) {
  const s = Math.round((Date.now()-date)/1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.round(s/60) + 'm ago';
  return Math.round(s/3600) + 'h ago';
}
function fmt(date) {
  return date.toISOString().slice(11,19);
}

// ── Init ───────────────────────────────────────────────────────
function initApp() {
  initNav();
  initCharts();
  renderRulesBadges();
  renderToggles();
  renderNotifications();
  for (let i=0; i<10; i++) {
    setTimeout(() => addIncident(), i * 300);
  }
  setInterval(tickData, 1200);
  setInterval(addIncident, 4000);
  setInterval(renderIncidentFeed, 2000);
  window.addEventListener('resize', () => {
    [rpsChart, donutChart, gaugeChart, trafficChart].forEach(c=>c&&c.resize());
  });
}
