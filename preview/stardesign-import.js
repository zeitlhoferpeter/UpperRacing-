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
    function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}

    function classify(raw){
      const title=clean(raw);if(!title)return null;
      const upper=title.toUpperCase();

      /* Wichtig: A-D-Erkennung bleibt an erster Stelle. */
      if(/A\s*\+\s*B\s*\+\s*C\s*\+\s*D/i.test(title)||/ALLE GRUPPEN/i.test(title))return{title:'Freies Fahren – alle Gruppen',group:'A+B+C+D',type:'turn'};
      if(/\bGRUPPE\s*A\b|\bGR\.\s*A\b|GROUP\s*A\b/i.test(title))return{title:'Freies Fahren Gruppe A',group:'A',type:'turn'};
      if(/\bGRUPPE\s*B\b|\bGR\.\s*B\b|GROUP\s*B\b/i.test(title))return{title:'Freies Fahren Gruppe B',group:'B',type:'turn'};
      if(/\bGRUPPE\s*C\b|\bGR\.\s*C\b|GROUP\s*C\b/i.test(title))return{title:'Freies Fahren Gruppe C',group:'C',type:'turn'};
      if(/\bGRUPPE\s*D\b|\bGR\.\s*D\b|GROUP\s*D\b/i.test(title))return{title:'Freies Fahren Gruppe D',group:'D',type:'turn'};

      if(/REGROUPING|NEUE AUSFAHRTSGENEHMIGUNG|NEW TICKET|NEW TIKET/i.test(title))return{title:'REGROUPING – neue Ausfahrtsgenehmigung holen',group:'REGROUPING',type:'orga'};
      if(/MITTAGSPAUSE|LUNCH BREAK/i.test(title))return{title:'Mittagspause',group:'Pause',type:'orga'};
      if(upper.includes('FAHRERBESPRECHUNG')){
        const race=/RENNTEILNEHMER|RENNFAHRER|FÜR DIE RENNEN|FUER DIE RENNEN|RENNTEILNAHME|RENNEN TEILNAHME|RACE/i.test(title);
        return{title:race?'Fahrerbesprechung – Rennteilnehmer':'Fahrerbesprechung',group:'Briefing',type:'orga'};
      }
      if(/\bBRIEFING\b/i.test(title))return null;
      if(upper.includes('ANMELDUNG'))return{title:'Anmeldung',group:'Anmeldung',type:'orga'};
      /* Manche Stardesign-PDFs setzen die 07:30 nur auf die englische Registration-Zeile. */
      if(/\bREGISTRATION\b/i.test(title))return{title:'Anmeldung',group:'Anmeldung',type:'orga'};
      if(upper.includes('SIEGEREHRUNG')||upper.includes('PRICEGIVING'))return{title:'Siegerehrung',group:'Siegerehrung',type:'orga'};

      if(/\bCLASSIC\s+RACE\b/i.test(title))return{title:'Classic Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bROOKIE\s+RACE\b/i.test(title))return{title:'Rookie Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bSTERNCHEN\b/i.test(title)&&/LAPS?|RUNDEN/i.test(title))return{title:'Sternchen Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bSBK(?:1000)?\b/i.test(title)&&(/RACE|RENNEN|LAPS?|RUNDEN|GP START|GP-START/i.test(title)))return{title:'SBK Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bSSP(?:750)?\b/i.test(title)&&(/RACE|RENNEN|LAPS?|RUNDEN|GP START|GP-START/i.test(title)))return{title:'SSP Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bB[- ]?RACE\b/i.test(title))return{title:'B-Race'+lapsSuffix(title),group:'Rennen',type:'race'};
      if(/\bRACE\b|\bRENNEN\b/i.test(title))return{title:title.split(';')[0].trim(),group:'Rennen',type:'race'};
      return null;
    }

    function lapsSuffix(title){
      const m=String(title||'').match(/(\d+)\s*(?:LAPS?|RUNDEN)/i);
      return m?' – '+m[1]+' Laps':'';
    }

    function sequenceLines(tc){
      const lines=[];let cur='';
      (tc.items||[]).forEach(function(it){
        const s=clean(it.str);if(!s)return;
        cur+=(cur?' ':'')+s;
        if(it.hasEOL){if(clean(cur))lines.push(clean(cur));cur=''}
      });
      if(clean(cur))lines.push(clean(cur));
      return lines;
    }

    function geometricLines(tc){
      const rows=[];
      (tc.items||[]).forEach(function(it){
        const text=clean(it.str);if(!text)return;
        const x=it.transform&&it.transform.length>5?it.transform[4]:0;
        const y=it.transform&&it.transform.length>5?it.transform[5]:0;
        let row=rows.find(function(r){return Math.abs(r.y-y)<=5});
        if(!row){row={y:y,items:[]};rows.push(row)}
        row.items.push({x:x,text:text});
      });
      rows.sort(function(a,b){return b.y-a.y});
      return rows.map(function(r){r.items.sort(function(a,b){return a.x-b.x});return clean(r.items.map(function(i){return i.text}).join(' '))}).filter(Boolean);
    }

    function splitLine(line){
      let s=clean(line);if(!s)return[];
      s=s.replace(/^(?:next\s*-\s*)/i,'next - ');
      const results=[];

      /* Mehrere next-Race-Einträge können in einer extrahierten Zeile kleben. */
      if(/\bnext\s*(?:Race)?\b/i.test(s)){
        const firstNext=s.search(/\bnext\s*(?:Race)?\b/i);
        if(firstNext>0){
          results.push.apply(results,splitLine(s.slice(0,firstNext)));
          s=s.slice(firstNext);
        }
        const parts=s.split(/(?=\bnext\s*(?:Race)?\b)/i).filter(Boolean);
        parts.forEach(function(p){
          const m=p.match(/^next\s*-\s*(\d{1,2}[:.]\d{2})\s+(.+)$/i);
          if(m){results.push({kind:'timed',start:normTime(m[1]),end:'',rawTitle:m[2]});return}
          results.push({kind:'nextRace',rawTitle:clean(p.replace(/^next\s*(?:Race)?\s*/i,''))});
        });
        return results;
      }

      const range=s.match(/^(?:(?:ab|ca\.?|circa)\s+)?(\d{1,2}[:.]\d{2})\s*(?:-|–|—|bis)\s*(\d{1,2}[:.]\d{2})\s*(.*)$/i);
      if(range){
        results.push({kind:'timed',start:normTime(range[1]),end:normTime(range[2]),rawTitle:clean(range[3])});
        return results;
      }

      const single=s.match(/^(?:(?:ab|ca\.?|circa)\s+)?(\d{1,2}[:.]\d{2})\s+(.+)$/i);
      if(single){results.push({kind:'timed',start:normTime(single[1]),end:'',rawTitle:clean(single[2])});return results}

      /* Falls mehrere komplette Zeit-Einträge ohne EOL zusammengeklebt wurden. */
      const starts=[];const re=/(?:^|\s)(\d{1,2}[:.]\d{2})(?=\s)/g;let m;
      while((m=re.exec(s)))starts.push({index:m.index+(m[0].length-m[1].length),time:m[1]});
      if(starts.length>1){
        for(let i=0;i<starts.length;i++){
          const a=starts[i],b=starts[i+1];
          const chunk=clean(s.slice(a.index,b?b.index:s.length));
          if(chunk!==s)results.push.apply(results,splitLine(chunk));
        }
        if(results.length)return results;
      }

      if(/REGROUPING|NEUE AUSFAHRTSGENEHMIGUNG|NEW TICKET|NEW TIKET/i.test(s))return[{kind:'untimedOrga',rawTitle:s}];
      if(/MITTAGSPAUSE|LUNCH BREAK/i.test(s))return[{kind:'untimedOrga',rawTitle:s}];
      if(/FAHRERBESPRECHUNG|SIEGEREHRUNG|PRICEGIVING|ANMELDUNG|REGISTRATION/i.test(s))return[{kind:'untimedOrga',rawTitle:s}];
      if(/RENNTAG\s*:?\s*\d+/i.test(s))return[{kind:'dayMarker',rawTitle:s}];
      return[];
    }

    function parseLines(lines){
      const rows=[];
      (lines||[]).forEach(function(line){
        splitLine(line).forEach(function(r){rows.push(r)});
      });
      return rows;
    }

    function substantiveCount(rows){
      return rows.reduce(function(n,r){
        if(r.kind!=='timed')return n;
        return n+(classify(r.rawTitle)?1:0);
      },0);
    }

    function splitIntoDays(rows){
      const days=[];let cur=[];let lastTimed=null;
      function push(){if(substantiveCount(cur)>=3)days.push(cur);cur=[];lastTimed=null}

      rows.forEach(function(r){
        if(r.kind==='dayMarker'){
          if(substantiveCount(cur)>=3)push();
          cur.push(r);return;
        }
        if(r.kind==='timed'&&r.start){
          const t=tm(r.start);
          const prevCount=substantiveCount(cur);
          /* Neuer Renntag: nach einem vollen Nachmittags-/Abendprogramm beginnt wieder morgens. */
          if(lastTimed!==null&&lastTimed>=14*60&&t<=9*60&&prevCount>=8){push()}
          lastTimed=t;
        }
        cur.push(r);
      });
      push();
      return days;
    }

    function buildItems(rows){
      const items=[];let lastTimed='',lastRace='',raceSeq=0;
      function nextTimed(idx){
        for(let j=idx+1;j<rows.length;j++){
          if(rows[j].kind==='timed'&&rows[j].start&&tm(rows[j].start)>tm(rows[idx].start||'00:00'))return rows[j].start;
        }
        return'';
      }

      rows.forEach(function(r,i){
        if(r.kind==='dayMarker')return;
        if(r.kind==='untimedOrga'){
          const c=classify(r.rawTitle);if(!c)return;
          if(lastTimed)items.push({start:lastTimed,end:'',title:c.title,group:c.group,type:c.type});
          return;
        }
        if(r.kind==='nextRace'){
          const c=classify(r.rawTitle);if(c&&c.type==='race'&&lastRace){
            raceSeq++;
            items.push({start:lastRace,end:'',title:c.title,group:'Rennen',type:'race',sequence:raceSeq});
          }
          return;
        }
        if(r.kind!=='timed'||!r.start)return;
        lastTimed=r.start;

        let c=classify(r.rawTitle);
        /* Zeitbereich ohne Titel in der Mittagszone ist bei Stardesign praktisch immer die Pause. */
        if(!c&&!clean(r.rawTitle)&&r.end&&tm(r.start)>=11*60&&tm(r.start)<=14*60&&tm(r.end)>tm(r.start)){
          c={title:'Mittagspause',group:'Pause',type:'orga'};
        }
        if(!c)return;

        let end=r.end||'';
        if(c.type==='turn'&&!end){
          const n=nextTimed(i);
          if(n&&tm(n)>tm(r.start)&&tm(n)-tm(r.start)<=40)end=n;
        }

        if(c.type==='turn'){
          items.push({start:r.start,end:end,title:c.title,group:c.group,type:'turn'});
        }else if(c.type==='orga'){
          items.push({start:r.start,end:end,title:c.title,group:c.group,type:'orga'});
        }else if(c.type==='race'){
          lastRace=r.start;raceSeq=0;
          items.push({start:r.start,end:end,title:c.title,group:'Rennen',type:'race',sequence:0});
        }
      });

      const map=new Map();
      items.forEach(function(it){
        const k=[it.start,it.end,it.group,it.title,it.sequence||''].join('|');
        if(!map.has(k))map.set(k,it);
      });
      return Array.from(map.values()).sort(function(a,b){return tm(a.start)-tm(b.start)||(a.sequence||0)-(b.sequence||0)});
    }

    function scoreParsed(parsed){
      const keys=Object.keys(parsed);let score=keys.length*8;
      keys.forEach(function(k){
        (parsed[k]||[]).forEach(function(it){
          if(it.type==='turn')score+=10;
          else if(it.type==='race')score+=4;
          else score+=2;
          if(it.type==='turn'&&it.end){const dur=tm(it.end)-tm(it.start);if(dur<=0||dur>45)score-=8}
        });
      });
      return score;
    }

    function rowsToParsed(rows){
      const chunks=splitIntoDays(rows),parsed={};
      chunks.forEach(function(chunk,i){
        const items=buildItems(chunk);
        if(items.filter(function(x){return x.type==='turn'}).length>=3)parsed['Tag '+(Object.keys(parsed).length+1)]=items;
      });
      return parsed;
    }

    async function analyzePdf(file){
      const lib=await loadPdfJs();
      const pdf=await lib.getDocument({data:await file.arrayBuffer()}).promise;
      const seqRows=[],geoRows=[];

      for(let p=1;p<=pdf.numPages;p++){
        const page=await pdf.getPage(p),tc=await page.getTextContent();
        parseLines(sequenceLines(tc)).forEach(function(r){seqRows.push(r)});
        parseLines(geometricLines(tc)).forEach(function(r){geoRows.push(r)});
      }

      const seqParsed=rowsToParsed(seqRows);
      const geoParsed=rowsToParsed(geoRows);
      const seqScore=scoreParsed(seqParsed),geoScore=scoreParsed(geoParsed);
      console.info('[Preview Parser v3] sequence=',seqScore,Object.keys(seqParsed).length,'Tage; geometry=',geoScore,Object.keys(geoParsed).length,'Tage');
      return seqScore>=geoScore?seqParsed:geoParsed;
    }

    function loadPdfJs(){
      if(w.pdfjsLib)return Promise.resolve(w.pdfjsLib);
      return new Promise(function(resolve,reject){
        const s=d.createElement('script');
        s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload=function(){w.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';resolve(w.pdfjsLib)};
        s.onerror=function(){reject(new Error('PDF.js konnte nicht geladen werden'))};
        d.head.appendChild(s);
      });
    }

    function hasExisting(){
      try{
        const days=JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}');
        return Object.values(days).some(function(v){return Array.isArray(v)&&v.length});
      }catch(_){return false}
    }

    async function importFile(file){
      if(!file)return;
      if(hasExisting()&&!w.confirm('Es ist bereits ein Zeitplan vorhanden. Wirklich ersetzen?'))return;
      if(typeof w.showNotice==='function')w.showNotice('saveNotice','Analysiere Stardesign-Zeitplan …');
      const parsed=await analyzePdf(file);
      const keys=Object.keys(parsed);
      if(!keys.length)throw new Error('Keine relevanten Zeitplan-Einträge gefunden');
      w.localStorage.setItem('upper_schedule_days',JSON.stringify(parsed));
      w.localStorage.setItem('upper_schedule_activeday',keys[0]);
      w.localStorage.setItem('upper_schedule_parser_version','preview-v3');
      w.alert('Zeitplan erfolgreich importiert! Erkannt: '+keys.length+' Tag'+(keys.length===1?'':'e')+'.');
      w.location.reload();
    }

    /* Manueller UND automatischer Import laufen damit durch exakt denselben Parser. */
    d.addEventListener('change',function(ev){
      const input=ev.target;
      if(!input||input.id!=='schedulePdfFile')return;
      const file=input.files&&input.files[0];if(!file)return;
      ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
      importFile(file).catch(function(err){
        console.error('[Preview Parser v3]',err);
        w.alert('Zeitplan konnte nicht korrekt importiert werden: '+(err.message||err));
        try{input.value=''}catch(_){}
      });
    },true);
  });
})();