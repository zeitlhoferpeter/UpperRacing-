(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const style=d.createElement('style');
    style.id='upperDashboardV2Styles';
    style.textContent=`
      :root{--ur-yellow:#ffd400;--ur-card:#151515;--ur-line:#373737;--ur-muted:#969696}
      .nav-tabs{display:none!important}
      .app-header{padding-bottom:9px!important}
      .header-select-grid{display:grid!important;grid-template-columns:1fr 1.12fr!important;gap:6px!important}
      .header-control-card{min-height:43px!important;padding:5px 7px!important;border-radius:9px!important}
      .header-control-label{font-size:.45rem!important;letter-spacing:.55px!important}
      .header-control-content select{font-size:.73rem!important;font-weight:800!important;padding-right:14px!important}
      .header-control-icon{font-size:.92rem!important;width:22px!important;flex-basis:22px!important}
      .header-status-grid{grid-template-columns:minmax(0,1.35fr) minmax(112px,.65fr)!important;gap:7px!important;margin-top:7px!important}
      #headerScheduleWidget{min-height:78px!important;padding-top:9px!important;padding-bottom:9px!important;border-radius:10px!important}
      .preview-next-turn-time{padding-right:10px!important}
      .preview-weather-card{min-height:70px!important;border-radius:10px!important;padding:9px 10px!important;gap:10px!important;transition:background .18s,border-color .18s,box-shadow .18s,transform .18s!important}
      .preview-weather-card .pw-icon{font-size:1.55rem!important;flex-basis:36px!important}.preview-weather-card .pw-label{font-size:.54rem!important}.preview-weather-card .pw-temp{font-size:1.1rem!important;line-height:1.1!important}.preview-weather-card .pw-info{font-size:.59rem!important;margin-top:2px!important}
      .preview-weather-card.alert-yellow{border-color:#ffd400!important;background:linear-gradient(145deg,#332b00,#171400)!important;box-shadow:0 0 0 1px rgba(255,212,0,.18),0 0 12px rgba(255,212,0,.18)!important}
      .preview-weather-card.alert-orange{border-color:#ff8c00!important;background:linear-gradient(145deg,#442500,#1b1000)!important;box-shadow:0 0 0 1px rgba(255,140,0,.30),0 0 18px rgba(255,140,0,.34)!important;transform:scale(1.01)!important}
      @keyframes ur-weather-red-v2{0%,100%{box-shadow:0 0 0 1px rgba(255,45,25,.38),0 0 12px rgba(255,45,25,.40)}50%{box-shadow:0 0 0 2px rgba(255,73,35,.72),0 0 26px rgba(255,45,25,.72)}}
      .preview-weather-card.alert-red{border-color:#ff2d19!important;background:linear-gradient(145deg,#4b0d06,#210806)!important;animation:ur-weather-red-v2 .85s ease-in-out infinite!important;transform:scale(1.015)!important}
      .header-best-card{min-height:70px!important;border-radius:10px!important;padding:8px 9px!important}.header-best-value{font-size:.96rem!important}.header-best-label{font-size:.55rem!important}

      #upperDashboardV2{display:none;padding:13px 12px 92px;background:#0b0b0b;min-height:44vh;box-sizing:border-box}
      #upperDashboardV2.show{display:block}
      .ur2-head{display:flex;justify-content:space-between;align-items:center;margin:2px 1px 10px}.ur2-head h2{margin:0;font-size:.82rem;font-weight:900;letter-spacing:1.1px;color:#ddd}.ur2-head span{font-size:.6rem;color:#777}
      .ur2-status{background:linear-gradient(145deg,#181818,#111);border:1px solid #3b3b3b;border-radius:12px;padding:12px 13px;box-sizing:border-box}
      .ur2-kicker{font-size:.53rem;font-weight:900;letter-spacing:.8px;color:#ffd400;margin-bottom:8px}.ur2-row{display:grid;grid-template-columns:112px minmax(0,1fr);gap:8px;padding:7px 0;border-top:1px solid #2f2f2f;align-items:start}.ur2-row:first-of-type{border-top:0;padding-top:0}.ur2-label{font-size:.62rem;color:#8e8e8e;font-weight:800}.ur2-value{font-size:.72rem;color:#f2f2f2;font-weight:800;line-height:1.35;min-width:0}.ur2-value strong{color:#ffd400}.ur2-note{font-size:.58rem;color:#777;margin-top:7px;line-height:1.35}
      .ur2-section-title{margin:13px 1px 8px;font-size:.66rem;font-weight:900;letter-spacing:.8px;color:#9a9a9a}
      .ur2-tools{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ur2-tool{position:relative;background:#151515;border:1px solid #353535;border-radius:11px;padding:11px;color:#fff;text-align:left;min-height:83px;cursor:pointer}.ur2-tool:active{transform:scale(.99)}.ur2-icon{font-size:1.1rem;margin-bottom:7px}.ur2-title{font-size:.78rem;font-weight:900}.ur2-meta{font-size:.57rem;color:#898989;margin-top:3px;line-height:1.25}.ur2-arrow{position:absolute;right:9px;bottom:8px;color:#777;font-size:.95rem}
      .ur2-bottom{position:fixed;left:0;right:0;bottom:0;z-index:9000;display:grid;grid-template-columns:repeat(5,1fr);height:67px;background:rgba(10,10,10,.97);border-top:1px solid #333;padding-bottom:env(safe-area-inset-bottom);box-sizing:content-box}.ur2-nav{appearance:none;border:0;background:none;color:#999;font-size:.58rem;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer}.ur2-nav .i{font-size:1.2rem;line-height:1}.ur2-nav.active{color:#ffd400}.ur2-nav.active:after{content:'';width:25px;height:3px;border-radius:3px;background:#ffd400;margin-top:2px}
      .ur2-more{display:none;position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.64);align-items:flex-end}.ur2-more.show{display:flex}.ur2-panel{width:100%;background:#151515;border-top:1px solid #454545;border-radius:18px 18px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box}.ur2-grip{width:44px;height:4px;border-radius:2px;background:#555;margin:0 auto 12px}.ur2-more-title{font-size:.82rem;font-weight:900;margin:0 0 10px}.ur2-more-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ur2-more-btn{border:1px solid #383838;background:#1b1b1b;color:#fff;border-radius:10px;padding:12px;text-align:left;font-weight:800;font-size:.78rem}.ur2-more-btn span{display:block;color:#888;font-size:.58rem;margin-top:3px;font-weight:600}
      main{padding-bottom:76px!important}
      @media(max-width:370px){.ur2-row{grid-template-columns:98px minmax(0,1fr)}.header-select-grid{grid-template-columns:1fr 1fr!important}.preview-weather-card .pw-info{font-size:.55rem!important}}
    `;
    d.head.appendChild(style);

    const main=d.querySelector('main');
    if(!main)return;

    const dashboard=d.createElement('section');
    dashboard.id='upperDashboardV2';
    dashboard.innerHTML=`
      <div class="ur2-head"><h2>ÜBERSICHT</h2><span id="ur2Context">Trackday</span></div>
      <div class="ur2-status">
        <div class="ur2-kicker">TRACKDAY HEUTE</div>
        <div class="ur2-row"><div class="ur2-label">Zeitplan</div><div class="ur2-value" id="ur2Schedule">Noch kein Zeitplan geladen</div></div>
        <div class="ur2-row"><div class="ur2-label">Nächster Punkt</div><div class="ur2-value" id="ur2Next">—</div></div>
        <div class="ur2-row"><div class="ur2-label">Packliste</div><div class="ur2-value" id="ur2Pack">—</div></div>
        <div class="ur2-note">Zeitplan, Packliste und Runden öffnest du direkt unten in der Hauptnavigation.</div>
      </div>
      <div class="ur2-section-title">WEITERE BEREICHE</div>
      <div class="ur2-tools">
        <button class="ur2-tool" type="button" data-page="setup"><div class="ur2-icon">⚙️</div><div class="ur2-title">Setup</div><div class="ur2-meta">Motorrad, Fahrwerk & Sessions</div><div class="ur2-arrow">›</div></button>
        <button class="ur2-tool" type="button" data-page="curves"><div class="ur2-icon">🏁</div><div class="ur2-title">Kurven</div><div class="ur2-meta">Strecken-Guide & Notizen</div><div class="ur2-arrow">›</div></button>
        <button class="ur2-tool" type="button" data-page="cup"><div class="ur2-icon">🏆</div><div class="ur2-title">Cup</div><div class="ur2-meta">Reglement & Informationen</div><div class="ur2-arrow">›</div></button>
        <button class="ur2-tool" type="button" data-page="backup"><div class="ur2-icon">💾</div><div class="ur2-title">Backup</div><div class="ur2-meta">Daten sichern & wiederherstellen</div><div class="ur2-arrow">›</div></button>
      </div>`;
    main.parentNode.insertBefore(dashboard,main);

    const bottom=d.createElement('nav');
    bottom.className='ur2-bottom';
    bottom.innerHTML=`
      <button class="ur2-nav active" type="button" data-home="1"><span class="i">⌂</span><span>Übersicht</span></button>
      <button class="ur2-nav" type="button" data-page="schedule"><span class="i">📅</span><span>Zeitplan</span></button>
      <button class="ur2-nav" type="button" data-page="pack"><span class="i">✅</span><span>Packliste</span></button>
      <button class="ur2-nav" type="button" data-page="laps"><span class="i">⏱️</span><span>Runden</span></button>
      <button class="ur2-nav" type="button" data-more="1"><span class="i">•••</span><span>Mehr</span></button>`;
    d.body.appendChild(bottom);

    const more=d.createElement('div');
    more.className='ur2-more';
    more.innerHTML=`<div class="ur2-panel"><div class="ur2-grip"></div><div class="ur2-more-title">Weitere Bereiche</div><div class="ur2-more-grid">
      <button class="ur2-more-btn" data-page="setup">⚙️ Setup<span>Motorrad, Fahrwerk & Sessions</span></button>
      <button class="ur2-more-btn" data-page="curves">🏁 Kurven<span>Kurven-Guide & Notizen</span></button>
      <button class="ur2-more-btn" data-page="cup">🏆 Cup<span>Reglement & Informationen</span></button>
      <button class="ur2-more-btn" data-page="backup">💾 Backup<span>Daten sichern & wiederherstellen</span></button>
    </div></div>`;
    d.body.appendChild(more);

    function markNav(which){
      bottom.querySelectorAll('.ur2-nav').forEach(b=>b.classList.remove('active'));
      if(which==='home')bottom.querySelector('[data-home]').classList.add('active');
      else if(['schedule','pack','laps'].includes(which)){const b=bottom.querySelector('[data-page="'+which+'"]');if(b)b.classList.add('active')}
    }
    function hideDashboard(){dashboard.classList.remove('show')}
    function showDashboard(){
      d.querySelectorAll('.page-content').forEach(p=>{p.classList.remove('active');p.style.display='none'});
      dashboard.classList.add('show');markNav('home');updateDashboard();try{w.scrollTo(0,0)}catch(_){ }
    }
    function openPage(page){
      hideDashboard();more.classList.remove('show');if(typeof w.switchPage==='function')w.switchPage(page);markNav(page);try{w.scrollTo(0,0)}catch(_){ }
    }

    dashboard.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)openPage(b.dataset.page)});
    bottom.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.home)showDashboard();else if(b.dataset.more)more.classList.add('show');else if(b.dataset.page)openPage(b.dataset.page)});
    more.addEventListener('click',e=>{if(e.target===more){more.classList.remove('show');return}const b=e.target.closest('[data-page]');if(b)openPage(b.dataset.page)});
    d.addEventListener('click',function(e){const x=e.target.closest&&e.target.closest('[onclick*="switchPage"]');if(x&&dashboard.classList.contains('show'))hideDashboard()},true);

    function mins(t){if(!t)return NaN;const p=String(t).replace('.',':').split(':');return p.length>=2?(+p[0])*60+(+p[1]):NaN}
    function scheduleData(){try{return JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}')||{}}catch(_){return{}}}
    function packStats(){
      try{
        const cats=typeof w.getPackData==='function'?w.getPackData():JSON.parse(w.localStorage.getItem('upper_pack_list')||'[]');
        const checked=JSON.parse(w.localStorage.getItem('upper_pack_checked')||'{}')||{};
        let total=0,done=0;(Array.isArray(cats)?cats:[]).forEach((c,ci)=>(c.items||[]).forEach((_,ii)=>{total++;if(checked[ci+'_'+ii])done++}));
        return{total,done,open:Math.max(0,total-done)};
      }catch(_){return{total:0,done:0,open:0}}
    }
    function updateDashboard(){
      const days=scheduleData(),keys=Object.keys(days),active=w.localStorage.getItem('upper_schedule_activeday')||keys[0]||'';
      const group=w.localStorage.getItem('upper_schedule_mygroup')||'A';
      const items=Array.isArray(days[active])?days[active]:[];
      const now=new Date(),cur=now.getHours()*60+now.getMinutes();
      const upcoming=items.filter(i=>i&&i.start&&Number.isFinite(mins(i.start))&&mins(i.start)>cur).sort((a,b)=>mins(a.start)-mins(b.start))[0]||null;
      const scheduleEl=d.getElementById('ur2Schedule'),nextEl=d.getElementById('ur2Next'),packEl=d.getElementById('ur2Pack'),ctx=d.getElementById('ur2Context');
      if(scheduleEl)scheduleEl.innerHTML=keys.length?'<strong>'+active+'</strong> · '+keys.length+' Tag'+(keys.length===1?'':'e')+' geladen · Gruppe '+group:'Noch kein Zeitplan geladen';
      if(nextEl)nextEl.textContent=upcoming?(upcoming.start+' · '+upcoming.title):'Für den gewählten Tag kein weiterer Eintrag';
      const ps=packStats();if(packEl)packEl.innerHTML=ps.total?'<strong>'+ps.open+' offen</strong> · '+ps.done+' erledigt':'Noch keine Packliste';
      const bike=d.getElementById('motorcycleSelect')?.selectedOptions?.[0]?.textContent||'';const track=d.getElementById('trackSelect')?.selectedOptions?.[0]?.textContent||'';
      if(ctx)ctx.textContent=[bike,track].filter(Boolean).join(' · ')||'Trackday';
    }

    showDashboard();
    setInterval(function(){if(dashboard.classList.contains('show'))updateDashboard()},1200);
  });
})();