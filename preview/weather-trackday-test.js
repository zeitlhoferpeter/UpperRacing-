(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const TRACKS={
      pannoniaring:{lat:47.30393,lon:17.04803,name:'Pannonia'},
      slovakia:{lat:48.05511,lon:17.56695,name:'Slovakia'},
      brünn:{lat:49.2030433,lon:16.4454486,name:'Brünn'},
      most:{lat:50.51867,lon:13.60451,name:'Most'},
      grobnik:{lat:45.38273,lon:14.50847,name:'Grobnik'}
    };
    const REFRESH_MS=5*60*1000;
    let timer=null,lastLat=null,lastLon=null;

    const style=d.createElement('style');
    style.id='weatherTrackdayTestStyles';
    style.textContent=`
      .ur-trackday-weather{margin-top:10px;background:#151515;border:1px solid #3a3a3a;border-radius:10px;padding:10px;color:#fff}
      .ur-trackday-weather .urw-title{font-size:.62rem;font-weight:950;letter-spacing:.7px;color:#9e9e9e;margin-bottom:7px}
      .ur-trackday-weather .urw-line{font-size:.78rem;font-weight:850;line-height:1.35;margin:3px 0}
      .ur-trackday-weather .urw-line strong{color:#fff}
      .ur-trackday-weather .urw-small{font-size:.6rem;color:#8e8e8e;margin-top:6px;line-height:1.3}
      .ur-trackday-weather .urw-radar{display:block;margin-top:9px;width:100%;box-sizing:border-box;text-align:center;text-decoration:none;background:#262626;color:#ffd400;border:1px solid #5b5200;border-radius:7px;padding:9px 8px;font-size:.72rem;font-weight:950}
      .ur-trackday-weather.urw-yellow{border-color:#8c7700;background:linear-gradient(145deg,#211f08,#15150f)}
      .ur-trackday-weather.urw-orange{border-color:#b86700;background:linear-gradient(145deg,#2b1908,#17120e)}
      .ur-trackday-weather.urw-red{border-color:#b52f21;background:linear-gradient(145deg,#2e0e0b,#17100f);box-shadow:0 0 14px rgba(255,55,35,.16)}
    `;
    d.head.appendChild(style);

    function getFallbackLocation(){
      const sel=d.getElementById('trackSelect');
      const key=sel?String(sel.value||'pannoniaring'):'pannoniaring';
      return TRACKS[key]||TRACKS.pannoniaring;
    }
    function gpsEnabled(){return w.localStorage.getItem('trackday_weather_gps')==='true'}
    function resolveLocation(){
      return new Promise(function(resolve){
        const fallback=getFallbackLocation();
        if(!gpsEnabled()||!w.navigator.geolocation){resolve(fallback);return}
        w.navigator.geolocation.getCurrentPosition(function(pos){
          resolve({lat:pos.coords.latitude,lon:pos.coords.longitude,name:'Live-Standort'});
        },function(){resolve(fallback)},{enableHighAccuracy:true,timeout:5000,maximumAge:60000});
      });
    }
    function ensureBox(){
      let box=d.getElementById('urTrackdayWeather');
      if(box)return box;
      const modal=d.getElementById('weather-modal');
      if(modal){
        const body=modal.querySelector('.weather-modal-body');
        if(body){box=d.createElement('div');box.id='urTrackdayWeather';box.className='ur-trackday-weather';body.insertBefore(box,body.firstChild);return box}
      }
      const card=d.querySelector('.preview-weather-card');
      if(card&&card.parentElement){box=d.createElement('div');box.id='urTrackdayWeather';box.className='ur-trackday-weather';card.parentElement.insertBefore(box,card.nextSibling);return box}
      return null;
    }
    function hhmm(s){return String(s||'').slice(11,16)}
    function todayDate(){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')}
    function number(v,def){const n=Number(v);return Number.isFinite(n)?n:def}

    function summarizeDay(data){
      const h=data.hourly||{},times=h.time||[],temps=h.temperature_2m||[],probs=h.precipitation_probability||[],rain=h.precipitation||[];
      const date=todayDate();let tmin=Infinity,tmax=-Infinity,maxProb=0,wet=[];
      for(let i=0;i<times.length;i++){
        const t=String(times[i]);if(!t.startsWith(date))continue;
        const hour=Number(t.slice(11,13));if(hour<7||hour>18)continue;
        const temp=number(temps[i],NaN);if(Number.isFinite(temp)){tmin=Math.min(tmin,temp);tmax=Math.max(tmax,temp)}
        const p=number(probs[i],0),mm=number(rain[i],0);maxProb=Math.max(maxProb,p);
        if(p>=40||mm>0.1)wet.push({hour,p,mm});
      }
      let critical='kein auffälliges Regenfenster';
      if(wet.length){
        let bestStart=wet[0].hour,bestEnd=wet[0].hour,maxScore=wet[0].p+wet[0].mm*25;
        let curStart=wet[0].hour,prev=wet[0].hour;
        for(let i=1;i<wet.length;i++){
          const x=wet[i],score=x.p+x.mm*25;if(score>maxScore){maxScore=score;bestStart=curStart;bestEnd=x.hour}
          if(x.hour===prev+1){bestEnd=x.hour}else{curStart=x.hour;bestStart=x.hour;bestEnd=x.hour}
          prev=x.hour;
        }
        critical=String(bestStart).padStart(2,'0')+'–'+String(Math.min(19,bestEnd+1)).padStart(2,'0')+' Uhr';
      }
      return{tmin:Number.isFinite(tmin)?Math.round(tmin):null,tmax:Number.isFinite(tmax)?Math.round(tmax):null,maxProb:Math.round(maxProb),critical};
    }

    function summarize60(data){
      const m=data.minutely_15||{},times=m.time||[],prec=m.precipitation||[],prob=m.precipitation_probability||[],codes=m.weather_code||[];
      const now=Date.now();let start=-1;
      for(let i=0;i<times.length;i++){const ts=new Date(times[i]).getTime();if(Number.isFinite(ts)&&ts>=now-8*60*1000){start=i;break}}
      if(start<0)start=0;
      let maxProb=0,total=0,maxCode=0,firstWet=null;
      const rows=[];
      for(let i=start;i<times.length&&rows.length<5;i++){
        const ts=new Date(times[i]).getTime();if(!Number.isFinite(ts)||ts>now+65*60*1000)continue;
        const mm=number(prec[i],0),p=number(prob[i],0),c=number(codes[i],0);
        rows.push({time:times[i],mm,p,c});maxProb=Math.max(maxProb,p);total+=mm;maxCode=Math.max(maxCode,c);
        if(firstWet===null&&(mm>=0.1||p>=55||c>=61))firstWet=ts;
      }
      const current=data.current||{};const currentMm=number(current.precipitation,0);const currentCode=number(current.weather_code,0);
      const rainingNow=currentMm>0.05||currentCode>=51;
      const thunder=currentCode>=95||maxCode>=95;
      let level='ok',icon='✅',text='Nächste 60 Min: trocken';
      if(thunder){level='red';icon='🔴';text=rainingNow?'Gewitter/Regen aktuell':'Gewitter in den nächsten 60 Min möglich'}
      else if(rainingNow){level='red';icon='🔴';text='Regen aktuell'}
      else if(firstWet!==null){
        const minsAway=Math.max(0,Math.round((firstWet-now)/60000));
        if(minsAway<=15||total>=1.5){level='red';icon='🔴';text='Regen in <15 Min wahrscheinlich'}
        else if(minsAway<=30||total>=0.7){level='orange';icon='🟠';text='Regen in ca. 15–30 Min wahrscheinlich'}
        else{level='yellow';icon='🟡';text='Regen in ca. 30–60 Min möglich'}
      }else if(maxProb>=45){level='yellow';icon='🟡';text='Schauer in der nächsten Stunde möglich'}
      return{level,icon,text,maxProb:Math.round(maxProb),total:Math.round(total*10)/10,currentMm:Math.round(currentMm*10)/10};
    }

    function render(data,loc){
      const box=ensureBox();if(!box)return;
      const day=summarizeDay(data),soon=summarize60(data);
      box.classList.remove('urw-yellow','urw-orange','urw-red');
      if(soon.level==='yellow')box.classList.add('urw-yellow');
      if(soon.level==='orange')box.classList.add('urw-orange');
      if(soon.level==='red')box.classList.add('urw-red');
      const temp=day.tmin===null?'–':day.tmin+'–'+day.tmax+' °C';
      const radar='https://www.rainviewer.com/map.html?loc='+encodeURIComponent(loc.lat+','+loc.lon+',9');
      box.innerHTML='<div class="urw-title">TRACKDAY-WETTER · 07–18 UHR</div>'+
        '<div class="urw-line">🌡️ <strong>'+temp+'</strong> · 🌧️ Tagesrisiko <strong>'+day.maxProb+' %</strong></div>'+
        '<div class="urw-line">🕒 Kritisches Fenster: <strong>'+day.critical+'</strong></div>'+
        '<div class="urw-line">'+soon.icon+' <strong>'+soon.text+'</strong></div>'+
        '<div class="urw-small">60-Min-Auswertung: max. '+soon.maxProb+' % · prognostiziert ca. '+soon.total+' mm · Standort: '+loc.name+'</div>'+
        '<a class="urw-radar" href="'+radar+'" target="_blank" rel="noopener">📡 Regenradar öffnen ↗</a>';
    }

    async function refresh(){
      try{
        const loc=await resolveLocation();lastLat=loc.lat;lastLon=loc.lon;
        const params=new URLSearchParams({
          latitude:String(loc.lat),longitude:String(loc.lon),timezone:'auto',forecast_days:'2',
          current:'temperature_2m,precipitation,rain,showers,weather_code',
          hourly:'temperature_2m,precipitation_probability,precipitation,weather_code',
          minutely_15:'precipitation,precipitation_probability,weather_code',
          forecast_minutely_15:'8',past_minutely_15:'1'
        });
        const res=await fetch('https://api.open-meteo.com/v1/forecast?'+params.toString(),{cache:'no-store'});
        if(!res.ok)throw new Error('HTTP '+res.status);
        const data=await res.json();render(data,loc);
      }catch(err){
        console.warn('[Weather Trackday Test]',err);
        const box=ensureBox();if(box)box.innerHTML='<div class="urw-title">TRACKDAY-WETTER</div><div class="urw-line">⚠️ Wetterdaten konnten nicht aktualisiert werden.</div>';
      }
    }

    const originalOpen=w.openWeatherModal;
    if(typeof originalOpen==='function'){
      w.openWeatherModal=function(){const r=originalOpen.apply(this,arguments);setTimeout(refresh,50);return r};
    }
    const track=d.getElementById('trackSelect');if(track)track.addEventListener('change',function(){setTimeout(refresh,100)});
    d.addEventListener('change',function(e){if(e.target&&e.target.id==='weather-gps-toggle')setTimeout(refresh,100)});

    setTimeout(refresh,900);
    timer=setInterval(refresh,REFRESH_MS);
  });
})();