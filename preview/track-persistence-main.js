(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d||d.__upperTrackPersistenceMain)return;
    d.__upperTrackPersistenceMain=true;

    const select=d.getElementById('trackSelect');
    if(!select)return;

    const saved=w.localStorage.getItem('upper_selected_track');
    const savedIsValid=!!(saved&&[...select.options].some(o=>o.value===saved));
    if(savedIsValid){
      select.value=saved;
    }

    const original=w.onTrackChange;
    if(typeof original==='function'){
      w.onTrackChange=function(){
        const live=d.getElementById('trackSelect');
        if(live)w.localStorage.setItem('upper_selected_track',live.value);
        return original.apply(this,arguments);
      };
      // InitApp ist bereits gelaufen, daher den gespeicherten Stand einmal anwenden.
      w.onTrackChange();
    }else{
      w.localStorage.setItem('upper_selected_track',select.value);
      select.addEventListener('change',()=>w.localStorage.setItem('upper_selected_track',select.value));
    }

    // Wetter-Fix: Wenn die gespeicherte Strecke beim Start wiederhergestellt wurde,
    // nach Abschluss aller Load-Initialisierungen einmal den normalen Change-Zyklus
    // auslösen. So liest das Wetter die finale Strecke statt des frühen Defaults.
    if(savedIsValid){
      setTimeout(function(){
        const live=d.getElementById('trackSelect');
        if(!live)return;
        if(live.value!==saved)live.value=saved;
        live.dispatchEvent(new Event('change',{bubbles:true}));
      },1200);
    }
  });
})();
