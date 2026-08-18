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
    if(saved&&[...select.options].some(o=>o.value===saved)){
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
  });
})();
