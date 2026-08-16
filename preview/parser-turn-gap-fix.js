(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow;
    if(!w||!w.Storage||!w.Storage.prototype)return;

    function toMinutes(time){
      const m=String(time||'').trim().replace('.',':').match(/^(\d{1,2}):(\d{2})$/);
      if(!m)return NaN;
      const h=Number(m[1]),min=Number(m[2]);
      if(!Number.isFinite(h)||!Number.isFinite(min)||h<0||h>23||min<0||min>59)return NaN;
      return h*60+min;
    }

    function toTime(total){
      const h=Math.floor(total/60)%24,min=total%60;
      return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0');
    }

    function repairDays(days){
      if(!days||typeof days!=='object'||Array.isArray(days))return{days,changed:false};
      let changed=false;
      const repaired={};

      Object.keys(days).forEach(function(dayName){
        const source=Array.isArray(days[dayName])?days[dayName]:[];
        const items=source.map(function(item){return item&&typeof item==='object'?Object.assign({},item):item});
        const turns=items.filter(function(item){
          return item&&item.type==='turn'&&/^[ABCD]$/.test(String(item.group||''))&&Number.isFinite(toMinutes(item.start));
        }).sort(function(a,b){return toMinutes(a.start)-toMinutes(b.start)});

        const hasGroupB=turns.some(function(item){return item.group==='B'});
        if(hasGroupB){
          for(let i=0;i+2<turns.length;i++){
            const a=turns[i],c=turns[i+1],d=turns[i+2];
            if(a.group!=='A'||c.group!=='C'||d.group!=='D')continue;

            const aStart=toMinutes(a.start),cStart=toMinutes(c.start),dStart=toMinutes(d.start);
            const gapAC=cStart-aStart,gapCD=dStart-cStart;

            // Stardesign-Seiten mit zwei nebeneinanderliegenden Tagen können beim
            // PDF-Textlayout genau die erste B-Zeile mit der A-Zeile verschmelzen.
            // Ein echtes A-B-C-D-Raster erkennt man daran, dass A->C exakt doppelt
            // so groß ist wie C->D. Nur diesen eindeutigen Fall reparieren wir.
            if(gapCD<10||gapCD>30||gapAC!==gapCD*2)continue;

            const bStart=aStart+gapCD;
            const bTime=toTime(bStart);
            const alreadyThere=turns.some(function(item){return item.group==='B'&&toMinutes(item.start)===bStart});
            if(alreadyThere)continue;

            const aInItems=items.find(function(item){return item&&item.type==='turn'&&item.group==='A'&&item.start===a.start});
            if(aInItems)aInItems.end=bTime;

            items.push({
              start:bTime,
              end:c.start,
              title:'Freies Fahren Gruppe B',
              group:'B',
              type:'turn',
              sequence:''
            });
            changed=true;
          }
        }

        repaired[dayName]=items.sort(function(a,b){
          const am=toMinutes(a&&a.start),bm=toMinutes(b&&b.start);
          if(Number.isFinite(am)&&Number.isFinite(bm)&&am!==bm)return am-bm;
          return Number(a&&a.sequence||0)-Number(b&&b.sequence||0);
        });
      });

      return{days:repaired,changed:changed};
    }

    const proto=w.Storage.prototype;
    const previousSetItem=proto.setItem;
    if(previousSetItem&&previousSetItem.__upperTurnGapFix)return;

    function patchedSetItem(key,value){
      if(this===w.localStorage&&key==='upper_schedule_days'){
        try{
          const result=repairDays(JSON.parse(value||'{}'));
          value=JSON.stringify(result.days);
          if(result.changed)console.info('[UpperRacing] Fehlenden B-Turn aus eindeutigem A-C-D-Raster ergänzt.');
        }catch(err){
          console.warn('[UpperRacing B-Turn Fix] Korrektur übersprungen:',err);
        }
      }
      return previousSetItem.call(this,key,value);
    }
    patchedSetItem.__upperTurnGapFix=true;
    proto.setItem=patchedSetItem;

    // Bereits geladene Test-Zeitpläne ebenfalls einmal korrigieren, damit zum Testen
    // nicht zwingend erneut importiert werden muss.
    try{
      const raw=w.localStorage.getItem('upper_schedule_days');
      if(raw){
        const result=repairDays(JSON.parse(raw));
        if(result.changed){
          previousSetItem.call(w.localStorage,'upper_schedule_days',JSON.stringify(result.days));
          console.info('[UpperRacing] Bestehenden Zeitplan um fehlenden B-Turn ergänzt.');
        }
      }
    }catch(err){
      console.warn('[UpperRacing B-Turn Fix] Bestehender Zeitplan konnte nicht geprüft werden:',err);
    }
  });
})();