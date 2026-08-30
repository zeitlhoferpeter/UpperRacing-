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
    if(!w||!d||d.__upperWeatherFutureAlertMain)return;
    d.__upperWeatherFutureAlertMain=true;

    let futureMax=null;
    let applying=false;

    function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
    function parseLocal(s){
      const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if(!m)return NaN;
      return Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5]);
    }

    function selectedTrackLocation(){
      const sel=d.getElementById('trackSelect');
      const key=sel?String(sel.value||'pannoniaring'):'pannoniaring';
      return TRACKS[key]||TRACKS.pannoniaring;
    }

    function resolveLocation(){
      return new Promise(function(resolve){
        const fallback=selectedTrackLocation();
        let gps=false;
        try{gps=w.localStorage.getItem('trackday_weather_gps')==='true'}catch(_){ }
        if(!gps||!w.navigator.geolocation){resolve(fallback);return}
        w.navigator.geolocation.getCurrentPosition(function(pos){
          resolve({lat:pos.coords.latitude,lon:pos.coords.longitude});
        },function(){resolve(fallback)},{enableHighAccuracy:true,timeout:5000,maximumAge:60000});
      });
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
          const next='Jetzt: ☔ '+current+'% | Ab jetzt: '+Math.round(futureMax)+'%';
          if(info.textContent!==next)info.textContent=next;
        }
      }finally{applying=false}
    }

    async function refresh(){
      try{
        const loc=await resolveLocation();
        const params=new URLSearchParams({
          latitude:String(loc.lat),longitude:String(loc.lon),timezone:'auto',forecast_days:'1',
          current:'temperature_2m,precipitation,weather_code',
          hourly:'precipitation_probability'
        });
        const res=await fetch('https://api.open-meteo.com/v1/forecast?'+params.toString(),{cache:'no-store'});
        if(!res.ok)throw new Error('HTTP '+res.status);
        const data=await res.json();
        const times=(data.hourly&&data.hourly.time)||[];
        const probs=(data.hourly&&data.hourly.precipitation_probability)||[];
        const currentTime=data.current&&data.current.time;
        const currentMs=parseLocal(currentTime);
        const currentDate=String(currentTime||'').slice(0,10);
        let max=0,found=false;

        for(let i=0;i<times.length;i++){
          const t=String(times[i]||'');
          if(!t.startsWith(currentDate))continue;
          const hour=Number(t.slice(11,13));
          if(hour<5||hour>18)continue;
          const ts=parseLocal(t);
          if(Number.isFinite(currentMs)&&Number.isFinite(ts)&&ts<currentMs)continue;
          max=Math.max(max,num(probs[i]));
          found=true;
        }

        futureMax=found?max:0;
        applyFutureState();
      }catch(err){
        console.warn('[Weather Future Alert Main]',err);
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
      const infoObserver=new MutationObserver(function(){
        if(!applying&&futureMax!==null)setTimeout(applyFutureState,0);
      });
      infoObserver.observe(info,{childList:true,characterData:true,subtree:true});
    }

    const track=d.getElementById('trackSelect');
    if(track)track.addEventListener('change',function(){setTimeout(refresh,150)});
    d.addEventListener('change',function(e){if(e.target&&e.target.id==='weather-gps-toggle')setTimeout(refresh,150)});

    setTimeout(refresh,1300);
    setInterval(refresh,REFRESH_MS);
  });
})();
