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
      .header-schedule-widget{grid-column:1 / -1!important;min-height:78px!important;padding:9px 10px!important;display:grid!important;grid-template-columns:auto 1fr auto!important;grid-template-rows:auto auto!important;column-gap:8px!important;align-items:center!important}
      .header-schedule-widget:before{content:'NÄCHSTER TURN';grid-column:1/-1;width:auto!important;margin:0 0 3px!important;color:#969696!important;font-size:.57rem!important;letter-spacing:.9px!important}
      .header-schedule-widget .preview-turn-group{background:#ffd400;color:#080808;border-radius:5px;padding:5px 7px;font-size:.78rem;font-weight:900;white-space:nowrap}
      .header-schedule-widget .preview-turn-main{min-width:0}
      .header-schedule-widget .preview-turn-time{font-size:1.08rem;font-weight:900;color:#fff;line-height:1.05}
      .header-schedule-widget .preview-turn-title{font-size:.62rem;color:#aaa;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .header-schedule-widget .preview-turn-count{font-size:.92rem;font-weight:900;color:#ffd400;text-align:right;white-space:nowrap}
      .header-schedule-widget .preview-turn-count small{display:block;color:#888;font-size:.48rem;letter-spacing:.5px;margin-bottom:2px}
      .header-best-card{grid-column:2;grid-row:2;min-height:58px!important;padding:7px 8px!important}
      .header-best-hint{display:none!important}.header-best-value{font-size:.84rem!important}.header-best-label{font-size:.52rem!important}
      .preview-weather-card{grid-column:1;grid-row:2;min-height:58px!important;display:flex!important;align-items:center!important;gap:8px!important;background:linear-gradient(145deg,#191919,#101010)!important;border:1px solid #3a3a3a!important;border-radius:9px!important;padding:7px 9px!important;cursor:pointer!important;overflow:hidden}
      .preview-weather-card .pw-icon{font-size:1.25rem;flex:0 0 28px;text-align:center}.preview-weather-card .pw-body{min-width:0;flex:1}.preview-weather-card .pw-label{font-size:.52rem;font-weight:900;letter-spacing:.7px;color:#969696}.preview-weather-card .pw-temp{font-size:.9rem;font-weight:900;color:#fff}.preview-weather-card .pw-info{font-size:.53rem;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:360px){.header-status-grid{grid-template-columns:1fr 104px!important}.header-schedule-widget{min-height:74px!important}.preview-weather-card{padding:6px!important}.header-control-icon{width:22px!important;flex-basis:22px!important}}
    `;
    d.head.appendChild(style);

    const status=d.querySelector('.header-status-grid');
    const weather=d.getElementById('weather-header-widget');
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

    const widget=d.getElementById('headerScheduleWidget');
    function mins(t){if(!t)return 0;const p=String(t).replace('.',':').split(':');return (+p[0]||0)*60+(+p[1]||0)}
    function esc(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]})}
    function currentSchedule(){
      try{const days=JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}');let day=w.localStorage.getItem('upper_schedule_activeday');if(!days[day])day=Object.keys(days)[0];return days[day]||[]}catch(e){return[]}
    }
    function renderTurnPreview(){
      if(!widget)return;
      const group=w.localStorage.getItem('upper_schedule_mygroup')||'A';
      const now=new Date(),cur=now.getHours()*60+now.getMinutes();
      const turns=currentSchedule().filter(x=>x&&x.type==='turn'&&(group==='ALL'||x.group===group||x.group==='A+B+C+D')).sort((a,b)=>mins(a.start)-mins(b.start));
      let active=turns.find(x=>x.end&&cur>=mins(x.start)&&cur<mins(x.end));
      let next=turns.find(x=>mins(x.start)>cur);
      const item=active||next;
      if(!item){widget.innerHTML='<div class="preview-turn-main"><div class="preview-turn-time">Kein Turn</div><div class="preview-turn-title">Für die gewählte Gruppe ist heute nichts mehr geplant.</div></div>';return}
      const diff=active?Math.max(0,mins(item.end)-cur):Math.max(0,mins(item.start)-cur);
      const label=active?'TURN LÄUFT':'START IN';
      const title=active?'bis '+esc(item.end)+' Uhr':(item.end?esc(item.start)+' – '+esc(item.end)+' Uhr':esc(item.start)+' Uhr');
      widget.innerHTML='<span class="preview-turn-group">Gr. '+esc(item.group)+'</span><div class="preview-turn-main"><div class="preview-turn-time">'+title+'</div><div class="preview-turn-title">'+esc(item.title||'Freies Fahren')+'</div></div><div class="preview-turn-count"><small>'+label+'</small>'+diff+' MIN</div>';
    }
    setInterval(renderTurnPreview,1000);renderTurnPreview();
  });
})();