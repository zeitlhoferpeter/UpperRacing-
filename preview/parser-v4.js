(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const DAYS=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    const DAY_PATTERNS=[
      ['Sonntag',/(Sonntag|Sunday)/i],['Montag',/(Montag|Monday)/i],['Dienstag',/(Dienstag|Tuesday)/i],
      ['Mittwoch',/(Mittwoch|Wednesday)/i],['Donnerstag',/(Donnerstag|Thursday)/i],['Freitag',/(Freitag|Friday|Fri\s*\/\s*day)/i],['Samstag',/(Samstag|Saturday)/i]
    ];

    function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
    function normTime(t){const m=String(t||'').trim().replace('.',':').match(/^(\d{1,2}):(\d{2})$/);if(!m)return'';const h=+m[1],mi=+m[2];if(h>23||mi>59)return'';return String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0')}
    function tm(t){const p=normTime(t).split(':');return p.length===2?(+p[0])*60+(+p[1]):0}
    function nextDay(name){const i=DAYS.indexOf(name);return i<0?'':DAYS[(i+1)%7]}
    function detectDay(text){for(const [name,re] of DAY_PATTERNS)if(re.test(text||''))return name;return''}
    function lapsSuffix(t){const m=String(t||'').match(/(\d+)\s*(?:Laps?|Runden)/i);return m?' – '+m[1]+' Laps':''}

    function classify(raw){
      const title=clean(raw);if(!title)return null;const u=title.toUpperCase();
      if(/A\s*\+\s*B\s*\+\s*C\s*\+\s*D/i.test(title)||/ALLE GRUPPEN/i.test(title))return{title:'Freies Fahren – alle Gruppen',group:'A+B+C+D',type:'turn'};
      if(/\bGRUPPE\s*A\b|\bGROUP\s*A\b/i.test(title))return{title:'Freies Fahren Gruppe A',group:'A',type:'turn'};
      if(/\bGRUPPE\s*B\b|\bGROUP\s*B\b/i.test(title))return{title:'Freies Fahren Gruppe B',group:'B',type:'turn'};
      if(/\bGRUPPE\s*C\b|\bGROUP\s*C\b/i.test(title))return{title:'Freies Fahren Gruppe C',group:'C',type:'turn'};
      if(/\bGRUPPE\s*D\b|\bGROUP\s*D\b/i.test(title))return{title:'Freies Fahren Gruppe D',group:'D',type:'turn'};
      if(/REGROUPING|NEUE AUSFAHRTSGENEHMIGUNG|NEW TICKET|NEW TIKET/i.test(title))return{title:'REGROUPING – neue Ausfahrtsgenehmigung holen',group:'REGROUPING',type:'orga'};
      if(/MITTAGSPAUSE|LUNCH BREAK/i.test(title))return{title:'Mittagspause',group:'Pause',type:'orga'};
      if(u.includes('FAHRERBESPRECHUNG')){const race=/RENNTEILNEHMER|RENNFAHRER|FÜR DIE RENNEN|FUER DIE RENNEN|RENNEN|RACE/i.test(title);return{title:race?'Fahrerbesprechung – Rennteilnehmer':'Fahrerbesprechung',group:'Briefing',type:'orga'}}
      if(/\bBRIEFING\b/i.test(title))return null;
      if(/ANMELDUNG|REGISTRATION/i.test(title))return{title:'Anmeldung',group:'Anmeldung',type:'orga'};
      if(/SIEGEREHRUNG|PRICEGIVING/i.test(title))return{title:'Siegerehrung',group:'Siegerehrung',type:'orga'};
      if(/CLASSIC\s+RACE/i.test(title))return{title:'Classic Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/ROOKIE\s+RACE/i.test(title))return{title:'Rookie Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/STERNCHEN/i.test(title)&&/LAPS?|RUNDEN/i.test(title))return{title:'Sternchen Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bB[- ]?RACE\b/i.test(title))return{title:'B-Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bSBK(?:1000)?\b/i.test(title)&&(/RACE|LAPS?|RUNDEN|GP[- ]?START/i.test(title)))return{title:'SBK Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bSSP(?:750)?\b/i.test(title)&&(/RACE|LAPS?|RUNDEN|GP[- ]?START/i.test(title)))return{title:'SSP Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bRACE\b|\bRENNEN\b/i.test(title))return{title:title.split(';')[0].trim(),group:'Rennen',type:'race'};
      return null;
    }

    function cluster(values,tol){
      const sorted=values.slice().sort((a,b)=>a-b),clusters=[];
      sorted.forEach(v=>{let c=clusters.find(q=>Math.abs(q.center-v)<=tol);if(!c){c={vals:[],center:v};clusters.push(c)}c.vals.push(v);c.center=c.vals.reduce((a,b)=>a+b,0)/c.vals.length});
      return clusters.sort((a,b)=>b.vals.length-a.vals.length);
    }

    function isTimeText(s){return /(?:^|\s)\d{1,2}[:.]\d{2}(?:\s|$)/.test(clean(s))}

    function detectPanelAxis(items){
      const times=items.filter(it=>isTimeText(it.str));
      if(times.length<8)return{axis:'x',centers:[]};
      const xs=cluster(times.map(it=>it.transform?.[4]||0),14).filter(c=>c.vals.length>=6);
      const ys=cluster(times.map(it=>it.transform?.[5]||0),28).filter(c=>c.vals.length>=6);
      const xMax=xs[0]?.vals.length||0,yMax=ys[0]?.vals.length||0;
      const axis=yMax>xMax?'y':'x';
      const cs=(axis==='y'?ys:xs).filter(c=>c.vals.length>=6).sort((a,b)=>a.center-b.center);
      return{axis,centers:cs.map(c=>c.center)};
    }

    function splitPanels(items){
      const det=detectPanelAxis(items),axis=det.axis,coord=axis==='y'?5:4;
      let centers=det.centers.slice();
      if(!centers.length)return[{axis,center:null,items}];
      if(centers.length>3)centers=centers.slice(0,3).sort((a,b)=>a-b);
      if(centers.length===1){
        const c=centers[0];
        const band=axis==='y'?190:220;
        return[{axis,center:c,items:items.filter(it=>Math.abs((it.transform?.[coord]||0)-c)<=band)}];
      }
      const out=[];
      centers.forEach((c,i)=>{
        const left=i===0?-Infinity:(centers[i-1]+c)/2;
        const right=i===centers.length-1?Infinity:(c+centers[i+1])/2;
        const selected=items.filter(it=>{const v=it.transform?.[coord]||0;return v>=left&&v<right});
        out.push({axis,center:c,items:selected});
      });
      return out;
    }

    function linesForPanel(panel){
      const rowCoord=panel.axis==='y'?4:5;
      const textCoord=panel.axis==='y'?5:4;
      const rows=[];
      panel.items.forEach(it=>{
        const text=clean(it.str);if(!text)return;
        const r=it.transform?.[rowCoord]||0,t=it.transform?.[textCoord]||0;
        let row=rows.find(q=>Math.abs(q.r-r)<=4.5);
        if(!row){row={r,items:[]};rows.push(row)}
        row.items.push({t,text});
      });
      rows.sort((a,b)=>a.r-b.r);
      return rows.map(row=>{row.items.sort((a,b)=>a.t-b.t);return clean(row.items.map(i=>i.text).join(' '))}).filter(Boolean);
    }

    function parseLine(line){
      let s=clean(line);if(!s)return[];const out=[];
      if(/\bnext\s*(?:Race)?\b/i.test(s)){
        const first=s.search(/\bnext\s*(?:Race)?\b/i);if(first>0)out.push(...parseLine(s.slice(0,first)));s=s.slice(Math.max(0,first));
        s.split(/(?=\bnext\s*(?:Race)?\b)/i).filter(Boolean).forEach(p=>{const timed=p.match(/^next\s*-\s*(\d{1,2}[:.]\d{2})\s+(.+)$/i);if(timed)out.push({kind:'timed',start:normTime(timed[1]),end:'',rawTitle:timed[2]});else out.push({kind:'nextRace',rawTitle:clean(p.replace(/^next\s*(?:Race)?\s*/i,''))})});
        return out;
      }
      let m=s.match(/^(?:Vortag\s*\/?.*?\s+)?(?:(?:ab|ca\.?|circa)\s+)?(\d{1,2}[:.]\d{2})\s*(?:-|–|—|bis)\s*(\d{1,2}[:.]\d{2})\s*(.*)$/i);
      if(m)return[{kind:'timed',start:normTime(m[1]),end:normTime(m[2]),rawTitle:clean(m[3])}];
      m=s.match(/^(?:(?:ab|ca\.?|circa)\s+)?(\d{1,2}[:.]\d{2})\s+(.+)$/i);
      if(m)return[{kind:'timed',start:normTime(m[1]),end:'',rawTitle:clean(m[2])}];
      if(/REGROUPING|MITTAGSPAUSE|LUNCH BREAK|FAHRERBESPRECHUNG|SIEGEREHRUNG|PRICEGIVING|ANMELDUNG|REGISTRATION/i.test(s))return[{kind:'untimed',rawTitle:s}];
      return[];
    }

    function buildItems(lines){
      const rows=[];lines.forEach(line=>rows.push(...parseLine(line)));
      const items=[];let lastTimed='',lastRace='',raceSeq=0;
      function nextTimed(i){for(let j=i+1;j<rows.length;j++)if(rows[j].kind==='timed'&&rows[j].start&&tm(rows[j].start)>tm(rows[i].start||'00:00'))return rows[j].start;return''}
      rows.forEach((r,i)=>{
        if(r.kind==='untimed'){const c=classify(r.rawTitle);if(c&&lastTimed)items.push({start:lastTimed,end:'',title:c.title,group:c.group,type:c.type});return}
        if(r.kind==='nextRace'){const c=classify(r.rawTitle);if(c&&c.type==='race'&&lastRace){raceSeq++;items.push({start:lastRace,end:'',title:c.title,group:'Rennen',type:'race',sequence:raceSeq})}return}
        if(r.kind!=='timed'||!r.start)return;
        lastTimed=r.start;let c=classify(r.rawTitle);
        if(!c&&!clean(r.rawTitle)&&r.end&&tm(r.start)>=11*60&&tm(r.start)<=14*60)c={title:'Mittagspause',group:'Pause',type:'orga'};
        if(!c)return;
        let end=r.end||'';
        if(c.type==='turn'&&!end){const n=nextTimed(i),dur=n?tm(n)-tm(r.start):0;if(n&&dur>0&&dur<=40)end=n}
        if(c.type==='race'){lastRace=r.start;raceSeq=0;items.push({start:r.start,end,title:c.title,group:'Rennen',type:'race',sequence:0})}
        else items.push({start:r.start,end,title:c.title,group:c.group,type:c.type});
      });
      const map=new Map();items.forEach(it=>{const k=[it.start,it.end,it.group,it.title,it.sequence||''].join('|');if(!map.has(k))map.set(k,it)});
      return [...map.values()].sort((a,b)=>tm(a.start)-tm(b.start)||(a.sequence||0)-(b.sequence||0));
    }

    function loadPdfJs(){
      if(w.pdfjsLib)return Promise.resolve(w.pdfjsLib);
      return new Promise((resolve,reject)=>{const s=d.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=()=>{w.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';resolve(w.pdfjsLib)};s.onerror=()=>reject(new Error('PDF.js konnte nicht geladen werden'));d.head.appendChild(s)});
    }

    async function analyze(buffer){
      const lib=await loadPdfJs(),pdf=await lib.getDocument({data:buffer}).promise;const parsed={};let previousDay='';
      for(let p=1;p<=pdf.numPages;p++){
        const page=await pdf.getPage(p),tc=await page.getTextContent();
        const allText=(tc.items||[]).map(it=>clean(it.str)).join(' ');
        const pageDay=detectDay(allText);
        const panels=splitPanels(tc.items||[]);
        for(let i=0;i<panels.length;i++){
          const lines=linesForPanel(panels[i]);
          const items=buildItems(lines);
          if(items.filter(x=>x.type==='turn').length<3)continue;
          let day='';
          const panelDay=detectDay(lines.join(' '));
          if(panelDay)day=panelDay;
          else if(i===0&&pageDay)day=pageDay;
          else if(previousDay)day=nextDay(previousDay);
          else day='Tag '+(Object.keys(parsed).length+1);
          if(parsed[day]){let n=2,base=day;while(parsed[base+' '+n])n++;day=base+' '+n}
          parsed[day]=items;previousDay=day;
        }
      }
      console.info('[UpperRacing Parser v8]',Object.keys(parsed),parsed);
      return parsed;
    }

    function hasExisting(){try{return Object.values(JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}')).some(v=>Array.isArray(v)&&v.length)}catch(_){return false}}
    function saveParsed(parsed){const keys=Object.keys(parsed);if(!keys.length)throw new Error('Keine relevanten Zeitplan-Einträge gefunden');w.localStorage.setItem('upper_schedule_days',JSON.stringify(parsed));w.localStorage.setItem('upper_schedule_activeday',keys[0]);return keys}

    async function importFile(file,input){
      if(hasExisting()&&!w.confirm('Es ist bereits ein Zeitplan vorhanden. Wirklich ersetzen?')){input.value='';return}
      try{const keys=saveParsed(await analyze(await file.arrayBuffer()));input.value='';w.sessionStorage.setItem('upper_preview_open_schedule','1');w.alert('Zeitplan erfolgreich importiert! Erkannt: '+keys.length+' Tage – '+keys.join(', ')+'.');w.location.reload()}
      catch(err){console.error('[Parser v8]',err);input.value='';w.alert('Fehler beim Lesen der PDF-Datei: '+(err.message||err))}
    }

    d.addEventListener('change',function(ev){const input=ev.target;if(!input||input.id!=='schedulePdfFile')return;const file=input.files&&input.files[0];if(!file)return;ev.preventDefault();ev.stopImmediatePropagation();importFile(file,input)},true);

    setTimeout(function(){if(w.sessionStorage.getItem('upper_preview_open_schedule')==='1'){w.sessionStorage.removeItem('upper_preview_open_schedule');if(typeof w.switchPage==='function')w.switchPage('schedule')}},650);
  });
})();