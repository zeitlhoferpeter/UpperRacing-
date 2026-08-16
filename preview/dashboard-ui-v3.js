(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const style=d.createElement('style');
    style.id='upperDashboardV3Styles';
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
      @keyframes ur-weather-red-v3{0%,100%{box-shadow:0 0 0 1px rgba(255,45,25,.38),0 0 12px rgba(255,45,25,.40)}50%{box-shadow:0 0 0 2px rgba(255,73,35,.72),0 0 26px rgba(255,45,25,.72)}}
      .preview-weather-card.alert-red{border-color:#ff2d19!important;background:linear-gradient(145deg,#4b0d06,#210806)!important;animation:ur-weather-red-v3 .85s ease-in-out infinite!important;transform:scale(1.015)!important}
      .header-best-card{min-height:70px!important;border-radius:10px!important;padding:8px 9px!important}.header-best-value{font-size:.96rem!important}.header-best-label{font-size:.55rem!important}

      #upperDashboardV3{display:none;padding:13px 12px 92px;background:#0b0b0b;min-height:48vh;box-sizing:border-box}
      #upperDashboardV3.show{display:block}
      .ur3-head{display:flex;justify-content:space-between;align-items:center;margin:2px 1px 10px}.ur3-head h2{margin:0;font-size:.82rem;font-weight:900;letter-spacing:1.1px;color:#ddd}.ur3-head span{font-size:.6rem;color:#777}
      .ur3-card{background:linear-gradient(145deg,#181818,#111);border:1px solid #3b3b3b;border-radius:12px;padding:12px 13px;box-sizing:border-box;margin-bottom:9px}
      .ur3-card-title{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:9px}.ur3-card-title strong{font-size:.7rem;letter-spacing:.7px;color:#ddd}.ur3-card-title span{font-size:.56rem;color:#777}
      .ur3-row{display:grid;grid-template-columns:105px minmax(0,1fr);gap:8px;padding:6px 0;border-top:1px solid #2f2f2f;align-items:start}.ur3-row:first-of-type{border-top:0;padding-top:0}.ur3-label{font-size:.61rem;color:#8e8e8e;font-weight:800}.ur3-value{font-size:.72rem;color:#f2f2f2;font-weight:800;line-height:1.35;min-width:0}.ur3-value strong{color:#ffd400}
      .ur3-quick{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ur3-mini{background:linear-gradient(145deg,#181818,#111);border:1px solid #383838;border-radius:12px;padding:11px;min-height:87px;box-sizing:border-box}.ur3-mini .k{font-size:.55rem;color:#888;font-weight:800;letter-spacing:.5px}.ur3-mini .v{font-size:.92rem;color:#fff;font-weight:900;margin-top:7px;line-height:1.25}.ur3-mini .s{font-size:.58rem;color:#888;margin-top:4px}
      .ur3-pressure{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ur3-pressure-box{background:#111;border:1px solid #363636;border-radius:10px;padding:9px}.ur3-pressure-label{font-size:.56rem;color:#909090;font-weight:900;letter-spacing:.45px;margin-bottom:6px}.ur3-pressure-input{display:flex;align-items:center;gap:6px}.ur3-pressure-input input{min-width:0;width:100%;background:#0a0a0a;color:#fff;border:1px solid #555;border-radius:8px;padding:9px 8px;font-size:1rem;font-weight:900;box-sizing:border-box;text-align:center}.ur3-pressure-input input:focus{outline:none;border-color:#ffd400;box-shadow:0 0 0 1px rgba(255,212,0,.22)}.ur3-unit{font-size:.63rem;color:#858585;font-weight:800}.ur3-save-line{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:9px}.ur3-save-state{font-size:.58rem;color:#888}.ur3-open-setup{border:0;background:none;color:#ffd400;font-size:.6rem;font-weight:900;padding:5px 0;cursor:pointer}
      .ur3-progress{height:6px;border-radius:4px;background:#262626;overflow:hidden;margin-top:7px}.ur3-progress>span{display:block;height:100%;background:#ffd400;width:0%;transition:width .2s ease}
      .ur3-bottom{position:fixed;left:0;right:0;bottom:0;z-index:9000;display:grid;grid-template-columns:repeat(5,1fr);height:67px;background:rgba(10,10,10,.97);border-top:1px solid #333;padding-bottom:env(safe-area-inset-bottom);box-sizing:content-box}.ur3-nav{appearance:none;border:0;background:none;color:#999;font-size:.58rem;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer}.ur3-nav .i{font-size:1.2rem;line-height:1}.ur3-nav.active{color:#ffd400}.ur3-nav.active:after{content:'';width:25px;height:3px;border-radius:3px;background:#ffd400;margin-top:2px}
      .ur3-more{display:none;position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.64);align-items:flex-end}.ur3-more.show{display:flex}.ur3-panel{width:100%;background:#151515;border-top:1px solid #454545;border-radius:18px 18px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box}.ur3-grip{width:44px;height:4px;border-radius:2px;background:#555;margin:0 auto 12px}.ur3-more-title{font-size:.82rem;font-weight:900;margin:0 0 10px}.ur3-more-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ur3-more-btn{border:1px solid #383838;background:#1b1b1b;color:#fff;border-radius:10px;padding:12px;text-align:left;font-weight:800;font-size:.78rem}.ur3-more-btn span{display:block;color:#888;font-size:.58rem;margin-top:3px;font-weight:600}
      main{padding-bottom:76px!important}
      @media(max-width:370px){.ur3-row{grid-template-columns:92px minmax(0,1fr)}.header-select-grid{grid-template-columns:1fr 1fr!important}.preview-weather-card .pw-info{font-size:.55rem!important}}
    `;
    d.head.appendChild(style);

    const main=d.querySelector('main');
    if(!main)return;

    const dashboard=d.createElement('section');
    dashboard.id='upperDashboardV3';
    dashboard.innerHTML=`
      <div class="ur3-head"><h2>ÜBERSICHT</h2><span id="ur3Context">Trackday</span></div>

      <div class="ur3-card">
        <div class="ur3-card-title"><strong>HEUTE AM TRACK</strong><span id="ur3DayLabel">—</span></div>
        <div class="ur3-row"><div class="ur3-label">Zeitplan</div><div class="ur3-value" id="ur3Schedule">Noch kein Zeitplan geladen</div></div>
        <div class="ur3-row"><div class="ur3-label">Nächster Punkt</div><div class="ur3-value" id="ur3Next">—</div></div>
        <div class="ur3-row"><div class="ur3-label">Meine Gruppe</div><div class="ur3-value" id="ur3Group">—</div></div>
      </div>

      <div class="ur3-card">
        <div class="ur3-card-title"><strong>REIFENDRUCK</strong><span>aktuelles Setup</span></div>
        <div class="ur3-pressure">
          <div class="ur3-pressure-box"><div class="ur3-pressure-label">VORNE</div><div class="ur3-pressure-input"><input id="ur3TireFront" inputmode="decimal" type="text" placeholder="—"><span class="ur3-unit">bar</span></div></div>
          <div class="ur3-pressure-box"><div class="ur3-pressure-label">HINTEN</div><div class="ur3-pressure-input"><input id="ur3TireRear" inputmode="decimal" type="text" placeholder="—"><span class="ur3-unit">bar</span></div></div>
        </div>
        <div class="ur3-save-line"><span class="ur3-save-state" id="ur3SaveState">Änderungen werden direkt im aktuellen Setup gespeichert.</span><button class="ur3-open-setup" type="button" data-page="setup">Setup öffnen ›</button></div>
      </div>

      <div class="ur3-quick">
        <div class="ur3-mini"><div class="k">PACKLISTE</div><div class="v" id="ur3Pack">—</div><div class="ur3-progress"><span id="ur3PackProgress"></span></div><div class="s" id="ur3PackSub">—</div></div>
        <div class="ur3-mini"><div class="k">BESTZEIT</div><div class="v" id="ur3Best">--:--.---</div><div class="s">für Motorrad & Strecke</div></div>
      </div>`;
    main.parentNode.insertBefore(dashboard,main);

    const bottom=d.createElement('nav');
    bottom.className='ur3-bottom';
    bottom.innerHTML=`
      <button class="ur3-nav active" type="button" data-home="1"><span class="i">⌂</span><span>Übersicht</span></button>
      <button class="ur3-nav" type="button" data-page="schedule"><span class="i">📅</span><span>Zeitplan</span></button>
      <button class="ur3-nav" type="button" data-page="pack"><span class="i">✅</span><span>Packliste</span></button>
      <button class="ur3-nav" type="button" data-page="laps"><span class="i">⏱️</span><span>Runden</span></button>
      <button class="ur3-nav" type="button" data-more="1"><span class="i">•••</span><span>Mehr</span></button>`;
    d.body.appendChild(bottom);

    const more=d.createElement('div');
    more.className='ur3-more';
    more.innerHTML=`<div class="ur3-panel"><div class="ur3-grip"></div><div class="ur3-more-title">Mehr</div><div class="ur3-more-grid">
      <button class="ur3-more-btn" data-page="setup">⚙️ Setup<span>Motorrad, Fahrwerk & Sessions</span></button>
      <button class="ur3-more-btn" data-page="curves">🏁 Kurven<span>Strecken-Guide & Notizen</span></button>
      <button class="ur3-more-btn" data-page="cup">🏆 Cup<span>Reglement & Informationen</span></button>
      <button class="ur3-more-btn" data-page="backup">💾 Backup<span>Daten sichern & wiederherstellen</span></button>
    </div></div>`;
    d.body.appendChild(more);

    function markNav(which){
      bottom.querySelectorAll('.ur3-nav').forEach(b=>b.classList.remove('active'));
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
    function selectedText(id){const el=d.getElementById(id);return el&&el.selectedOptions&&el.selectedOptions[0]?el.selectedOptions[0].textContent:''}
    function bestTime(){const el=d.getElementById('headerAllTimeValue');return el?el.textContent.trim():'--:--.---'}
    function setupInput(id){return d.getElementById(id)}

    let saveTimer=null;
    function syncPressureFromSetup(){
      const f=setupInput('tireFront'),r=setupInput('tireRear');
      const df=d.getElementById('ur3TireFront'),dr=d.getElementById('ur3TireRear');
      if(df&&f&&d.activeElement!==df)df.value=f.value||'';
      if(dr&&r&&d.activeElement!==dr)dr.value=r.value||'';
    }
    function savePressure(which,value){
      const target=setupInput(which);if(!target)return;
      target.value=value;
      target.dispatchEvent(new Event('input',{bubbles:true}));
      target.dispatchEvent(new Event('change',{bubbles:true}));
      const state=d.getElementById('ur3SaveState');if(state)state.textContent='Speichere …';
      clearTimeout(saveTimer);
      saveTimer=setTimeout(function(){
        if(typeof w.saveData==='function')w.saveData();
        if(state){state.textContent='Gespeichert im aktuellen Setup ✓';setTimeout(()=>{if(state)state.textContent='Änderungen werden direkt im aktuellen Setup gespeichert.'},1500)}
      },350);
    }
    d.getElementById('ur3TireFront').addEventListener('input',e=>savePressure('tireFront',e.target.value));
    d.getElementById('ur3TireRear').addEventListener('input',e=>savePressure('tireRear',e.target.value));

    function updateDashboard(){
      const days=scheduleData(),keys=Object.keys(days),active=w.localStorage.getItem('upper_schedule_activeday')||keys[0]||'';
      const group=w.localStorage.getItem('upper_schedule_mygroup')||'A';
      const items=Array.isArray(days[active])?days[active]:[];
      const now=new Date(),cur=now.getHours()*60+now.getMinutes();
      const upcoming=items.filter(i=>i&&i.start&&Number.isFinite(mins(i.start))&&mins(i.start)>cur).sort((a,b)=>mins(a.start)-mins(b.start))[0]||null;
      const scheduleEl=d.getElementById('ur3Schedule'),nextEl=d.getElementById('ur3Next'),groupEl=d.getElementById('ur3Group'),ctx=d.getElementById('ur3Context'),day=d.getElementById('ur3DayLabel');
      if(scheduleEl)scheduleEl.innerHTML=keys.length?'<strong>'+active+'</strong> · '+keys.length+' Tag'+(keys.length===1?'':'e')+' geladen':'Noch kein Zeitplan geladen';
      if(nextEl)nextEl.textContent=upcoming?(upcoming.start+' · '+upcoming.title):'Für den gewählten Tag kein weiterer Eintrag';
      if(groupEl)groupEl.textContent='Gruppe '+group;
      if(day)day.textContent=active||'—';
      if(ctx)ctx.textContent=(selectedText('motorcycleSelect')||'Motorrad')+' · '+(selectedText('trackSelect')||'Strecke');
      const ps=packStats(),pack=d.getElementById('ur3Pack'),sub=d.getElementById('ur3PackSub'),prog=d.getElementById('ur3PackProgress');
      if(pack)pack.textContent=ps.total?(ps.open+' offen'):'—';
      if(sub)sub.textContent=ps.total?(ps.done+' von '+ps.total+' erledigt'):'Noch keine Packliste';
      if(prog)prog.style.width=ps.total?Math.round(ps.done/ps.total*100)+'%':'0%';
      const best=d.getElementById('ur3Best');if(best)best.textContent=bestTime();
      syncPressureFromSetup();
    }

    const originalSwitch=w.switchPage;
    if(typeof originalSwitch==='function'&&!originalSwitch.__ur3Wrapped){
      const wrapped=function(page){const result=originalSwitch.apply(this,arguments);if(page!=='dashboard')markNav(String(page||'').toLowerCase());return result};wrapped.__ur3Wrapped=true;w.switchPage=wrapped;
    }

    const moto=d.getElementById('motorcycleSelect'),track=d.getElementById('trackSelect'),sess=d.getElementById('sessionSelect');
    if(moto)moto.addEventListener('change',()=>setTimeout(updateDashboard,100));
    if(track)track.addEventListener('change',()=>setTimeout(updateDashboard,120));
    if(sess)sess.addEventListener('change',()=>setTimeout(updateDashboard,120));
    setInterval(function(){if(dashboard.classList.contains('show'))updateDashboard()},1000);
    setTimeout(showDashboard,950);
  });
})();