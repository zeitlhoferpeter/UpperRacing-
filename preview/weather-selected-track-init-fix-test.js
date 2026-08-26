(function(){
  'use strict';

  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  const TRACKS={
    pannoniaring:{lat:47.30393,lon:17.04803},
    slovakia:{lat:48.05511,lon:17.56695},
    brünn:{lat:49.2030433,lon:16.4454486},
    most:{lat:50.51867,lon:13.60451},
    grobnik:{lat:45.38273,lon:14.50847}
  };
  const REFRESH_MS=5*60*1000;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d||d.__upperWeatherTrackInitFixTest)return;
    d.__upperWeatherTrackInitFixTest=true;

    const select=d.getElementById('trackSelect');
    if(!select)return;

    const saved=w.localStorage.getItem('upper_selected_track');
    const savedIsValid=!!(saved&&[...select.options].some(function(o){return o.value===saved}));

    if(savedIsValid){
      // Track persistence has already restored the saved track at this point.
      // Trigger one normal change cycle so the weather module refreshes from
      // the final selected track instead of an earlier default value.
      setTimeout(function(){
        const live=d.getElementById('trackSelect');
        if(!live)return;
        if(live.value!==saved)live.value=saved;
        live.dispatchEvent(new Event('change',{bubbles:true}));
      },1200);
    }

    // Test-only: Wetter-Warnfarbe bewertet nur noch die Zukunft ab jetzt.
    // Vergangene Regenstunden des heutigen Tages dürfen den Header nicht mehr färben.
    let futureMax=null;
    let applying=false;

    function parseLocal(value){
      const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if(!m)return NaN;
      return Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]));
    }

    function trackLocation(){
      const live=d.getElementById('trackSelect');
      const key=live?String(live.value||'pannoniaring'):'pannoniaring';
      return TRACKS[key]||TRACKS.pannoniaring;
    }

    function applyFutureState(){
      if(futureMax===null||applying)return;
      const widget=d.getElementById('weather-header-widget');
      if(!widget)return;
      applying=true;
      try{
        widget.classList.remove('alert-yellow','alert-orange','alert-red');
        if(futureMax>90)widget.classList.add('alert-red');
        else if(futureMax>=80)widget.classList.add('alert-orange');
        else if(futureMax>=50)widget.classList.add('alert-yellow');

        const info=d.getElementById('weather-info-text');
        if(info){
          const currentMatch=String(info.textContent||'').match(/Jetzt:\s*☔\s*(\d+)%/);
          const current=currentMatch?currentMatch[1]:'–';
          const text='Jetzt: ☔ '+current+'% | Ab jetzt: '+Math.round(futureMax)+'%';
          if(info.textContent!==text)info.textContent=text;
        }
      }finally{
        applying=false;
      }
    }

    async function refreshFutureAlert(){
      try{
        const loc=trackLocation();
        const params=new URLSearchParams({
          latitude:String(loc.lat),longitude:String(loc.lon),timezone:'auto',forecast_days:'1',
          current:'temperature_2m,precipitation,weather_code',
          hourly:'precipitation_probability'
        });
        const res=await fetch('https://api.open-meteo.com/v1/forecast?'+params.toString(),{cache:'no-store'});
        if(!res.ok)throw new Error('HTTP '+res.status);
        const data=await res.json();
        const currentTime=data.current&&data.current.time;
        const currentMs=parseLocal(currentTime);
        const currentDate=String(currentTime||'').slice(0,10);
        const times=(data.hourly&&data.hourly.time)||[];
        const probs=(data.hourly&&data.hourly.precipitation_probability)||[];
        let max=0,found=false;

        for(let i=0;i<times.length;i++){
          const time=String(times[i]||'');
          if(!time.startsWith(currentDate))continue;
          const hour=Number(time.slice(11,13));
          if(hour<5||hour>18)continue;
          const ts=parseLocal(time);
          if(Number.isFinite(currentMs)&&Number.isFinite(ts)&&ts<currentMs)continue;
          const p=Number(probs[i]);
          if(!Number.isFinite(p))continue;
          found=true;
          max=Math.max(max,p);
        }

        futureMax=found?max:0;
        applyFutureState();
      }catch(err){
        console.warn('[Weather Future Alert Test]',err);
      }
    }

    const widget=d.getElementById('weather-header-widget');
    if(widget){
      const observer=new MutationObserver(function(){
        if(!applying&&futureMax!==null)setTimeout(applyFutureState,0);
      });
      observer.observe(widget,{attributes:true,attributeFilter:['class']});
    }

    const info=d.getElementById('weather-info-text');
    if(info){
      const observer=new MutationObserver(function(){
        if(!applying&&futureMax!==null)setTimeout(applyFutureState,0);
      });
      observer.observe(info,{childList:true,characterData:true,subtree:true});
    }

    select.addEventListener('change',function(){setTimeout(refreshFutureAlert,180)});
    setTimeout(refreshFutureAlert,1400);
    setInterval(refreshFutureAlert,REFRESH_MS);
  });
})();
