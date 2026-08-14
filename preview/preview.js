(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow;
    const d=frame.contentDocument;
    if(!w||!d)return;

    const style=d.createElement('style');
    style.textContent=`
      .app-header{padding:8px!important;background:#090909!important}
      .header-brand-row{min-height:40px!important;margin-bottom:7px!important}
      .header-brand-logo{width:42px!important;height:42px!important}
      .header-select-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important}
      .header-control-card{min-height:58px!important;padding:7px 8px!important;border-radius:8px!important}
      .header-weather-card{display:none!important}
      .header-status-grid{display:grid!important;grid-template-columns:minmax(0,1fr) 112px!important;gap:6px!important;margin-top:6px!important;position:relative!important}
      #headerScheduleWidget{grid-column:1 / -1!important;grid-row:1!important;width:100%!important;max-width:none!important;min-height:74px!important;padding:9px 118px 9px 10px!important;margin:0!important;display:flex!important;align-items:center!important;align-content:center!important;flex-wrap:wrap!important;gap:5px 8px!important;overflow:hidden!important;position:relative!important;transition:border-color .18s ease,background .18s ease,box-shadow .18s ease!important}
      #headerScheduleWidget::before{content:'TURN'!important;width:100%!important;margin:0 0 3px!important}
      #headerScheduleWidget .turn-next-badge{font-size:1.02rem!important;line-height:1.2!important}
      #headerScheduleWidget .turn-time-rem{font-size:1.28rem!important;font-weight:900!important}
      #headerScheduleWidget .turn-group-badge{font-size:.78rem!important;padding:5px 7px!important}
      .preview-next-turn-time{grid-column:2!important;grid-row:1!important;align-self:stretch!important;justify-self:stretch!important;z-index:4!important;pointer-events:none!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:flex-end!important;text-align:right!important;padding:7px 9px 7px 4px!important}
      .preview-next-turn-time .pnt-label{color:#8e8e8e;font-size:.47rem;font-weight:900;letter-spacing:.45px;line-height:1.1;white-space:nowrap}
      .preview-next-turn-time .pnt-group{color:#aaa;font-size:.49rem;font-weight:800;margin-top:2px;white-space:nowrap}
      .preview-next-turn-time .pnt-time{color:#fff;font-size:1rem;font-weight:900;line-height:1.05;margin-top:2px;white-space:nowrap}
      #headerScheduleWidget.preview-warning-10{border-color:#ff8c00!important;background:linear-gradient(145deg,#352000,#17110a)!important;box-shadow:0 0 0 1px rgba(255,140,0,.22),0 0 12px rgba(255,140,0,.28)!important;animation:none!important}
      #headerScheduleWidget.preview-warning-10 + .preview-next-turn-time .pnt-time{color:#ffad33!important}
      @keyframes preview-fire-pulse{0%,100%{border-color:#ff2a16;background:linear-gradient(145deg,#3d0803,#1a0806);box-shadow:0 0 0 1px rgba(255,42,22,.35),0 0 8px rgba(255,42,22,.35)}50%{border-color:#ff5a00;background:linear-gradient(145deg,#5a1300,#260702);box-shadow:0 0 0 2px rgba(255,90,0,.58),0 0 22px rgba(255,42,0,.72)}}
      #headerScheduleWidget.preview-warning-5{animation:preview-fire-pulse .72s ease-in-out infinite!important}
      #headerScheduleWidget.preview-warning-5 + .preview-next-turn-time .pnt-time{color:#ff3b20!important}
      .header-best-card{grid-column:2!important;grid-row:2!important;min-height:58px!important;padding:7px 8px!important}
      .header-best-hint{display:none!important}.header-best-value{font-size:.84rem!important}.header-best-label{font-size:.52rem!important}
      .preview-weather-card{grid-column:1!important;grid-row:2!important;min-height:58px!important;display:flex!important;align-items:center!important;gap:8px!important;background:linear-gradient(145deg,#191919,#101010)!important;border:1px solid #3a3a3a!important;border-radius:9px!important;padding:7px 9px!important;cursor:pointer!important;overflow:hidden!important}
      .preview-weather-card .pw-icon{font-size:1.25rem;flex:0 0 28px;text-align:center}.preview-weather-card .pw-body{min-width:0;flex:1}.preview-weather-card .pw-label{font-size:.52rem;font-weight:900;letter-spacing:.7px;color:#969696}.preview-weather-card .pw-temp{font-size:.9rem;font-weight:900;color:#fff}.preview-weather-card .pw-info{font-size:.53rem;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .stardesign-auto-box{background:#151515;border:1px solid #3a3a3a;border-radius:8px;padding:10px;margin:0 0 10px;color:#fff;font-size:.76rem}
      .stardesign-auto-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.stardesign-auto-title{font-weight:900;color:#ffd400}.stardesign-auto-status{color:#aaa;margin-top:4px;line-height:1.35}.stardesign-auto-btn{margin-top:8px;width:100%;background:#ffd400;color:#080808;border:0;border-radius:5px;padding:9px 8px;font-size:.78rem;font-weight:900;cursor:pointer}.stardesign-auto-btn:disabled{opacity:.45;cursor:default}.stardesign-auto-link{display:block;margin-top:7px;color:#ddd;text-decoration:underline;font-size:.69rem}
      @media(max-width:360px){.header-status-grid{grid-template-columns:minmax(0,1fr) 104px!important}#headerScheduleWidget{min-height:72px!important;padding:8px 110px 8px 8px!important}#headerScheduleWidget .turn-next-badge{font-size:.96rem!important}#headerScheduleWidget .turn-time-rem{font-size:1.2rem!important}.preview-next-turn-time{padding-right:7px!important}.preview-next-turn-time .pnt-time{font-size:.92rem!important}.preview-weather-card{padding:6px!important}.header-control-icon{width:22px!important;flex-basis:22px!important}}
    `;
    d.head.appendChild(style);

    const status=d.querySelector('.header-status-grid');
    const widget=d.getElementById('headerScheduleWidget');
    const weather=d.getElementById('weather-header-widget');
    let nextTurnBox=null;
    if(status&&widget&&!status.querySelector('.preview-next-turn-time')){nextTurnBox=d.createElement('div');nextTurnBox.className='preview-next-turn-time';status.insertBefore(nextTurnBox,status.children[1]||null)}else if(status){nextTurnBox=status.querySelector('.preview-next-turn-time')}

    if(status&&weather&&!status.querySelector('.preview-weather-card')){
      const weatherClone=d.createElement('div');weatherClone.className='preview-weather-card';weatherClone.title='Klicken für Wettervorhersage & Regenradar';weatherClone.innerHTML='<span class="pw-icon">⏳</span><span class="pw-body"><span class="pw-label">WETTER</span><div class="pw-temp">--°C</div><div class="pw-info">Akt: --% | Tag: --%</div></span><span style="color:#ffd400">›</span>';weatherClone.onclick=function(){weather.click()};status.insertBefore(weatherClone,status.querySelector('.header-best-card'));
      const syncWeather=function(){const icon=d.getElementById('weather-icon'),temp=d.getElementById('weather-temp'),info=d.getElementById('weather-info-text');if(icon)weatherClone.querySelector('.pw-icon').textContent=icon.textContent;if(temp)weatherClone.querySelector('.pw-temp').textContent=temp.textContent;if(info)weatherClone.querySelector('.pw-info').textContent=info.textContent;weatherClone.classList.toggle('alert-yellow',weather.classList.contains('alert-yellow'));weatherClone.classList.toggle('alert-orange',weather.classList.contains('alert-orange'));weatherClone.classList.toggle('alert-red',weather.classList.contains('alert-red'))};new MutationObserver(syncWeather).observe(weather,{subtree:true,childList:true,characterData:true,attributes:true});syncWeather();
    }

    function mins(t){if(!t)return 0;const p=String(t).trim().replace('.',':').split(':');return(+p[0]||0)*60+(+p[1]||0)}
    function currentSchedule(){try{const days=JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}');let day=w.localStorage.getItem('upper_schedule_activeday');if(!day||!days[day])day=Object.keys(days)[0];return Array.isArray(days[day])?days[day]:[]}catch(e){return[]}}
    function updateNextTurnInfo(){if(!widget||!nextTurnBox)return;const selectedGroup=w.localStorage.getItem('upper_schedule_mygroup')||'A';const now=new Date();const nowMins=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;const turns=currentSchedule().filter(function(item){if(!item||item.type!=='turn'||!item.start)return false;if(selectedGroup==='ALL')return true;return item.group===selectedGroup||item.group==='A+B+C+D'}).sort(function(a,b){return mins(a.start)-mins(b.start)});const next=turns.find(function(item){return mins(item.start)>nowMins});widget.classList.remove('preview-warning-10','preview-warning-5');if(!next){nextTurnBox.innerHTML='<div class="pnt-label">NÄCHSTER TURN</div><div class="pnt-time">--:--</div>';return}const diff=mins(next.start)-nowMins;const groupLabel=selectedGroup==='ALL'?(next.group||''):'GR. '+selectedGroup;nextTurnBox.innerHTML='<div class="pnt-label">NÄCHSTER TURN</div><div class="pnt-group">'+groupLabel+'</div><div class="pnt-time">'+next.start+'</div>';if(diff>0&&diff<=5){widget.classList.add('preview-warning-5')}else if(diff>5&&diff<=10){widget.classList.add('preview-warning-10')}}
    updateNextTurnInfo();setInterval(updateNextTurnInfo,500);

    /* Stardesign Event-Finder: Die Eventseite ist öffentlich. Wir prüfen Strecke + heutiges Datum.
       Wegen möglicher Browser-CORS-Sperre wird der direkte PDF-Import nur angeboten, wenn die
       PDF-URL tatsächlich aus der Eventseite gelesen werden konnte. Der manuelle PDF-Import bleibt. */
    const trackAliases={pannoniaring:['pannoniaring','pannonia'],slovakia:['slovakiaring','slovakia'],brünn:['brünn','brunn','brno','masaryk'],most:['most'],grobnik:['grobnik','rijeka']};
    function selectedTrackKey(){const el=d.getElementById('trackSelect');return el?String(el.value||'').toLowerCase():''}
    function formatDateDE(dt){return String(dt.getDate()).padStart(2,'0')+'.'+String(dt.getMonth()+1).padStart(2,'0')+'.'+dt.getFullYear()}
    function parseRange(text){const m=String(text).match(/(\d{1,2})\.(\d{1,2})\.\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/);if(!m)return null;return{start:new Date(+m[5],+m[2]-1,+m[1]),end:new Date(+m[5],+m[4]-1,+m[3])}}
    function sameDayOrInside(now,range){const n=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();return range&&n>=range.start.getTime()&&n<=range.end.getTime()}
    function findScheduleSection(){return d.getElementById('pdfImportSection')||d.querySelector('[id*="pdfImport"]')}
    function ensureAutoBox(){const section=findScheduleSection();if(!section)return null;let box=d.getElementById('stardesignAutoSchedule');if(box)return box;box=d.createElement('div');box.id='stardesignAutoSchedule';box.className='stardesign-auto-box';box.innerHTML='<div class="stardesign-auto-head"><span class="stardesign-auto-title">🏁 Stardesign Zeitplan</span></div><div class="stardesign-auto-status">Prüfe passendes Event …</div>';section.parentNode.insertBefore(box,section);return box}
    async function checkStardesignEvent(){const box=ensureAutoBox();if(!box)return;const key=selectedTrackKey();const aliases=trackAliases[key]||[key];box.querySelector('.stardesign-auto-status').textContent='Prüfe '+(d.getElementById('trackSelect')?.selectedOptions[0]?.textContent||key)+' für '+formatDateDE(new Date())+' …';try{const res=await fetch('https://www.stardesignracing.com/events',{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);const html=await res.text();const doc=new DOMParser().parseFromString(html,'text/html');const headings=[...doc.querySelectorAll('h2,h3,h4')];let event=null;for(const h of headings){const title=(h.textContent||'').trim();if(!aliases.some(a=>title.toLowerCase().includes(a)))continue;let root=h.parentElement;for(let i=0;i<6&&root;i++,root=root.parentElement){const txt=(root.textContent||'').replace(/\s+/g,' ');const range=parseRange(txt);if(range&&sameDayOrInside(new Date(),range)){const links=[...root.querySelectorAll('a')];const sched=links.find(a=>/zeitplan/i.test(a.textContent||'')||/\.pdf(?:$|\?)/i.test(a.href||''));event={title,range,pdf:sched?sched.href:'',eventUrl:'https://www.stardesignracing.com/events'};break}}if(event)break}
        if(!event){box.querySelector('.stardesign-auto-status').textContent='Heute wurde für die gewählte Strecke kein passendes Stardesign-Event gefunden.';return}
        const dates=formatDateDE(event.range.start)+' – '+formatDateDE(event.range.end);box.querySelector('.stardesign-auto-status').innerHTML='<strong>'+event.title+'</strong><br>'+dates+'<br>Zeitplan gefunden.';
        if(event.pdf){const btn=d.createElement('button');btn.className='stardesign-auto-btn';btn.textContent='Zeitplan automatisch laden';btn.onclick=async function(){btn.disabled=true;btn.textContent='Lade Zeitplan …';try{const pdfRes=await fetch(event.pdf,{cache:'no-store'});if(!pdfRes.ok)throw new Error('PDF HTTP '+pdfRes.status);const blob=await pdfRes.blob();const file=new File([blob],'Stardesign-Zeitplan.pdf',{type:'application/pdf'});const input=d.getElementById('schedulePdfFile');if(!input)throw new Error('PDF-Importfeld nicht gefunden');const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));btn.textContent='Zeitplan an PDF-Import übergeben'}catch(err){console.warn('[Preview] Automatischer Stardesign-PDF-Import:',err);btn.disabled=false;btn.textContent='Direkter Import blockiert – PDF öffnen'}};box.appendChild(btn)}
        const link=d.createElement('a');link.className='stardesign-auto-link';link.href=event.pdf||event.eventUrl;link.target='_blank';link.rel='noopener';link.textContent=event.pdf?'Zeitplan bei Stardesign öffnen':'Stardesign Eventseite öffnen';box.appendChild(link)
      }catch(err){console.warn('[Preview] Stardesign Eventprüfung nicht direkt möglich:',err);box.querySelector('.stardesign-auto-status').textContent='Automatische Online-Prüfung wurde vom Stardesign-Server/Browser blockiert. Der normale PDF-Import funktioniert weiterhin.';const link=d.createElement('a');link.className='stardesign-auto-link';link.href='https://www.stardesignracing.com/events';link.target='_blank';link.rel='noopener';link.textContent='Stardesign Events öffnen';box.appendChild(link)}}
    const track=d.getElementById('trackSelect');if(track)track.addEventListener('change',function(){const old=d.getElementById('stardesignAutoSchedule');if(old)old.remove();setTimeout(checkStardesignEvent,50)});setTimeout(checkStardesignEvent,700);
  });
})();