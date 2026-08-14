(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const DAY_NAMES=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    const DAY_RX=/(Montag|Monday|Dienstag|Tuesday|Mittwoch|Wednesday|Donnerstag|Thursday|Freitag|Friday|Samstag|Saturday|Sonntag|Sunday)/i;
    const DAY_MAP={monday:'Montag',montag:'Montag',tuesday:'Dienstag',dienstag:'Dienstag',wednesday:'Mittwoch',mittwoch:'Mittwoch',thursday:'Donnerstag',donnerstag:'Donnerstag',friday:'Freitag',freitag:'Freitag',saturday:'Samstag',samstag:'Samstag',sunday:'Sonntag',sonntag:'Sonntag'};

    function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
    function normTime(t){const m=String(t||'').trim().replace('.',':').match(/^(\d{1,2}):(\d{2})$/);if(!m)return'';const h=+m[1],mi=+m[2];if(h>23||mi>59)return'';return String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0')}
    function tm(t){const p=normTime(t).split(':');return p.length===2?(+p[0])*60+(+p[1]):0}
    function weekdayFromText(s){const m=clean(s).match(DAY_RX);return m?DAY_MAP[m[1].toLowerCase()]||'':''}
    function nextWeekday(name){const i=DAY_NAMES.indexOf(name);return i<0?'':DAY_NAMES[(i+1)%7]}

    function lapsSuffix(title){const m=String(title||'').match(/(\d+)\s*(?:LAPS?|RUNDEN)/i);return m?' – '+m[1]+' Laps':''}
    function classify(raw){
      const title=clean(raw);if(!title)return null;const upper=title.toUpperCase();
      if(/A\s*\+\s*B\s*\+\s*C\s*\+\s*D/i.test(title)||/ALLE GRUPPEN/i.test(title))return{title:'Freies Fahren – alle Gruppen',group:'A+B+C+D',type:'turn'};
      if(/\bGRUPPE\s*A\b|\bGR\.\s*A\b|GROUP\s*A\b/i.test(title))return{title:'Freies Fahren Gruppe A',group:'A',type:'turn'};
      if(/\bGRUPPE\s*B\b|\bGR\.\s*B\b|GROUP\s*B\b/i.test(title))return{title:'Freies Fahren Gruppe B',group:'B',type:'turn'};
      if(/\bGRUPPE\s*C\b|\bGR\.\s*C\b|GROUP\s*C\b/i.test(title))return{title:'Freies Fahren Gruppe C',group:'C',type:'turn'};
      if(/\bGRUPPE\s*D\b|\bGR\.\s*D\b|GROUP\s*D\b/i.test(title))return{title:'Freies Fahren Gruppe D',group:'D',type:'turn'};
      if(/REGROUPING|NEUE AUSFAHRTSGENEHMIGUNG|NEW TICKET|NEW TIKET/i.test(title))return{title:'REGROUPING – neue Ausfahrtsgenehmigung holen',group:'REGROUPING',type:'orga'};
      if(/MITTAGSPAUSE|LUNCH BREAK/i.test(title))return{title:'Mittagspause',group:'Pause',type:'orga'};
      if(upper.includes('FAHRERBESPRECHUNG')){const race=/RENNTEILNEHMER|RENNFAHRER|FÜR DIE RENNEN|FUER DIE RENNEN|RENNTEILNAHME|RACE/i.test(title);return{title:race?'Fahrerbesprechung – Rennteilnehmer':'Fahrerbesprechung',group:'Briefing',type:'orga'}}
      if(/\bBRIEFING\b/i.test(title))return null;
      if(/ANMELDUNG|REGISTRATION/i.test(title))return{title:'Anmeldung',group:'Anmeldung',type:'orga'};
      if(/SIEGEREHRUNG|PRICEGIVING/i.test(title))return{title:'Siegerehrung',group:'Siegerehrung',type:'orga'};
      if(/\bCLASSIC\s+RACE\b/i.test(title))return{title:'Classic Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bROOKIE\s+RACE\b/i.test(title))return{title:'Rookie Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bSTERNCHEN\b/i.test(title)&&/LAPS?|RUNDEN/i.test(title))return{title:'Sternchen Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bB[- ]?RACE\b/i.test(title))return{title:'B-Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bSBK(?:1000)?\b/i.test(title)&&(/RACE|LAPS?|RUNDEN|GP START|GP-START/i.test(title)))return{title:'SBK Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bSSP(?:750)?\b/i.test(title)&&(/RACE|LAPS?|RUNDEN|GP START|GP-START/i.test(title)))return{title:'SSP Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bRACE\b|\bRENNEN\b/i.test(title))return{title:title.split(';')[0].trim(),group:'Rennen',type:'race'};
      return null;
    }

    function splitLine(line){
      let s=clean(line);if(!s)return[];const out=[];
      if(/\bnext\s*(?:Race)?\b/i.test(s)){
        const first=s.search(/\bnext\s*(?:Race)?\b/i);
        if(first>0)out.push.apply(out,splitLine(s.slice(0,first)));
        s=s.slice(Math.max(0,first));
        s.split(/(?=\bnext\s*(?:Race)?\b)/i).filter(Boolean).forEach(function(p){
          const mt=p.match(/^next\s*-\s*(\d{1,2}[:.]\d{2})\s+(.+)$/i);
          if(mt)out.push({kind:'timed',start:normTime(mt[1]),end:'',rawTitle:mt[2]});
          else out.push({kind:'nextRace',rawTitle:clean(p.replace(/^next\s*(?:Race)?\s*/i,''))});
        });return out;
      }
      let m=s.match(/^(?:(?:ab|ca\.?|circa)\s+)?(\d{1,2}[:.]\d{2})\s*(?:-|–|—|bis)\s*(\d{1,2}[:.]\d{2})\s*(.*)$/i);
      if(m)return[{kind:'timed',start:normTime(m[1]),end:normTime(m[2]),rawTitle:clean(m[3])}];
      m=s.match(/^(?:(?:ab|ca\.?|circa)\s+)?(\d{1,2}[:.]\d{2})\s+(.+)$/i);
      if(m)return[{kind:'timed',start:normTime(m[1]),end:'',rawTitle:clean(m[2])}];
      if(/RENNTAG\s*:?\s*\d+/i.test(s))return[{kind:'dayMarker',rawTitle:s}];
      if(/REGROUPING|MITTAGSPAUSE|LUNCH BREAK|FAHRERBESPRECHUNG|SIEGEREHRUNG|PRICEGIVING|ANMELDUNG|REGISTRATION/i.test(s))return[{kind:'untimedOrga',rawTitle:s}];
      return[];
    }

    function linesFromItems(items){
      const rows=[];
      items.forEach(function(it){const text=clean(it.str);if(!text)return;const x=it.transform?.[4]||0,y=it.transform?.[5]||0;let r=rows.find(q=>Math.abs(q.y-y)<=5);if(!r){r={y,items:[]};rows.push(r)}r.items.push({x,text})});
      rows.sort((a,b)=>b.y-a.y);
      return rows.map(function(r){r.items.sort((a,b)=>a.x-b.x);return clean(r.items.map(i=>i.text).join(' '))}).filter(Boolean);
    }

    function parseLines(lines){const rows=[];(lines||[]).forEach(line=>splitLine(line).forEach(r=>rows.push(r)));return rows}
    function turnCount(rows){return rows.reduce((n,r)=>n+(r.kind==='timed'&&classify(r.rawTitle)?.type==='turn'?1:0),0)}

    function buildItems(rows){
      const items=[];let lastTimed='',lastRace='',raceSeq=0;
      function nextTimed(i){for(let j=i+1;j<rows.length;j++)if(rows[j].kind==='timed'&&rows[j].start&&tm(rows[j].start)>tm(rows[i].start||'00:00'))return rows[j].start;return''}
      rows.forEach(function(r,i){
        if(r.kind==='dayMarker')return;
        if(r.kind==='untimedOrga'){const c=classify(r.rawTitle);if(c&&lastTimed)items.push({start:lastTimed,end:'',title:c.title,group:c.group,type:c.type});return}
        if(r.kind==='nextRace'){const c=classify(r.rawTitle);if(c&&c.type==='race'&&lastRace){raceSeq++;items.push({start:lastRace,end:'',title:c.title,group:'Rennen',type:'race',sequence:raceSeq})}return}
        if(r.kind!=='timed'||!r.start)return;lastTimed=r.start;let c=classify(r.rawTitle);
        if(!c&&!clean(r.rawTitle)&&r.end&&tm(r.start)>=11*60&&tm(r.start)<=14*60)c={title:'Mittagspause',group:'Pause',type:'orga'};
        if(!c)return;let end=r.end||'';
        if(c.type==='turn'&&!end){const n=nextTimed(i);if(n&&tm(n)>tm(r.start)&&tm(n)-tm(r.start)<=40)end=n}
        if(c.type==='race'){lastRace=r.start;raceSeq=0;items.push({start:r.start,end,title:c.title,group:'Rennen',type:'race',sequence:0})}
        else items.push({start:r.start,end,title:c.title,group:c.group,type:c.type});
      });
      const map=new Map();items.forEach(it=>{const k=[it.start,it.end,it.title,it.group,it.sequence||0].join('|');if(!map.has(k))map.set(k,it)});
      return [...map.values()].sort((a,b)=>tm(a.start)-tm(b.start)||(a.sequence||0)-(b.sequence||0));
    }

    function splitRowsByReset(rows){
      const chunks=[];let cur=[],last=null;
      function push(){if(turnCount(cur)>=3)chunks.push(cur);cur=[];last=null}
      rows.forEach(function(r){if(r.kind==='dayMarker'&&turnCount(cur)>=3)push();if(r.kind==='timed'&&r.start){const t=tm(r.start);if(last!==null&&last>=14*60&&t<=9*60&&turnCount(cur)>=8)push();last=t}cur.push(r)});push();return chunks;
    }

    function detectHeadingItems(items){
      const heads=[];
      items.forEach(function(it){const day=weekdayFromText(it.str);if(day){const x=it.transform?.[4]||0;const y=it.transform?.[5]||0;if(!heads.some(h=>h.day===day))heads.push({day,x,y})}});
      return heads.sort((a,b)=>a.x-b.x);
    }

    function pageSegments(tc,pageWidth){
      const items=tc.items||[];const heads=detectHeadingItems(items);
      if(heads.length>=2){
        const segs=[];
        for(let i=0;i<heads.length;i++){
          const left=i===0?0:(heads[i-1].x+heads[i].x)/2;
          const right=i===heads.length-1?pageWidth:(heads[i].x+heads[i+1].x)/2;
          const segItems=items.filter(it=>{const x=it.transform?.[4]||0;return x>=left&&x<right});
          segs.push({day:heads[i].day,lines:linesFromItems(segItems)});
        }
        return segs;
      }
      return[{day:heads[0]?.day||'',lines:linesFromItems(items)}];
    }

    function normalizeDayNames(dayBlocks){
      let previous='';
      dayBlocks.forEach(function(b,i){if(b.day)previous=b.day;else if(previous){b.day=nextWeekday(previous);previous=b.day}else b.day='Tag '+(i+1)});
      const used=new Set();dayBlocks.forEach(function(b,i){let base=b.day||('Tag '+(i+1)),name=base,n=2;while(used.has(name))name=base+' '+n++;b.day=name;used.add(name)});
      return dayBlocks;
    }

    async function loadPdfJs(){if(w.pdfjsLib)return w.pdfjsLib;return new Promise((resolve,reject)=>{const s=d.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=()=>{w.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';resolve(w.pdfjsLib)};s.onerror=()=>reject(new Error('PDF.js konnte nicht geladen werden'));d.head.appendChild(s)})}

    async function analyzeBuffer(buffer){
      const lib=await loadPdfJs(),pdf=await lib.getDocument({data:buffer}).promise;const blocks=[];
      for(let p=1;p<=pdf.numPages;p++){
        const page=await pdf.getPage(p),tc=await page.getTextContent(),viewport=page.getViewport({scale:1});
        pageSegments(tc,viewport.width).forEach(function(seg){
          const rows=parseLines(seg.lines),chunks=splitRowsByReset(rows);
          if(chunks.length){chunks.forEach(function(ch,idx){blocks.push({day:idx===0?seg.day:'',rows:ch})})}
        });
      }
      normalizeDayNames(blocks);
      const parsed={};blocks.forEach(function(b){const items=buildItems(b.rows);if(items.filter(x=>x.type==='turn').length>=3)parsed[b.day]=items});
      console.info('[Parser v4]',Object.keys(parsed),parsed);
      return parsed;
    }

    function saveParsed(parsed){const keys=Object.keys(parsed);if(!keys.length)throw new Error('Keine relevanten Zeitplan-Einträge gefunden');w.localStorage.setItem('upper_schedule_days',JSON.stringify(parsed));w.localStorage.setItem('upper_schedule_activeday',keys[0]);return keys}
    function hasExisting(){try{return Object.values(JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}')).some(v=>Array.isArray(v)&&v.length)}catch(_){return false}}

    async function importFile(file){if(hasExisting()&&!w.confirm('Es ist bereits ein Zeitplan vorhanden. Wirklich ersetzen?'))return;const parsed=await analyzeBuffer(await file.arrayBuffer());const keys=saveParsed(parsed);w.alert('Zeitplan erfolgreich importiert! Erkannt: '+keys.length+' Tage ('+keys.join(', ')+').');w.location.reload()}
    async function importUrl(url,btn){if(hasExisting()&&!w.confirm('Es ist bereits ein Zeitplan vorhanden. Wirklich ersetzen?'))return;btn.disabled=true;btn.textContent='Zeitplan wird analysiert …';const res=await w.fetch(url,{cache:'no-store'});if(!res.ok)throw new Error('PDF HTTP '+res.status);const parsed=await analyzeBuffer(await res.arrayBuffer());const keys=saveParsed(parsed);btn.textContent='Zeitplan geladen – '+keys.join(', ');setTimeout(()=>w.location.reload(),300)}

    d.addEventListener('change',function(e){const input=e.target;if(!input||input.id!=='schedulePdfFile'||!input.files?.[0])return;e.preventDefault();e.stopImmediatePropagation();importFile(input.files[0]).catch(err=>{console.error('[Parser v4]',err);w.alert('Fehler beim Lesen der PDF-Datei: '+(err.message||err));input.value=''})},true);

    d.addEventListener('click',function(e){const btn=e.target?.closest?.('.stardesign-auto-btn');if(!btn)return;const box=btn.closest('#stardesignAutoSchedule'),link=box?.querySelector('.stardesign-auto-link');if(!link||!/\.pdf(?:$|\?)/i.test(link.href))return;e.preventDefault();e.stopImmediatePropagation();importUrl(link.href,btn).catch(err=>{console.error('[Parser v4 auto]',err);btn.disabled=false;btn.textContent='Import fehlgeschlagen – erneut versuchen';w.alert('Stardesign-Zeitplan konnte nicht importiert werden: '+(err.message||err))})},true);
  });
})();