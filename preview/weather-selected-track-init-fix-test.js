(function(){
  'use strict';

  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d||d.__upperWeatherTrackInitFixTest)return;
    d.__upperWeatherTrackInitFixTest=true;

    const select=d.getElementById('trackSelect');
    if(!select)return;

    const saved=w.localStorage.getItem('upper_selected_track');
    if(!saved||![...select.options].some(function(o){return o.value===saved}))return;

    // Track persistence has already restored the saved track at this point.
    // Trigger one normal change cycle so the weather module refreshes from
    // the final selected track instead of an earlier default value.
    setTimeout(function(){
      const live=d.getElementById('trackSelect');
      if(!live)return;
      if(live.value!==saved)live.value=saved;
      live.dispatchEvent(new Event('change',{bubbles:true}));
    },1200);
  });
})();
