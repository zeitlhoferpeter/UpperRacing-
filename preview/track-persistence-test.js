(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const select=d.getElementById('trackSelect');
    if(!select)return;

    const KEY='upper_selected_track';
    const stored=w.localStorage.getItem(KEY);
    const valid=[...select.options].some(o=>o.value===stored);

    if(valid&&select.value!==stored){
      select.value=stored;
      if(typeof w.onTrackChange==='function')w.onTrackChange();
      else select.dispatchEvent(new Event('change',{bubbles:true}));
    }

    select.addEventListener('change',function(){
      if(select.value)w.localStorage.setItem(KEY,select.value);
    });

    // Falls andere UI-Teile onTrackChange direkt aufrufen, ebenfalls speichern.
    if(typeof w.onTrackChange==='function'&&!w.__upperTrackPersistenceWrapped){
      const original=w.onTrackChange;
      w.onTrackChange=function(){
        const live=d.getElementById('trackSelect');
        if(live&&live.value)w.localStorage.setItem(KEY,live.value);
        return original.apply(this,arguments);
      };
      w.__upperTrackPersistenceWrapped=true;
    }
  });
})();
