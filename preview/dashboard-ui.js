(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const style=d.createElement('style');
    style.id='upperDashboardStyles';
    style.textContent=`
      :root{--ur-yellow:#ffd400;--ur-bg:#090909;--ur-card:#151515;--ur-line:#373737;--ur-muted:#989898}
      .nav-tabs{display:none!important}
      .app-header{padding-bottom:9px!important}
      .header-select-grid{display:grid!important;grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr)!important;gap:5px!important}
      .header-control-card{min-height:46px!important;padding:5px 7px!important;border-radius:9px!important}
      .header-control-label{font-size:.46rem!important;letter-spacing:.55px!important}
      .header-control-content select{font-size:.75rem!important;font-weight:800!important;padding-right:14px!important}
      .header-control-icon{font-size:.95rem!important;width:23px!important;flex-basis:23px!important}
      .header-status-grid{grid-template-columns:minmax(0,1.35fr) minmax(112px,.65fr)!important;gap:7px!important;margin-top:7px!important}
      #headerScheduleWidget{min-height:82px!important;padding-top:9px!important;padding-bottom:9px!important;border-radius:10px!important}
      .preview-next-turn-time{padding-right:10px!important}
      .preview-weather-card{min-height:68px!important;border-radius:10px!important;padding:8px 10px!important;gap:10px!important;transition:background .18s,border-color .18s,box-shadow .18s,transform .18s!important}
      .preview-weather-card .pw-icon{font-size:1.5rem!important;flex-basis:34px!important}.preview-weather-card .pw-label{font-size:.54rem!important}.preview-weather-card .pw-temp{font-size:1.08rem!important;line-height:1.1!important}.preview-weather-card .pw-info{font-size:.59rem!important;margin-top:2px!important}
      .preview-weather-card.alert-yellow{border-color:#ffd400!important;background:linear-gradient(145deg,#332b00,#171400)!important;box-shadow:0 0 0 1px rgba(255,212,0,.18),0 0 12px rgba(255,212,0,.18)!important}
      .preview-weather-card.alert-orange{border-color:#ff8c00!important;background:linear-gradient(145deg,#442500,#1b1000)!important;box-shadow:0 0 0 1px rgba(255,140,0,.30),0 0 18px rgba(255,140,0,.34)!important;transform:scale(1.01)!important}
      @keyframes ur-weather-red{0%,100%{box-shadow:0 0 0 1px rgba(255,45,25,.38),0 0 12px rgba(255,45,25,.40)}50%{box-shadow:0 0 0 2px rgba(255,73,35,.72),0 0 26px rgba(255,45,25,.72)}}
      .preview-weather-card.alert-red{border-color:#ff2d19!important;background:linear-gradient(145deg,#4b0d06,#210806)!important;animation:ur-weather-red .85s ease-in-out infinite!important;transform:scale(1.015)!important}
      .header-best-card{min-height:68px!important;border-radius:10px!important;padding:8px 9px!important}.header-best-value{font-size:.95rem!important}.header-best-label{font-size:.55rem!important}

      #upperDashboard{display:none;padding:13px 12px 92px;background:#0b0b0b;min-height:46vh;box-sizing:border-box}
      #upperDashboard.show{display:block}
      .ur-dash-head{display:flex;justify-content:space-between;align-items:end;margin:2px 1px 10px;gap:8px}.ur-dash-title{font-size:.82rem;font-weight:900;letter-spacing:1.2px;color:#ddd}.ur-dash-sub{font-size:.62rem;color:#777;text-align:right}
      .ur-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ur-card{position:relative;background:linear-gradient(145deg,#181818,#111);border:1px solid #383838;border-radius:12px;min-height:118px;padding:12px;box-sizing:border-box;color:#fff;text-align:left;cursor:pointer;overflow:hidden}.ur-card:active{transform:scale(.99)}.ur-card.primary{border-color:#6a5900;box-shadow:inset 3px 0 0 #ffd400}.ur-card.wide{grid-column:1/-1;min-height:112px}.ur-icon{font-size:1.35rem;margin-bottom:9px}.ur-title{font-size:.93rem;font-weight:900}.ur-meta{font-size:.66rem;color:#aaa;margin-top:5px;line-height:1.35}.ur-highlight{color:#ffd400;font-weight:900}.ur-arrow{position:absolute;right:10px;bottom:10px;width:25px;height:25px;border-radius:50%;background:#292929;display:grid;place-items:center;color:#ddd;font-weight:900}.ur-badge{position:absolute;right:10px;top:10px;min-width:22px;height:22px;border-radius:11px;background:#c72b24;display:grid;place-items:center;font-size:.65rem;font-weight:900;padding:0 5px;box-sizing:border-box}.ur-small-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:9px}.ur-small{background:#141414;border:1px solid #343434;border-radius:10px;min-height:86px;padding:9px 7px;color:#fff;text-align:left;cursor:pointer}.ur-small .ur-icon{font-size:1.05rem;margin-bottom:7px}.ur-small .ur-title{font-size:.7rem}.ur-small .ur-meta{font-size:.55rem;margin-top:3px}
      .ur-bottom{position:fixed;left:0;right:0;bottom:0;z-index:9000;display:grid;grid-template-columns:repeat(5,1fr);height:67px;background:rgba(10,10,10,.97);border-top:1px solid #333;padding-bottom:env(safe-area-inset-bottom);box-sizing:content-box}.ur-nav-btn{appearance:none;border:0;background:none;color:#999;font-size:.58rem;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer}.ur-nav-btn .i{font-size:1.22rem;line-height:1}.ur-nav-btn.active{color:#ffd400}.ur-nav-btn.active:after{content:'';width:26px;height:3px;border-radius:3px;background:#ffd400;margin-top:2px}.ur-nav-btn.more-open{color:#ffd400}
      .ur-more-sheet{display:none;position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.64);align-items:flex-end}.ur-more-sheet.show{display:flex}.ur-more-panel{width:100%;background:#151515;border-top:1px solid #454545;border-radius:18px 18px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box}.ur-more-grip{width:44px;height:4px;border-radius:2px;background:#555;margin:0 auto 12px}.ur-more-title{font-size:.82rem;font-weight:900;margin:0 0 10px;color:#fff}.ur-more-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ur-more-btn{border:1px solid #383838;background:#1b1b1b;color:#fff;border-radius:10px;padding:12px;text-align:left;font-weight:800;font-size:.78rem}.ur-more-btn span{display:block;color:#888;font-size:.58rem;margin-top:3px;font-weight:600}
      main{padding-bottom:76px!important}
      @media(max-width:370px){.ur-card{min-height:110px;padding:10px}.ur-small-grid{grid-template-columns:1fr 1fr}.ur-small{min-height:72px}.header-select-grid{grid-template-columns:1fr 1fr!important}.preview-weather-card .pw-info{font-size:.55rem!important}}
    `;
    d.head.appendChild(style);

    const main=d.querySelector('main');
    if(!main)return;

    const dashboard=d.createElement('section');
    dashboard.id='upperDashboard';
    dashboard.innerHTML=`
      <div class="ur-dash-head"><div class="ur-dash-title">DASHBOARD</div><div class="ur-dash-sub" id="urDashSub">Trackday Übersicht</div></div>
      <div class="ur-grid">
        <button class="ur-card primary wide" type="button" data-page="schedule">
          <div class="ur-icon">📅</div><div class="ur-title">Zeitplan</div>
          <div class="ur-meta" id="urScheduleMeta">Zeitplan wird geprüft …</div>
          <div class="ur-meta" id="urScheduleNext"></div><div class="ur-arrow">›</div>
        </button>
        <button class="ur-card" type="button" data-page="pack">
          <div class="ur-icon">✅</div><div class="ur-title">Packliste</div><div class="ur-meta" id="urPackMeta">Bereit für den Trackday</div><div class="ur-badge" id="urPackBadge" style="display:none">0</div><div class="ur-arrow">›</div>
        </button>
        <button class="ur-card" type="button" data-page="laps">
          <div class="ur-icon">⏱️</div><div class="ur-title">Runden / Live Timing</div><div class="ur-meta" id="urLapsMeta">Bestzeit: --:--.---</div><div class="ur-arrow">›</div>
        </button>
      </div>
      <div class="ur-small-grid">
        <button class="ur-small" type="button" data-page="setup"><div class="ur-icon">⚙️</div><div class="ur-title">Setup</div><div class="ur-meta">Bike & Fahrwerk</div></button>
        <button class="ur-small" type="button" data-page="curves"><div class="ur-icon">🏁</div><div class="ur-title">Kurven</div><div class="ur-meta">Strecken-Guide</div></button>
        <button class="ur-small" type="button" data-page="cup"><div class="ur-icon">🏆</div><div class="ur-title">Cup</div><div class="ur-meta">Reglement</div></button>
        <button class="ur-small" type="button" data-page="backup"><div class="ur-icon">💾</div><div class="ur-title">Backup</div><div class="ur-meta">Daten sichern</div></button>
      </div>`;
    main.parentNode.insertBefore(dashboard,main);

    const bottom=d.createElement('nav');
    bottom.className='ur-bottom';
    bottom.innerHTML=`
      <button class="ur-nav-btn active" type="button" data-home="1"><span class="i">⌂</span><span>Übersicht</span></button>
      <button class="ur-nav-btn" type="button" data-page="schedule"><span class="i">📅</span><span>Zeitplan</span></button>
      <button class="ur-nav-btn" type="button" data-page="pack"><span class="i">✅</span><span>Packliste</span></button>
      <button class="ur-nav-btn" type="button" data-page="laps"><span class="i">⏱️</span><span>Runden</span></button>
      <button class="ur-nav-btn" type="button" data-more="1"><span class="i">•••</span><span>Mehr</span></button>`;
    d.body.appendChild(bottom);

    const more=d.createElement('div');
    more.className='ur-more-sheet';
    more.innerHTML=`<div class="ur-more-panel"><div class="ur-more-grip"></div><div class="ur-more-title">Weitere Bereiche</div><div class="ur-more-grid">
      <button class="ur-more-btn" data-page="setup">⚙️ Setup<span>Motorrad, Fahrwerk & Sessions</span></button>
      <button class="ur-more-btn" data-page="curves">🏁 Kurven<span>Kurven-Guide & Notizen</span></button>
      <button class="ur-more-btn" data-page="cup">🏆 Cup<span>Reglement & Informationen</span></button>
      <button class="ur-more-btn" data-page="backup">💾 Backup<span>Daten sichern & wiederherstellen</span></button>
    </div></div>`;
    d.body.appendChild(more);

    function markNav(which){
      bottom.querySelectorAll('.ur-nav-btn').forEach(b=>b.classList.remove('active','more-open'));
      if(which==='home')bottom.querySelector('[data-home]').classList.add('active');
      else if(['schedule','pack','laps'].includes(which)){const b=bottom.querySelector('[data-page="'+which+'"]');if(b)b.classList.add('active')}
    }

    function hideDashboard(){dashboard.classList.remove('show')}
    function showDashboard(){
      d.querySelectorAll('.page-content').forEach(p=>{p.classList.remove('active');p.style.display='none'});
      dashboard.classList.add('show');
      markNav('home');
      updateDashboard();
      try{w.scrollTo(0,0)}catch(_){ }
    }
    function openPage(page){
      hideDashboard();
      more.classList.remove('show');
      if(typeof w.switchPage==='function')w.switchPage(page);
      markNav(page);
      try{w.scrollTo(0,0)}catch(_){ }
    }

    dashboard.addEventListener('click',function(e){const b=e.target.closest('[data-page]');if(b)openPage(b.dataset.page)});
    bottom.addEventListener('click',function(e){const b=e.target.closest('button');if(!b)return;if(b.dataset.home)showDashboard();else if(b.dataset.more){more.classList.add('show');b.classList.add('more-open')}else if(b.dataset.page)openPage(b.dataset.page)});
    more.addEventListener('click',function(e){if(e.target===more){more.classList.remove('show');return}const b=e.target.closest('[data-page]');if(b)openPage(b.dataset.page)});

    d.addEventListener('click',function(e){
      const clickable=e.target.closest&&e.target.closest('[onclick*="switchPage"]');
      if(clickable&&dashboard.classList.contains('show'))hideDashboard();
    },true);

    function mins(t){if(!t)return NaN;const p=String(t).replace('.',':').split(':');if(p.length<2)return NaN;return (+p[0])*60+(+p[1])}
    function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
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
      const items=Array.isArray(days[active])?days[active]:[];
      const group=w.localStorage.getItem('upper_schedule_mygroup')||'A';
      const now=new Date(),cur=now.getHours()*60+now.getMinutes();
      const turns=items.filter(i=>i&&i.type==='turn'&&i.start&&(group==='ALL'||i.group===group||i.group==='A+B+C+D')).sort((a,b)=>mins(a.start)-mins(b.start));
      const nextTurn=turns.find(i=>mins(i.start)>cur);
      const programs=items.filter(i=>i&&i.type!=='turn'&&i.start&&mins(i.start)>cur).sort((a,b)=>mins(a.start)-mins(b.start));
      const nextProgram=programs[0];
      const meta=d.getElementById('urScheduleMeta'),next=d.getElementById('urScheduleNext');
      if(meta){meta.innerHTML=keys.length?'<span class="ur-highlight">'+esc(active||'Zeitplan')+'</span> · '+keys.length+' Tag'+(keys.length===1?'':'e')+' geladen · Gruppe '+esc(group):'Noch kein Zeitplan geladen'}
      if(next){
        if(nextTurn&&nextProgram){next.innerHTML='Nächster Turn <span class="ur-highlight">'+esc(nextTurn.start)+'</span> · '+esc(nextProgram.title)+' '+esc(nextProgram.start)}
        else if(nextTurn){next.innerHTML='Nächster Turn <span class="ur-highlight">'+esc(nextTurn.start)+'</span>'}
        else if(nextProgram){next.innerHTML='Nächster Programmpunkt: <span class="ur-highlight">'+esc(nextProgram.title)+' '+esc(nextProgram.start)+'</span>'}
        else next.textContent=keys.length?'Für den gewählten Tag kein weiterer Eintrag':'Automatisch oder per PDF laden';
      }
      const ps=packStats(),pm=d.getElementById('urPackMeta'),pb=d.getElementById('urPackBadge');
      if(pm)pm.textContent=ps.total?ps.open+' offen · '+ps.done+' erledigt':'Packliste öffnen';
      if(pb){pb.textContent=ps.open;pb.style.display=ps.open>0?'grid':'none'}
      const best=d.getElementById('headerAllTimeValue'),lm=d.getElementById('urLapsMeta');if(lm)lm.textContent='Bestzeit: '+(best?best.textContent.trim():'--:--.---');
      const bike=d.getElementById('motorcycleSelect'),track=d.getElementById('trackSelect'),sub=d.getElementById('urDashSub');
      if(sub){const bt=bike&&bike.selectedOptions&&bike.selectedOptions[0]?bike.selectedOptions[0].textContent:'';const tt=track&&track.selectedOptions&&track.selectedOptions[0]?track.selectedOptions[0].textContent:'';sub.textContent=[bt,tt].filter(Boolean).join(' · ')||'Trackday Übersicht'}
    }

    setTimeout(showDashboard,900);
    setInterval(function(){updateDashboard();if(!dashboard.classList.contains('show')){
      const activePage=[...d.querySelectorAll('.page-content')].find(p=>p.style.display!=='none'&&getComputedStyle(p).display!=='none');
      if(activePage){const id=activePage.id||'';if(/Schedule/i.test(id))markNav('schedule');else if(/Pack/i.test(id))markNav('pack');else if(/Laps/i.test(id))markNav('laps')}
    }},1000);
  });
})();