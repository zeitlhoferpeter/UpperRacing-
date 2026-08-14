(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const d=frame.contentDocument;
    if(!d)return;

    const style=d.createElement('style');
    style.textContent=`
      .app-header{padding:8px!important;background:#090909!important}
      .header-brand-row{min-height:40px!important;margin-bottom:7px!important}
      .header-brand-logo{width:42px!important;height:42px!important}
      .header-select-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important}
      .header-control-card{min-height:58px!important;padding:7px 8px!important;border-radius:8px!important}

      /* Das originale Wetter bleibt funktional, wird aber unten als kompakte Kopie dargestellt. */
      .header-weather-card{display:none!important}

      .header-status-grid{
        display:grid!important;
        grid-template-columns:minmax(0,1fr) 112px!important;
        gap:6px!important;
        margin-top:6px!important;
      }

      /* WICHTIG: Die Turn-Anzeige selbst kommt 1:1 aus schedule.js.
         Wir ändern nur Position/Größe, nicht Inhalt oder Timer-Logik. */
      #headerScheduleWidget{
        grid-column:1 / -1!important;
        grid-row:1!important;
        width:100%!important;
        max-width:none!important;
        min-height:70px!important;
        padding:9px 10px!important;
        margin:0!important;
        display:flex!important;
        align-items:center!important;
        align-content:center!important;
        flex-wrap:wrap!important;
        gap:5px 8px!important;
        overflow:hidden!important;
      }

      #headerScheduleWidget::before{
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
        #headerScheduleWidget{min-height:68px!important;padding:8px!important}
        #headerScheduleWidget .turn-next-badge{font-size:.9rem!important}
        .preview-weather-card{padding:6px!important}
        .header-control-icon{width:22px!important;flex-basis:22px!important}
      }
    `;
    d.head.appendChild(style);

    const status=d.querySelector('.header-status-grid');
    const weather=d.getElementById('weather-header-widget');

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
  });
})();