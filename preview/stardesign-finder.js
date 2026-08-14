(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow;
    const d=frame.contentDocument;
    if(!w||!d)return;

    const TRACK_ALIASES={pannoniaring:['pannoniaring','pannonia'],slovakia:['slovakiaring','slovakia'],'brünn':['brünn','brunn','brno','masaryk'],most:['most'],grobnik:['grobnik','rijeka']};
    function selectedTrackKey(){const el=d.getElementById('trackSelect');return el?String(el.value||'').toLowerCase():''}
    function parseRange(text){const m=String(text||'').match(/(\d{1,2})\.(\d{1,2})\.\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/);if(!m)return null;return{start:new Date(+m[5],+m[2]-1,+m[1]),end:new Date(+m[5],+m[4]-1,+m[3])}}
    function targetDate(){const raw=w.localStorage.getItem('upper_preview_schedule_date');if(raw){const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return new Date(+m[1],+m[2]-1,+m[3])}const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate())}
    function dateInside(range){if(!range)return false;const n=targetDate().getTime();return n>=range.start.getTime()&&n<=range.end.getTime()}
    function fmt(dt){return String(dt.getDate()).padStart(2,'0')+'.'+String(dt.getMonth()+1).padStart(2,'0')+'.'+dt.getFullYear()}

    function ensureStyles(){
      if(d.getElementById('stardesignFinderStyles'))return;
      const s=d.createElement('style');s.id='stardesignFinderStyles';s.textContent=`
        .stardesign-live-box{background:#151515;border:1px solid #3a3a3a;border-radius:8px;padding:10px;margin:0 0 10px;color:#fff;font-size:.76rem}
        .stardesign-live-title{font-weight:900;color:#ffd400}.stardesign-live-status{color:#aaa;margin-top:4px;line-height:1.4}
        .stardesign-live-btn{margin-top:8px;width:100%;background:#ffd400;color:#080808;border:0;border-radius:5px;padding:10px 8px;font-size:.8rem;font-weight:900;cursor:pointer}
        .stardesign-live-btn:disabled{opacity:.5;cursor:default}.stardesign-live-link{display:block;margin-top:7px;color:#ddd;text-decoration:underline;font-size:.7rem}`;
      d.head.appendChild(s);
    }
    function findImportSection(){return d.getElementById('pdfImportSection')}
    function ensureBox(){
      ensureStyles();const section=findImportSection();if(!section)return null;
      const old=d.getElementById('stardesignAutoSchedule');if(old)old.remove();
      let box=d.getElementById('stardesignLiveSchedule');if(box)return box;
      box=d.createElement('div');box.id='stardesignLiveSchedule';box.className='stardesign-live-box';
      box.innerHTML='<div class="stardesign-live-title">🏁 Stardesign Zeitplan</div><div class="stardesign-live-status">Prüfe passendes Event …</div>';
      section.parentNode.insertBefore(box,section);return box;
    }
    function absUrl(href){try{return new URL(href,'https://www.stardesignracing.com/events').toString()}catch(e){return''}}
    function findMatchingEvent(doc){
      const key=selectedTrackKey(),aliases=TRACK_ALIASES[key]||[key];
      const links=[...doc.querySelectorAll('a')].filter(a=>/zeitplan\s*herunterladen/i.test(a.textContent||''));
      for(const link of links){let node=link;for(let depth=0;depth<8&&node;depth++,node=node.parentElement){const txt=(node.textContent||'').replace(/\s+/g,' ').trim(),lower=txt.toLowerCase(),range=parseRange(txt);if(!range||!dateInside(range)||!aliases.some(a=>lower.includes(a)))continue;const heading=[...node.querySelectorAll('h2,h3,h4')].map(h=>(h.textContent||'').trim()).find(t=>aliases.some(a=>t.toLowerCase().includes(a)))||'Stardesign Racing Event';return{title:heading,range,pdf:absUrl(link.getAttribute('href')||link.href||'')}}}return null;
    }
    async function loadPdfThroughExistingImport(pdfUrl,btn){
      btn.disabled=true;btn.textContent='Lade Zeitplan …';
      try{const res=await fetch(pdfUrl,{cache:'no-store'});if(!res.ok)throw new Error('PDF HTTP '+res.status);const blob=await res.blob(),file=new File([blob],'Stardesign-Zeitplan.pdf',{type:'application/pdf'}),input=d.getElementById('schedulePdfFile');if(!input)throw new Error('PDF-Importfeld nicht gefunden');const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));btn.textContent='Zeitplan wird verarbeitet …'}
      catch(err){console.warn('[Stardesign Finder] PDF Import:',err);btn.disabled=false;btn.textContent='Zeitplan laden erneut versuchen';w.alert('Stardesign-Zeitplan konnte nicht automatisch geladen werden: '+(err.message||err))}
    }

    let running=false,lastTrack='',lastDate='';
    async function runFinder(force){
      const section=findImportSection();if(!section)return;const track=selectedTrackKey(),dateKey=fmt(targetDate());if(running)return;if(!force&&d.getElementById('stardesignLiveSchedule')&&track===lastTrack&&dateKey===lastDate)return;
      lastTrack=track;lastDate=dateKey;running=true;const box=ensureBox();if(!box){running=false;return}const status=box.querySelector('.stardesign-live-status'),trackName=d.getElementById('trackSelect')?.selectedOptions?.[0]?.textContent||track;status.textContent='Prüfe '+trackName+' für '+dateKey+' …';
      try{const res=await fetch('https://www.stardesignracing.com/events',{cache:'no-store'});if(!res.ok)throw new Error('Eventseite HTTP '+res.status);const html=await res.text(),doc=new DOMParser().parseFromString(html,'text/html'),event=findMatchingEvent(doc);if(!event){status.textContent='Für '+dateKey+' wurde auf der Stardesign-Seite kein passendes Event für '+trackName+' gefunden.';running=false;return}status.innerHTML='<strong>'+event.title+'</strong><br>'+fmt(event.range.start)+' – '+fmt(event.range.end)+'<br>Zeitplan gefunden.';const btn=d.createElement('button');btn.className='stardesign-live-btn';btn.textContent='Zeitplan automatisch laden';btn.onclick=function(){loadPdfThroughExistingImport(event.pdf,btn)};box.appendChild(btn);const a=d.createElement('a');a.className='stardesign-live-link';a.href=event.pdf;a.target='_blank';a.rel='noopener';a.textContent='Zeitplan bei Stardesign öffnen';box.appendChild(a)}
      catch(err){console.warn('[Stardesign Finder] Eventprüfung:',err);status.textContent='Automatische Stardesign-Prüfung fehlgeschlagen: '+(err.message||err)}running=false;
    }

    w.__runStardesignFinder=function(){const old=d.getElementById('stardesignLiveSchedule');if(old)old.remove();setTimeout(function(){runFinder(true)},50)};

    const observer=new MutationObserver(function(){if(findImportSection()&&!d.getElementById('stardesignLiveSchedule'))runFinder(true)});observer.observe(d.body,{childList:true,subtree:true});
    const track=d.getElementById('trackSelect');if(track)track.addEventListener('change',function(){w.__runStardesignFinder()});

    setTimeout(function(){
      if(typeof w.clearSchedule==='function'&&!w.clearSchedule.__stardesignWrapped){
        const original=w.clearSchedule;
        const wrapped=function(){const result=original.apply(this,arguments);setTimeout(function(){w.__runStardesignFinder()},120);return result};
        wrapped.__stardesignWrapped=true;w.clearSchedule=wrapped;
      }
    },300);

    setInterval(function(){if(findImportSection()&&!d.getElementById('stardesignLiveSchedule'))runFinder(true)},700);
    setTimeout(function(){runFinder(true)},500);
  });
})();