(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const DAY_DEFS=[
      ['Montag',/(?:Montag|Monday)/ig],
      ['Dienstag',/(?:Dienstag|Tuesday)/ig],
      ['Mittwoch',/(?:Mittwoch|Wednesday)/ig],
      ['Donnerstag',/(?:Donnerstag|Thursday)/ig],
      ['Freitag',/(?:Freitag|Friday|Fri\s*\/\s*day)/ig],
      ['Samstag',/(?:Samstag|Saturday)/ig],
      ['Sonntag',/(?:Sonntag|Sunday)/ig]
    ];

    let metadata=null;
    let redispatching=false;

    function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
    function minutes(t){const m=String(t||'').match(/^(\d{1,2}):(\d{2})$/);return m?(+m[1])*60+(+m[2]):0}

    function daysInText(text){
      const hits=[];
      DAY_DEFS.forEach(([name,re])=>{
        re.lastIndex=0; let m;
        while((m=re.exec(text||''))) hits.push({name,index:m.index});
      });
      hits.sort((a,b)=>a.index-b.index);
      const out=[];
      hits.forEach(h=>{if(!out.includes(h.name))out.push(h.name)});
      return out;
    }

    function raceName(raw){
      const s=clean(raw);
      if(/CLASSIC\s+RACE/i.test(s))return 'Classic Race';
      if(/ROOKIE\s+RACE/i.test(s)||/STERNCHEN/i.test(s))return 'Rookie Race';
      if(/\bB[- ]?RACE\b/i.test(s))return 'B-Race';
      if(/\bSSP(?:750)?\b/i.test(s))return 'SSP Race';
      if(/\bSBK(?:1000)?\b/i.test(s))return 'SBK Race';
      return '';
    }

    function racesInText(text){
      const out=[];
      const first=/\b(\d{1,2}[:.]\d{2})\s+([^\n]*?(?:Classic\s+Race|Rookie\s+Race|Sternchen|B[- ]?Race|SSP(?:750)?|SBK(?:1000)?)[^\n]*?)(?=\bnext\s+Race\b|\bZeitnahme\b|\bTransponder\b|\bSiegerehrung\b|$)/i.exec(text||'');
      if(first){
        const start=first[1].replace('.',':').padStart(5,'0');
        const n=raceName(first[2]); if(n)out.push({start,name:n});
        const tail=(text||'').slice(first.index+first[0].length);
        const re=/\bnext\s+Race\s+(.+?)(?=\bnext\s+Race\b|\bZeitnahme\b|\bTransponder\b|\bnext\s*-\s*\d|\bSiegerehrung\b|$)/ig;
        let m; while((m=re.exec(tail))){const rn=raceName(m[1]);if(rn&&!out.some(x=>x.name===rn))out.push({start,name:rn});}
      }
      return out;
    }

    function loadPdfJs(){
      if(w.pdfjsLib)return Promise.resolve(w.pdfjsLib);
      return new Promise((resolve,reject)=>{
        const s=d.createElement('script');
        s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload=()=>{w.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';resolve(w.pdfjsLib)};
        s.onerror=()=>reject(new Error('PDF.js konnte nicht geladen werden'));
        d.head.appendChild(s);
      });
    }

    async function inspect(file){
      const lib=await loadPdfJs();
      const pdf=await lib.getDocument({data:await file.arrayBuffer()}).promise;
      const days=[],raceChains=[];
      for(let p=1;p<=pdf.numPages;p++){
        const page=await pdf.getPage(p),tc=await page.getTextContent();
        const text=(tc.items||[]).map(it=>clean(it.str)).filter(Boolean).join(' ');
        const pd=daysInText(text);
        pd.forEach(day=>{if(!days.includes(day))days.push(day)});
        raceChains.push({days:pd,races:racesInText(text)});
      }
      return{days,raceChains};
    }

    /* Wir halten den ersten Datei-Change kurz an, lesen erst die Wochentage/Rennfolge
       zuverlässig aus und lassen danach den eigentlichen Parser mit derselben Datei laufen. */
    d.addEventListener('change',async function(ev){
      const input=ev.target;
      if(!input||input.id!=='schedulePdfFile'||!input.files||!input.files[0])return;
      if(redispatching){redispatching=false;return;}
      ev.preventDefault();ev.stopImmediatePropagation();
      try{metadata=await inspect(input.files[0]);console.info('[Parser prefilter]',metadata)}catch(err){console.warn('[Parser prefilter]',err);metadata=null}
      redispatching=true;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    },true);

    /* Storage.prototype statt storage.setItem überschreiben: Storage-Methoden lassen sich
       browserabhängig nicht zuverlässig direkt auf der localStorage-Instanz ersetzen. */
    const proto=w.Storage&&w.Storage.prototype;
    if(!proto)return;
    const originalSetItem=proto.setItem;
    if(originalSetItem.__upperPrefilter)return;

    function patchedSetItem(key,value){
      if(this===w.localStorage&&key==='upper_schedule_days'){
        try{
          const parsed=JSON.parse(value||'{}');
          const oldKeys=Object.keys(parsed),out={};
          const detected=(metadata&&metadata.days)||[];

          oldKeys.forEach((oldKey,idx)=>{
            let day=oldKey;
            if(!day||/^Tag\s*\d+$/i.test(day)||day==='📅')day=detected[idx]||day||('Tag '+(idx+1));
            const src=Array.isArray(parsed[oldKey])?parsed[oldKey].slice():[];

            /* Doppelte Abend-Anmeldung entfernen, Morgen-Anmeldung bleibt erhalten. */
            let eveningSeen=false;
            let cleaned=src.filter(item=>{
              if(item&&item.group==='Anmeldung'&&minutes(item.start)>=17*60){if(eveningSeen)return false;eveningSeen=true;}
              return true;
            });

            /* Fehlende 'next Race'-Folge ergänzen. Die Folge gehört zur ersten fix
               terminierten Rennstartzeit des betreffenden Tages. */
            const chain=(metadata&&metadata.raceChains||[]).find(c=>c.days&&c.days.includes(day));
            if(chain&&chain.races&&chain.races.length>1){
              const base=cleaned.find(x=>x&&x.type==='race');
              const start=base&&base.start?base.start:chain.races[0].start;
              let seq=1;
              chain.races.slice(1).forEach(r=>{
                if(!cleaned.some(x=>x&&x.type==='race'&&String(x.title||'').toLowerCase().includes(r.name.toLowerCase().replace(' race','')))){
                  cleaned.push({start,end:'',title:r.name,group:'Rennen',type:'race',sequence:seq++});
                }
              });
              cleaned.sort((a,b)=>minutes(a.start)-minutes(b.start)||(a.sequence||0)-(b.sequence||0));
            }

            if(out[day])out[day]=out[day].concat(cleaned);else out[day]=cleaned;
          });
          value=JSON.stringify(out);
        }catch(err){console.warn('[Parser prefilter] cleanup failed',err)}
      }
      return originalSetItem.call(this,key,value);
    }
    patchedSetItem.__upperPrefilter=true;
    proto.setItem=patchedSetItem;
  });
})();