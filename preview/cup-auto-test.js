(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const CUPS_PAGE='https://www.stardesignracing.com/cups';
    const WORKER_BASE='https://upperracing-stardesign.zeitlhofer-peter.workers.dev';
    const CACHE_KEY='upper_cup_auto_url';
    const CACHE_META_KEY='upper_cup_auto_meta';
    const MANUAL_KEY='cupUrl';

    function absoluteUrl(href){
      try{return new URL(href,CUPS_PAGE).toString()}catch(_){return''}
    }

    function parseCurrentStandingsLink(html){
      const doc=new DOMParser().parseFromString(html,'text/html');
      const links=Array.from(doc.querySelectorAll('a[href]'));

      // Exakt der blaue Stardesign-Link "Jahreswertung" ist die Primärquelle.
      const exact=links.find(a=>/^jahreswertung$/i.test((a.textContent||'').trim()));
      if(exact){
        const url=absoluteUrl(exact.getAttribute('href'));
        if(url)return{url,label:'Jahreswertung',source:'Jahreswertung'};
      }

      // Nur als Reserve, falls Stardesign die Beschriftung leicht verändert.
      const similar=links.find(a=>/jahreswertung/i.test((a.textContent||'').trim()));
      if(similar){
        const url=absoluteUrl(similar.getAttribute('href'));
        if(url)return{url,label:(similar.textContent||'Jahreswertung').trim(),source:'Jahreswertung-Fallback'};
      }
      return null;
    }

    function yearFromUrl(url){
      const m=String(url||'').match(/(?:19|20)\d{2}/g);
      return m&&m.length?m[m.length-1]:'';
    }

    function ensureStatusUi(){
      const input=d.getElementById('cupUrlInput');
      if(!input)return null;
      const box=input.parentElement;
      if(!box)return null;
      let status=d.getElementById('upperCupAutoStatus');
      if(status)return status;

      status=d.createElement('div');
      status.id='upperCupAutoStatus';
      status.style.cssText='margin-top:7px;padding:8px 9px;border:1px solid #3d3d3d;border-radius:7px;background:#171717;color:#aaa;font-size:.68rem;line-height:1.35;';
      status.innerHTML='<strong style="color:#ffd400">AUTO</strong> Jahreswertung wird beim Öffnen automatisch bei Stardesign geprüft.';
      box.appendChild(status);
      return status;
    }

    function setStatus(text,state){
      const el=ensureStatusUi();if(!el)return;
      const color=state==='ok'?'#9fd56c':state==='error'?'#ff8b78':'#ffd400';
      el.innerHTML='<strong style="color:'+color+'">AUTO</strong> '+text;
    }

    function fallbackUrl(){
      return w.localStorage.getItem(CACHE_KEY)||w.localStorage.getItem(MANUAL_KEY)||w.DEFAULT_CUP_URL||'';
    }

    async function fetchCupsPage(){
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),4500);
      try{
        // Wichtig: direkt über den bestehenden Cloudflare-Worker laden.
        // Ein direkter iframe-Fetch auf Stardesign würde durch CORS blockiert.
        const proxied=WORKER_BASE+'/proxy?url='+encodeURIComponent(CUPS_PAGE);
        const res=await window.fetch(proxied,{cache:'no-store',signal:controller.signal});
        if(!res.ok)throw new Error('Proxy HTTP '+res.status);
        return await res.text();
      }finally{
        clearTimeout(timer);
      }
    }

    async function refreshCupUrl(){
      const input=d.getElementById('cupUrlInput');
      setStatus('Prüfe den aktuellen Jahreswertungs-Link …','loading');
      try{
        const html=await fetchCupsPage();
        const found=parseCurrentStandingsLink(html);
        if(!found||!found.url)throw new Error('Jahreswertung nicht gefunden');

        w.localStorage.setItem(CACHE_KEY,found.url);
        w.localStorage.setItem(CACHE_META_KEY,JSON.stringify({
          url:found.url,label:found.label,source:found.source,checkedAt:new Date().toISOString()
        }));
        if(input)input.value=found.url;

        const yr=yearFromUrl(found.url);
        setStatus('Jahreswertung gefunden'+(yr?' · '+yr:'')+' · Link ist aktuell.','ok');
        return found.url;
      }catch(err){
        console.warn('[Cup Auto] Proxy-Prüfung fehlgeschlagen:',err);
        const fallback=fallbackUrl();
        if(input&&fallback)input.value=fallback;
        setStatus('Aktualisierung gerade nicht möglich – letzter funktionierender Link wird verwendet.','error');
        return fallback;
      }
    }

    const originalSave=w.saveCupUrl;
    w.saveCupUrl=function(){
      if(typeof originalSave==='function')originalSave.apply(this,arguments);
      setStatus('Manueller Link als Notfall-Fallback gespeichert.','ok');
    };

    // Keine Online-Prüfung beim App-Start. Erst wenn der Cup-Bereich tatsächlich geöffnet wird.
    const originalSwitch=w.switchPage;
    if(typeof originalSwitch==='function'){
      w.switchPage=function(page){
        const result=originalSwitch.apply(this,arguments);
        if(page==='cup'){
          ensureStatusUi();
          setTimeout(refreshCupUrl,0);
        }
        return result;
      };
    }

    const originalLoad=w.loadCupUrl;
    w.loadCupUrl=function(){
      if(typeof originalLoad==='function')originalLoad.apply(this,arguments);
      ensureStatusUi();
      const cached=fallbackUrl();
      const input=d.getElementById('cupUrlInput');
      if(input&&cached)input.value=cached;
    };

    w.openCupInBrowser=function(){
      // Fenster sofort aus dem Nutzer-Klick öffnen, damit Android es nicht als Popup blockiert.
      const popup=w.open('about:blank','_blank');
      refreshCupUrl().then(function(url){
        if(url&&popup)popup.location.href=url;
        else if(popup)popup.close();
      });
    };

    w.upperCupAutoTest={refresh:refreshCupUrl,parse:parseCurrentStandingsLink};
    setTimeout(ensureStatusUi,1200);
  });
})();