(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  let mounting=false;
  async function mountCloud(){
    const d=frame.contentDocument;
    if(!d||!d.getElementById('pageBackup')||d.getElementById('upperCloudV2')||mounting)return;
    mounting=true;
    try{
      const res=await fetch('../preview/cloud-sync-v2-test.js?mountfix=20260818-1',{cache:'no-store'});
      if(!res.ok)throw new Error('Cloud-Modul HTTP '+res.status);
      const code=await res.text();
      const s=document.createElement('script');
      s.textContent=code+'\n//# sourceURL=../preview/cloud-sync-v2-test.js?mounted';
      document.head.appendChild(s);
      setTimeout(function(){
        const dd=frame.contentDocument;
        if(dd&&!dd.getElementById('upperCloudV2'))console.warn('[UpperRacing] Cloud UI konnte nicht gemountet werden');
      },300);
    }catch(err){
      console.error('[UpperRacing] Cloud Mount Fix',err);
    }finally{
      mounting=false;
    }
  }

  frame.addEventListener('load',function(){setTimeout(mountCloud,80)});
  setTimeout(mountCloud,250);
})();
