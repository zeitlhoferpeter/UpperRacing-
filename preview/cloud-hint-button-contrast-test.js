(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const d=frame.contentDocument;
    if(!d||d.__upperCloudHintContrast)return;
    d.__upperCloudHintContrast=true;

    function fixButton(){
      const buttons=d.querySelectorAll('#ucModal button');
      buttons.forEach(function(btn){
        if((btn.textContent||'').trim()==='Cloud aktivieren'){
          btn.style.setProperty('color','#111','important');
          btn.style.setProperty('font-weight','900','important');
          btn.style.setProperty('opacity','1','important');
          btn.style.setProperty('-webkit-text-fill-color','#111','important');
        }
      });
    }

    fixButton();
    const obs=new MutationObserver(fixButton);
    obs.observe(d.body,{childList:true,subtree:true});
  });
})();
