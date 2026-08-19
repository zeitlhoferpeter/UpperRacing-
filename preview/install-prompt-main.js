(function(){
  const STORAGE_KEY='upper_install_hint_seen_v1';
  let deferredPrompt=null;

  function isStandalone(){
    return (window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;
  }
  function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent||'')}
  function alreadySeen(){try{return localStorage.getItem(STORAGE_KEY)==='true'}catch(_){return false}}
  function markSeen(){try{localStorage.setItem(STORAGE_KEY,'true')}catch(_){}}
  function removeModal(){const old=document.getElementById('upperInstallPrompt');if(old)old.remove()}

  function showModal(mode){
    if(isStandalone()||alreadySeen()||document.getElementById('upperInstallPrompt'))return;
    const wrap=document.createElement('div');
    wrap.id='upperInstallPrompt';
    wrap.style.cssText='position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.78);display:flex;align-items:flex-end;justify-content:center;padding:14px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif';
    const box=document.createElement('div');
    box.style.cssText='width:min(460px,100%);background:linear-gradient(160deg,#191919,#101010);border:1px solid #5a4d00;border-radius:18px;padding:17px;box-sizing:border-box;box-shadow:0 18px 50px rgba(0,0,0,.55);color:#fff';
    const ios=mode==='ios';
    box.innerHTML='<div style="font-size:.64rem;color:#ffd400;font-weight:900;letter-spacing:.9px;margin-bottom:5px">UPPERRACING</div>'+
      '<div style="font-size:1.12rem;font-weight:900;margin-bottom:8px">App installieren?</div>'+
      '<div style="font-size:.78rem;color:#bdbdbd;line-height:1.5;margin-bottom:14px">'+
      (ios?'Füge UpperRacing zu deinem Home-Bildschirm hinzu. Tippe in Safari auf <strong style="color:#fff">Teilen</strong> und danach auf <strong style="color:#fff">„Zum Home-Bildschirm“</strong>.':'Installiere UpperRacing wie eine normale App auf deinem Smartphone. Deine lokalen Daten bleiben dabei erhalten.')+
      '</div><div id="upperInstallActions" style="display:flex;gap:8px;flex-direction:column"></div>';
    const actions=box.querySelector('#upperInstallActions');

    if(!ios){
      const install=document.createElement('button');
      install.type='button';install.textContent='App installieren';
      install.style.cssText='width:100%;border:0;border-radius:10px;padding:12px;background:#ffd400;color:#0a0a0a;font-weight:900;font-size:.86rem;cursor:pointer';
      install.onclick=async function(){
        if(!deferredPrompt)return;
        try{
          deferredPrompt.prompt();
          const result=await deferredPrompt.userChoice;
          if(result&&result.outcome==='accepted')markSeen();
        }catch(_){ }
        deferredPrompt=null;removeModal();
      };
      actions.appendChild(install);
    }else{
      const ok=document.createElement('button');
      ok.type='button';ok.textContent='Verstanden';
      ok.style.cssText='width:100%;border:0;border-radius:10px;padding:12px;background:#ffd400;color:#0a0a0a;font-weight:900;font-size:.86rem;cursor:pointer';
      ok.onclick=function(){markSeen();removeModal()};
      actions.appendChild(ok);
    }

    const later=document.createElement('button');
    later.type='button';later.textContent='Später';
    later.style.cssText='width:100%;border:1px solid #3b3b3b;border-radius:10px;padding:11px;background:#202020;color:#ddd;font-weight:800;font-size:.8rem;cursor:pointer';
    later.onclick=function(){markSeen();removeModal()};
    actions.appendChild(later);

    wrap.appendChild(box);document.body.appendChild(wrap);
  }

  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault();
    deferredPrompt=e;
    if(!isStandalone()&&!alreadySeen())setTimeout(function(){showModal('android')},600);
  });

  window.addEventListener('appinstalled',function(){markSeen();removeModal();deferredPrompt=null});

  function maybeIOS(){
    if(isStandalone()||alreadySeen()||!isIOS())return;
    setTimeout(function(){showModal('ios')},1100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',maybeIOS,{once:true});else maybeIOS();
})();