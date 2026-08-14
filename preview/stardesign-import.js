(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    function normTime(t){
      const m=String(t||'').trim().replace('.',':').match(/^(\d{1,2}):(\d{2})$/);
      if(!m)return'';
      const h=+m[1],mi=+m[2];
      if(h<0||h>23||mi<0||mi>59)return'';
      return String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0');
    }
    function tm(t){const p=normTime(t).split(':');return p.length===2?(+p[0])*60+(+p[1]):0}

    function classify(raw){
      const title=String(raw||'').replace(/\s+/g,' ').trim();
      if(!title)return null;
      const upper=title.toUpperCase();
      if(/A\s*\+\s*B\s*\+\s*C\s*\+\s*D/i.test(title)||/ALLE GRUPPEN/i.test(title))return{title:'Freies Fahren – alle Gruppen',group:'A+B+C+D',type:'turn'};
      if(/\bGRUPPE\s*A\b|\bGR\.\s*A\b|GROUP\s*A\b/i.test(title))return{title:'Freies Fahren Gruppe A',group:'A',type:'turn'};
      if(/\bGRUPPE\s*B\b|\bGR\.\s*B\b|GROUP\s*B\b/i.test(title))return{title:'Freies Fahren Gruppe B',group:'B',type:'turn'};
      if(/\bGRUPPE\s*C\b|\bGR\.\s*C\b|GROUP\s*C\b/i.test(title))return{title:'Freies Fahren Gruppe C',group:'C',type:'turn'};
      if(/\bGRUPPE\s*D\b|\bGR\.\s*D\b|GROUP\s*D\b/i.test(title))return{title:'Freies Fahren Gruppe D',group:'D',type:'turn'};
      if(/REGROUPING|NEUE AUSFAHRTSGENEHMIGUNG|NEW TICKET/i.test(title))return{title:'REGROUPING – neue Ausfahrtsgenehmigung holen',group:'REGROUPING',type:'orga'};
      if(/MITTAGSPAUSE|LUNCH BREAK/i.test(title))return{title:'Mittagspause',group:'Pause',type:'orga'};
      if(upper.includes('FAHRERBESPRECHUNG')){
        const race=/RENNTEILNEHMER|RENNFAHRER|FÜR DIE RENNEN|FUER DIE RENNEN|RENNTEILNAHME|RACE/i.test(title);
        return{title:race?'Fahrerbesprechung – Rennteilnehmer':'Fahrerbesprechung',group:'Briefing',type:'orga'};
      }
      if(/\bBRIEFING\b/i.test(title))return null;
      if(upper.includes('ANMELDUNG'))return{title:'Anmeldung',group:'Anmeldung',type:'orga'};
      if(upper.includes('REGISTRATION'))return null;
      if(upper.includes('SIEGEREHRUNG')||upper.includes('PRICEGIVING'))return{title:'Siegerehrung',group:'Siegerehrung',type:'orga'};
      if(/\bCLASSIC\s+RACE\b/i.test(title))return{title:'Classic Race',group:'Rennen',type:'race'};
      if(/\bROOKIE\s+RACE\b/i.test(title))return{title:'Rookie Race',group:'Rennen',type:'race'};
      if(/\bSTERNCHEN\b/i.test(title)&&/LAPS?|RUNDEN/i.test(title))return{title:'Sternchen Race',group:'Rennen',type:'race'};
      if(/\bSBK(?:1000)?\b/i.test(title)&&(/RACE|RENNEN|LAPS?|RUNDEN/i.test(title)))return{title:'SBK Race',group:'Rennen',type:'race'};
      if(/\bSSP(?:750)?\b/i.test(title)&&(/RACE|RENNEN|LAPS?|RUNDEN/i.test(title)))return{title:'SSP Race',group:'Rennen',type:'race'};
      if(/\bB[- ]?RACE\b/i.test(title))return{title:'B-Race',group:'Rennen',type:'race'};
      if(/\bRACE\b|\bRENNEN\b/i.test(title))return{title:title.split(';')[0].trim(),group:'Rennen',type:'race'};
      return null;
    }

    function splitTimedLine(line){
      const s=String(line||'').replace(/\s+/g,' ').trim();
      if(!s)return[];
      const re=/(\d{1,2}[:.]\d{2})/g,matches=[];let m;
      while((m=re.exec(s)))matches.push({time:m[1],index:m.index,end:re.lastIndex});
      if(!matches.length)return[];
      const out=[];
      for(let i=0;i<matches.length;i++){
        const a=matches[i];
        if(i+1<matches.length){
          const b=matches[i+1];
          const between=s.slice(a.end,b.index);
          if(/^\s*(?:-|–|—|bis)\s*$/i.test(between)){
            const titleStart=b.end;
            const titleEnd=i+2<matches.length?matches[i+2].index:s.length;
            out.push({start:normTime(a.time),end:normTime(b.time),title:s.slice(titleStart,titleEnd).trim()});
            i++;
            continue;
          }
        }
        const titleEnd=i+1<matches.length?matches[i+1].index:s.length;
        out.push({start:normTime(a.time),end:'',title:s.slice(a.end,titleEnd).trim()});
      }
      return out.filter(x=>x.start);
    }

    function extractLines(page){
      return page.getTextContent().then(tc=>{
        const rows=[];
        tc.items.forEach(it=>{
          const text=it.str?it.str.trim():'';if(!text)return;
          const x=it.transform[4],y=it.transform[5];
          let row=rows.find(r=>Math.abs(r.y-y)<=6);
          if(!row){row={y,items:[]};rows.push(row)}
          row.items.push({x,text});
        });
        rows.sort((a,b)=>b.y-a.y);
        return rows.map(r=>{r.items.sort((a,b)=>a.x-b.x);return r.items.map(i=>i.text).join(' ').replace(/\s+/g,' ').trim()}).filter(Boolean);
      });
    }

    function parseRows(lines){
      const rows=[];
      (lines||[]).forEach(line=>{
        const timed=splitTimedLine(line);
        timed.forEach(t=>rows.push({kind:'timed',start:t.start,end:t.end,rawTitle:t.title}));
        if(!timed.length&&/REGROUPING|NEUE AUSFAHRTSGENEHMIGUNG|NEW TICKET/i.test(line))rows.push({kind:'untimedOrga',rawTitle:line});
        const nextParts=String(line).split(/(?=\bnext\s*(?:Race)?\s+)/i).slice(1);
        nextParts.forEach(p=>rows.push({kind:'nextRace',rawTitle:p.replace(/^next\s*(?:Race)?\s*/i,'').trim()}));
      });
      return rows;
    }

    function splitIntoDays(rows){
      const days=[[]];let lastStart=null;
      rows.forEach(r=>{
        if(r.kind==='timed'&&r.start){
          const cur=tm(r.start);
          if(lastStart!==null&&lastStart>=16*60&&cur<=8*60+30&&days[days.length-1].length>5)days.push([]);
          lastStart=cur;
        }
        days[days.length-1].push(r);
      });
      return days.filter(d=>d.length);
    }

    function buildItems(rows){
      const items=[];let lastTimed='',lastRace='',raceSeq=0;
      function nextTimed(idx){for(let j=idx+1;j<rows.length;j++)if(rows[j].kind==='timed'&&rows[j].start)return rows[j].start;return''}
      rows.forEach((r,i)=>{
        if(r.kind==='untimedOrga'){
          const c=classify(r.rawTitle);if(c&&lastTimed)items.push({start:lastTimed,end:'',title:c.title,group:c.group,type:c.type});return;
        }
        if(r.kind==='nextRace'){
          const c=classify(r.rawTitle);if(c&&c.type==='race'&&lastRace){raceSeq++;items.push({start:lastRace,end:'',title:c.title,group:'Rennen',type:'race',sequence:raceSeq})}return;
        }
        if(r.kind!=='timed'||!r.start)return;
        lastTimed=r.start;
        const c=classify(r.rawTitle);if(!c)return;
        let end=r.end||'';
        if(c.type==='turn'&&!end){const n=nextTimed(i);if(n&&tm(n)>tm(r.start))end=n}
        if(c.type==='turn'){
          if(end&&tm(end)>tm(r.start))items.push({start:r.start,end,title:c.title,group:c.group,type:'turn'});
        }else if(c.type==='orga')items.push({start:r.start,end,title:c.title,group:c.group,type:'orga'});
        else if(c.type==='race'){lastRace=r.start;raceSeq=0;items.push({start:r.start,end,title:c.title,group:'Rennen',type:'race',sequence:0})}
      });
      const map=new Map();
      items.forEach(it=>{const k=[it.start,it.end,it.group,it.title,it.sequence||''].join('|');if(!map.has(k))map.set(k,it)});
      return [...map.values()].sort((a,b)=>tm(a.start)-tm(b.start)||(a.sequence||0)-(b.sequence||0));
    }

    function loadPdfJs(){
      if(w.pdfjsLib)return Promise.resolve(w.pdfjsLib);
      return new Promise((resolve,reject)=>{
        const s=d.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload=()=>{w.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';resolve(w.pdfjsLib)};
        s.onerror=()=>reject(new Error('PDF.js konnte nicht geladen werden'));d.head.appendChild(s);
      });
    }

    async function importStardesign(url,button){
      if(!url)throw new Error('Keine PDF-Adresse gefunden');
      let existing={};try{existing=JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}')}catch(_){existing={}}
      if(Object.values(existing).some(v=>Array.isArray(v)&&v.length)&&!w.confirm('Es ist bereits ein Zeitplan vorhanden. Wirklich ersetzen?'))return;
      button.disabled=true;button.textContent='Stardesign-Zeitplan wird analysiert …';
      const res=await w.fetch(url,{cache:'no-store'});if(!res.ok)throw new Error('PDF HTTP '+res.status);
      const buf=await res.arrayBuffer();const lib=await loadPdfJs();const pdf=await lib.getDocument({data:buf}).promise;
      const all=[];
      for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);const lines=await extractLines(page);all.push(...parseRows(lines))}
      const chunks=splitIntoDays(all);const parsed={};
      chunks.forEach((chunk,i)=>{const items=buildItems(chunk);if(items.length)parsed['Tag '+(i+1)]=items});
      if(!Object.keys(parsed).length)throw new Error('Keine relevanten Einträge gefunden');
      w.localStorage.setItem('upper_schedule_days',JSON.stringify(parsed));
      w.localStorage.setItem('upper_schedule_activeday',Object.keys(parsed)[0]);
      button.textContent='Zeitplan geladen – '+Object.keys(parsed).length+' Tage';
      setTimeout(()=>w.location.reload(),350);
    }

    d.addEventListener('click',function(ev){
      const btn=ev.target&&ev.target.closest?ev.target.closest('.stardesign-auto-btn'):null;
      if(!btn)return;
      const box=btn.closest('#stardesignAutoSchedule');
      const link=box&&box.querySelector('.stardesign-auto-link');
      if(!link||!/\.pdf(?:$|\?)/i.test(link.href))return;
      ev.preventDefault();ev.stopImmediatePropagation();
      importStardesign(link.href,btn).catch(err=>{console.error('[Stardesign Import]',err);btn.disabled=false;btn.textContent='Import fehlgeschlagen – erneut versuchen';w.alert('Stardesign-Zeitplan konnte nicht vollständig importiert werden: '+(err.message||err))});
    },true);
  });
})();