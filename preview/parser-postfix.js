(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const DAY_PATTERNS=[
      ['Montag',/(?:Programm?\s*:?\s*)?(?:Montag\s*\/\s*Monday|Montag|Monday)/i],
      ['Dienstag',/(?:Programm?\s*:?\s*)?(?:Dienstag\s*\/\s*Tuesday|Dienstag|Tuesday)/i],
      ['Mittwoch',/(?:Programm?\s*:?\s*)?(?:Mittwoch\s*\/\s*Wednesday|Mittwoch|Wednesday)/i],
      ['Donnerstag',/(?:Programm?\s*:?\s*)?(?:Donnerstag\s*\/\s*Thursday|Donnerstag|Thursday)/i],
      ['Freitag',/(?:Programm?\s*:?\s*)?(?:Freitag\s*\/\s*Friday|Freitag|Friday|Fri\s*\/\s*day)/i],
      ['Samstag',/(?:Programm?\s*:?\s*)?(?:Samstag\s*\/\s*Saturday|Samstag|Saturday)/i],
      ['Sonntag',/(?:Programm?\s*:?\s*)?(?:Sonntag\s*\/\s*Sunday|Sonntag|Sunday)/i]
    ];

    let detectedDays=[];

    function uniqueDaysFromText(text){
      const found=[];
      DAY_PATTERNS.forEach(([name,re])=>{ if(re.test(text||'')) found.push(name); });
      return found;
    }

    async function detectDaysFromFile(file){
      try{
        if(!file)return;
        while(!w.pdfjsLib) await new Promise(r=>setTimeout(r,40));
        const pdf=await w.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
        const days=[];
        for(let p=1;p<=pdf.numPages;p++){
          const page=await pdf.getPage(p);
          const tc=await page.getTextContent();
          const text=(tc.items||[]).map(it=>String(it.str||'')).join(' ');
          uniqueDaysFromText(text).forEach(day=>{if(!days.includes(day))days.push(day)});
        }
        detectedDays=days;
        console.info('[Parser postfix] detected weekdays',detectedDays);
      }catch(err){console.warn('[Parser postfix] weekday detection failed',err)}
    }

    d.addEventListener('change',function(ev){
      const input=ev.target;
      if(input&&input.id==='schedulePdfFile'&&input.files&&input.files[0]) detectDaysFromFile(input.files[0]);
    },true);

    const storage=w.localStorage;
    const originalSetItem=storage.setItem.bind(storage);
    storage.setItem=function(key,value){
      if(key==='upper_schedule_days'){
        try{
          const parsed=JSON.parse(value||'{}');
          const oldKeys=Object.keys(parsed);
          const out={};

          oldKeys.forEach((oldKey,idx)=>{
            let day=oldKey;
            if(/^Tag\s*\d+$/i.test(day)||!day||day==='📅') day=detectedDays[idx]||day;

            const src=Array.isArray(parsed[oldKey])?parsed[oldKey]:[];
            let eveningRegistrationKept=false;
            const cleaned=[];

            src.forEach(item=>{
              if(item&&item.group==='Anmeldung'&&/^Anmeldung$/i.test(item.title||'')){
                const m=String(item.start||'').match(/^(\d{1,2}):(\d{2})$/);
                const mins=m?(+m[1])*60+(+m[2]):0;
                if(mins>=17*60){
                  if(eveningRegistrationKept)return;
                  eveningRegistrationKept=true;
                }
              }
              cleaned.push(item);
            });

            if(out[day]) out[day]=out[day].concat(cleaned);
            else out[day]=cleaned;
          });

          value=JSON.stringify(out);
        }catch(err){console.warn('[Parser postfix] cleanup failed',err)}
      }
      return originalSetItem(key,value);
    };
  });
})();