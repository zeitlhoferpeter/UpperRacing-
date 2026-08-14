(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const style=d.createElement('style');
    style.textContent=`
      .app-header{padding:8px!important;background:#090909!important}
      .header-brand-row{min-height:40px!important;margin-bottom:7px!important}
      .header-brand-logo{width:42px!important;height:42px!important}
      .header-select-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important}
      .header-control-card{min-height:58px!important;padding:7px 8px!important;border-radius:8px!important}
      .header-weather-card{display:none!important}

      .header-status-grid{display:grid!important;grid-template-columns:1fr 112px!important;gap:6px!important;margin-top:6px!important}

      /* Das originale Widget bleibt funktional, ist aber unsichtbar. Dadurch kann
         schedule.js weiterhin Alarme steuern, ohne unsere Preview-Anzeige zu überschreiben. */
      #headerScheduleWidget{display:none!important}

      .preview-turn-card{grid-column:1 / -1;min-height:82px;padding:9px 10px;background:linear-gradient(145deg,#191919,#101010);border:1px solid #3a3a3a;border-radius:9px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-rows:auto auto;column-gap:9px;align-items:center;cursor:pointer;overflow:hidden;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}
      .preview-turn-card .pt-label{grid-column:1/-1;color:#969696;font-size:.57rem;font-weight:900;letter-spacing:.9px;line-height:1;margin-bottom:3px}
      .preview-turn-card .pt-group{background:#ffd400;color:#080808;border-radius:5px;padding:5px 7px;font-size:.78rem;font-weight:900;white-space:nowrap}
      .preview-turn-card .pt-main{min-width:0}
      .preview-turn-card .pt-time{font-size:1.07rem;font-weight:900;color:#fff;line-height:1.05;white-space:nowrap}
      .preview-turn-card .pt-title{font-size:.62rem;color:#aaa;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .preview-turn-card .pt-count{text-align:right;white-space:nowrap}
      .preview-turn-card .pt-count small{display:block;color:#888;font-size:.48rem;letter-spacing:.5px;margin-bottom:2px;font-weight:800}
      .preview-turn-card .pt-count strong{display:block;color:#ffd400;font-size:1.02rem;font-weight:900;line-height:1}
      .preview-turn-card .pt-count span{display:block;color:#8f8f8f;font-size:.49rem;margin-top:2px}
      .preview-turn-card.pt-active{border-color:#4CAF50;background:linear-gradient(145deg,#132716,#101710)}
      .preview-turn-card.pt-active .pt-count strong{color:#7ed883}
      .preview-turn-card.schedule-glow-10m{animation:schedule-pulse-glow .8s infinite alternate!important}

      .header-best-card{grid-column:2;grid-row:2;min-height:58px!important;padding:7px 8px!important}
      .header-best-hint{display:none!important}.header-best-value{font-size:.84rem!important}.header-best-label{font-size:.52rem!important}

      .preview-weather-card{grid-column:1;grid-row:2;min-height:58px!important;display:flex!important;align-items:center!important;gap:8px!important;background:linear-gradient(145deg,#191919,#101010)!important;border:1px solid #3a3a3a!important;border-radius:9px!important;padding:7px 9px!important;cursor:pointer!important;overflow:hidden}
      .preview-weather-card .pw-icon{font-size:1.25rem;flex:0 0 28px;text-align:center}.preview-weather-card .pw-body{min-width:0;flex:1}.preview-weather-card .pw-label{font-size:.52rem;font-weight:900;letter-spacing:.7px;color:#969696}.preview-weather-card .pw-temp{font-size:.9rem;font-weight:900;color:#fff}.preview-weather-card .pw-info{font-size:.53rem;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

      @media(max-width:360px){
        .header-status-grid{grid-template-columns:1fr 104px!important}
        .preview-turn-card{min-height:78px;padding:8px!important;column-gap:7px!important}
        .preview-turn-card .pt-time{font-size:.98rem}
        .preview-turn-card .pt-count strong{font-size:.94rem}
        .preview-weather-card{padding:6px!important}
        .header-control-icon{width:22px!important;flex-basis:22px!important}
      }
    `;
    d.head.appendChild(style);

    const status=d.querySelector('.header-status-grid');
    const originalWidget=d.getElementById('headerScheduleWidget');
    const weather=d.getElementById('weather-header-widget');

    let turnCard=null;
    if(status&&originalWidget){
      turnCard=d.createElement('div');
      turnCard.className='preview-turn-card';
      turnCard.title='Klicken für ausführlichen Zeitplan';
      turnCard.onclick=function(){originalWidget.click()};
      status.insertBefore(turnCard,status.firstChild);
    }

    if(status&&weather){
      const weatherClone=d.createElement('div');
      weatherClone.className='preview-weather-card';
      weatherClone.title='Klicken für Wettervorhersage & Regenradar';
      weatherClone.innerHTML='<span class="pw-icon">⏳</span><span class="pw-body"><span class="pw-label">WETTER</span><div class="pw-temp">--°C</div><div class="pw-info">Akt: --% | Tag: --%</div></span><span style="color:#ffd400">›</span>';
      weatherClone.onclick=function(){weather.click()};
      status.insertBefore(weatherClone,status.querySelector('.header-best-card'));

      const syncWeather=function(){
        const icon=d.getElementById('weather-icon'),temp=d.getElementById('weather-temp'),info=d.getElementById('weather-info-text');
        if(icon)weatherClone.querySelector('.pw-icon').textContent=icon.textContent;
        if(temp)weatherClone.querySelector('.pw-temp').textContent=temp.textContent;
        if(info)weatherClone.querySelector('.pw-info').textContent=info.textContent;
        weatherClone.classList.toggle('alert-yellow',weather.classList.contains('alert-yellow'));
        weatherClone.classList.toggle('alert-orange',weather.classList.contains('alert-orange'));
        weatherClone.classList.toggle('alert-red',weather.classList.contains('alert-red'));
      };
      new MutationObserver(syncWeather).observe(weather,{subtree:true,childList:true,characterData:true,attributes:true});
      syncWeather();
    }

    function mins(t){
      if(!t)return 0;
      const p=String(t).replace('.',':').split(':');
      return (+p[0]||0)*60+(+p[1]||0);
    }

    function esc(s){
      return String(s==null?'':s).replace(/[&<>\"']/g,function(c){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c];
      });
    }

    function currentSchedule(){
      try{
        const days=JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}');
        let day=w.localStorage.getItem('upper_schedule_activeday');
        if(!days[day])day=Object.keys(days)[0];
        return days[day]||[];
      }catch(e){return[]}
    }

    function formatCountdown(totalSeconds){
      totalSeconds=Math.max(0,Math.floor(totalSeconds));
      const h=Math.floor(totalSeconds/3600);
      const m=Math.floor((totalSeconds%3600)/60);
      const s=totalSeconds%60;
      const pad=n=>String(n).padStart(2,'0');
      return h>0 ? h+':'+pad(m)+':'+pad(s) : m+':'+pad(s);
    }

    function renderTurnPreview(){
      if(!turnCard)return;

      const group=w.localStorage.getItem('upper_schedule_mygroup')||'A';
      const now=new Date();
      const nowSeconds=now.getHours()*3600+now.getMinutes()*60+now.getSeconds();
      const curMinutes=nowSeconds/60;

      const turns=currentSchedule()
        .filter(x=>x&&x.type==='turn'&&(group==='ALL'||x.group===group||x.group==='A+B+C+D'))
        .sort((a,b)=>mins(a.start)-mins(b.start));

      const active=turns.find(x=>x.end&&curMinutes>=mins(x.start)&&curMinutes<mins(x.end));
      const next=turns.find(x=>mins(x.start)>curMinutes);
      const item=active||next;

      turnCard.classList.remove('pt-active','schedule-glow-10m');

      if(!item){
        turnCard.innerHTML='<div class="pt-label">NÄCHSTER TURN</div><div class="pt-main" style="grid-column:1/-1"><div class="pt-time">Kein Turn</div><div class="pt-title">Für die gewählte Gruppe ist heute nichts mehr geplant.</div></div>';
        return;
      }

      const targetSeconds=(active?mins(item.end):mins(item.start))*60;
      const diffSeconds=Math.max(0,targetSeconds-nowSeconds);
      const diffMinutes=diffSeconds/60;
      const countdown=formatCountdown(diffSeconds);

      if(active)turnCard.classList.add('pt-active');
      if(!active&&diffMinutes<=10&&diffMinutes>0&&w.localStorage.getItem('upper_schedule_alert10m')!=='false'){
        turnCard.classList.add('schedule-glow-10m');
      }

      const label=active?'TURN LÄUFT':'START IN';
      const clockText=active
        ? esc(item.start)+' – '+esc(item.end)+' Uhr'
        : (item.end?esc(item.start)+' – '+esc(item.end)+' Uhr':esc(item.start)+' Uhr');
      const subText=active
        ? esc(item.title||'Freies Fahren')+' · Ende '+esc(item.end)+' Uhr'
        : esc(item.title||'Freies Fahren');

      turnCard.innerHTML=
        '<div class="pt-label">'+(active?'AKTUELLER TURN':'NÄCHSTER TURN')+'</div>'+ 
        '<span class="pt-group">Gr. '+esc(item.group)+'</span>'+ 
        '<div class="pt-main"><div class="pt-time">'+clockText+'</div><div class="pt-title">'+subText+'</div></div>'+ 
        '<div class="pt-count"><small>'+label+'</small><strong>'+countdown+'</strong><span>MIN:SEK</span></div>';
    }

    /* Nur unsere eigene Anzeige wird aktualisiert. Das verhindert das vorherige
       Hin-und-her-Schreiben mit schedule.js und damit das sichtbare Zucken. */
    setInterval(renderTurnPreview,250);
    renderTurnPreview();
  });
})();