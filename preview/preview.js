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

      /* Wetter bleibt unten kompakt. */
      .header-weather-card{display:none!important}

      .header-status-grid{
        display:grid!important;
        grid-template-columns:minmax(0,1fr) 112px!important;
        gap:6px!important;
        margin-top:6px!important;
        position:relative!important;
      }

      /* Die originale Turn-Anzeige aus schedule.js bleibt unverändert funktional. */
      #headerScheduleWidget{
        grid-column:1 / -1!important;
        grid-row:1!important;
        width:100%!important;
        max-width:none!important;
        min-height:74px!important;
        padding:9px 118px 9px 10px!important;
        margin:0!important;
        display:flex!important;
        align-items:center!important;
        align-content:center!important;
        flex-wrap:wrap!important;
        gap:5px 8px!important;
        overflow:hidden!important;
        position:relative!important;
        transition:border-color .18s ease,background .18s ease,box-shadow .18s ease!important;
      }

      /* Nicht „Nächster Turn“, weil links immer der aktuelle Turn stehen kann. */
      #headerScheduleWidget::before{
        content:'TURN'!important;
        width:100%!important;
        margin:0 0 3px!important;
      }

      #headerScheduleWidget .turn-next-badge{
        font-size:.95rem!important;
        line-height:1.2!important;
      }

      #headerScheduleWidget .turn-time-rem{
        font-size:1.05rem!important;
      }

      #headerScheduleWidget .turn-group-badge{
        font-size:.78rem!important;
        padding:5px 7px!important;
      }

      /* Rechte Zusatzinfo: echte Startzeit des nächsten Turns der gewählten Gruppe. */
      .preview-next-turn-time{
        grid-column:2!important;
        grid-row:1!important;
        align-self:stretch!important;
        justify-self:stretch!important;
        z-index:4!important;
        pointer-events:none!important;
        display:flex!important;
        flex-direction:column!important;
        justify-content:center!important;
        align-items:flex-end!important;
        text-align:right!important;
        padding:7px 9px 7px 4px!important;
      }
      .preview-next-turn-time .pnt-label{
        color:#8e8e8e;
        font-size:.47rem;
        font-weight:900;
        letter-spacing:.45px;
        line-height:1.1;
        white-space:nowrap;
      }
      .preview-next-turn-time .pnt-group{
        color:#aaa;
        font-size:.49rem;
        font-weight:800;
        margin-top:2px;
        white-space:nowrap;
      }
      .preview-next-turn-time .pnt-time{
        color:#fff;
        font-size:1rem;
        font-weight:900;
        line-height:1.05;
        margin-top:2px;
        white-space:nowrap;
      }

      /* 10 Minuten vorher: klar ORANGE. */
      #headerScheduleWidget.preview-warning-10{
        border-color:#ff8c00!important;
        background:linear-gradient(145deg,#352000,#17110a)!important;
        box-shadow:0 0 0 1px rgba(255,140,0,.22),0 0 12px rgba(255,140,0,.28)!important;
        animation:none!important;
      }
      #headerScheduleWidget.preview-warning-10 + .preview-next-turn-time .pnt-time{
        color:#ffad33!important;
      }

      /* 5 Minuten vorher: FEUERROT + deutliches Pulsieren. */
      @keyframes preview-fire-pulse{
        0%,100%{
          border-color:#ff2a16;
          background:linear-gradient(145deg,#3d0803,#1a0806);
          box-shadow:0 0 0 1px rgba(255,42,22,.35),0 0 8px rgba(255,42,22,.35);
        }
        50%{
          border-color:#ff5a00;
          background:linear-gradient(145deg,#5a1300,#260702);
          box-shadow:0 0 0 2px rgba(255,90,0,.58),0 0 22px rgba(255,42,0,.72);
        }
      }
      #headerScheduleWidget.preview-warning-5{
        animation:preview-fire-pulse .72s ease-in-out infinite!important;
      }
      #headerScheduleWidget.preview-warning-5 + .preview-next-turn-time .pnt-time{
        color:#ff3b20!important;
      }

      .header-best-card{
        grid-column:2!important;
        grid-row:2!important;
        min-height:58px!important;
        padding:7px 8px!important;
      }
      .header-best-hint{display:none!important}
      .header-best-value{font-size:.84rem!important}
      .header-best-label{font-size:.52rem!important}

      .preview-weather-card{
        grid-column:1!important;
        grid-row:2!important;
        min-height:58px!important;
        display:flex!important;
        align-items:center!important;
        gap:8px!important;
        background:linear-gradient(145deg,#191919,#101010)!important;
        border:1px solid #3a3a3a!important;
        border-radius:9px!important;
        padding:7px 9px!important;
        cursor:pointer!important;
        overflow:hidden!important;
      }
      .preview-weather-card .pw-icon{font-size:1.25rem;flex:0 0 28px;text-align:center}
      .preview-weather-card .pw-body{min-width:0;flex:1}
      .preview-weather-card .pw-label{font-size:.52rem;font-weight:900;letter-spacing:.7px;color:#969696}
      .preview-weather-card .pw-temp{font-size:.9rem;font-weight:900;color:#fff}
      .preview-weather-card .pw-info{font-size:.53rem;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

      @media(max-width:360px){
        .header-status-grid{grid-template-columns:minmax(0,1fr) 104px!important}
        #headerScheduleWidget{min-height:72px!important;padding:8px 110px 8px 8px!important}
        #headerScheduleWidget .turn-next-badge{font-size:.9rem!important}
        .preview-next-turn-time{padding-right:7px!important}
        .preview-next-turn-time .pnt-time{font-size:.92rem!important}
        .preview-weather-card{padding:6px!important}
        .header-control-icon{width:22px!important;flex-basis:22px!important}
      }
    `;
    d.head.appendChild(style);

    const status=d.querySelector('.header-status-grid');
    const widget=d.getElementById('headerScheduleWidget');
    const weather=d.getElementById('weather-header-widget');

    /* Rechtes Feld für die nächste echte Startzeit der ausgewählten Gruppe. */
    let nextTurnBox=null;
    if(status&&widget&&!status.querySelector('.preview-next-turn-time')){
      nextTurnBox=d.createElement('div');
      nextTurnBox.className='preview-next-turn-time';
      status.insertBefore(nextTurnBox,status.children[1]||null);
    }else if(status){
      nextTurnBox=status.querySelector('.preview-next-turn-time');
    }

    if(status&&weather&&!status.querySelector('.preview-weather-card')){
      const weatherClone=d.createElement('div');
      weatherClone.className='preview-weather-card';
      weatherClone.title='Klicken für Wettervorhersage & Regenradar';
      weatherClone.innerHTML='<span class="pw-icon">⏳</span><span class="pw-body"><span class="pw-label">WETTER</span><div class="pw-temp">--°C</div><div class="pw-info">Akt: --% | Tag: --%</div></span><span style="color:#ffd400">›</span>';
      weatherClone.onclick=function(){weather.click()};
      status.insertBefore(weatherClone,status.querySelector('.header-best-card'));

      const syncWeather=function(){
        const icon=d.getElementById('weather-icon');
        const temp=d.getElementById('weather-temp');
        const info=d.getElementById('weather-info-text');
        if(icon)weatherClone.querySelector('.pw-icon').textContent=icon.textContent;
        if(temp)weatherClone.querySelector('.pw-temp').textContent=temp.textContent;
        if(info)weatherClone.querySelector('.pw-info').textContent=info.textContent;

        weatherClone.classList.toggle('alert-yellow',weather.classList.contains('alert-yellow'));
        weatherClone.classList.toggle('alert-orange',weather.classList.contains('alert-orange'));
        weatherClone.classList.toggle('alert-red',weather.classList.contains('alert-red'));
      };

      new MutationObserver(syncWeather).observe(weather,{
        subtree:true,
        childList:true,
        characterData:true,
        attributes:true
      });
      syncWeather();
    }

    function mins(t){
      if(!t)return 0;
      const p=String(t).trim().replace('.',':').split(':');
      return (+p[0]||0)*60+(+p[1]||0);
    }

    function currentSchedule(){
      try{
        const days=JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}');
        let day=w.localStorage.getItem('upper_schedule_activeday');
        if(!day||!days[day])day=Object.keys(days)[0];
        return Array.isArray(days[day])?days[day]:[];
      }catch(e){
        return [];
      }
    }

    function updateNextTurnInfo(){
      if(!widget||!nextTurnBox)return;

      const selectedGroup=w.localStorage.getItem('upper_schedule_mygroup')||'A';
      const now=new Date();
      const nowMins=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;

      const turns=currentSchedule()
        .filter(function(item){
          if(!item||item.type!=='turn'||!item.start)return false;
          if(selectedGroup==='ALL')return true;
          return item.group===selectedGroup||item.group==='A+B+C+D';
        })
        .sort(function(a,b){return mins(a.start)-mins(b.start);});

      const next=turns.find(function(item){return mins(item.start)>nowMins;});

      widget.classList.remove('preview-warning-10','preview-warning-5');

      if(!next){
        nextTurnBox.innerHTML='<div class="pnt-label">NÄCHSTER TURN</div><div class="pnt-time">--:--</div>';
        return;
      }

      const diff=mins(next.start)-nowMins;
      const groupLabel=selectedGroup==='ALL' ? (next.group||'') : 'GR. '+selectedGroup;

      nextTurnBox.innerHTML=
        '<div class="pnt-label">NÄCHSTER TURN</div>'+ 
        '<div class="pnt-group">'+groupLabel+'</div>'+ 
        '<div class="pnt-time">'+next.start+'</div>';

      /* 5 Minuten hat Vorrang vor 10 Minuten. */
      if(diff>0&&diff<=5){
        widget.classList.add('preview-warning-5');
      }else if(diff>5&&diff<=10){
        widget.classList.add('preview-warning-10');
      }
    }

    updateNextTurnInfo();
    setInterval(updateNextTurnInfo,500);
  });
})();