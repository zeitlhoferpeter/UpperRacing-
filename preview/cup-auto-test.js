(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const CUPS_PAGE='https://www.stardesignracing.com/cups';
    const CACHE_KEY='upper_cup_auto_url';
    const CACHE_META_KEY='upper_cup_auto_meta';
    const MANUAL_KEY='cupUrl';
    const TIMEOUT_MS=4500;
    let checking=false;
    let lastCheck=0;

    function absoluteUrl(href){
      try{return new URL(href,CUPS_PAGE).toString()}catch(_){return''}
    }

    function parseCurrentStandingsLink(html){
      const doc=new DOMParser().parseFromString(html,'text/html');
      const links=Array.from(doc.querySelectorAll('a[href]'));

      // Primärquelle: exakt der blaue Stardesign-Link "Jahreswertung" oben auf /cups.
      const exact=links.find(a=>/^jahreswertung$/i.test((a.textContent||'').trim())) ||
                  links.find(a=>/jahreswertung/i.test((a.textContent||'').trim()));
      if(exact){
        const url=absoluteUrl(exact.getAttribute('href'));
        if(url)return{url,label:(exact.textContent||'Jahreswertung').trim(),source:'Jahreswertung'};
      }

      // Nur als Notfall, falls Stardesign die Beschriftung später leicht ändert.
      const scored=links.map(a=>{
        const text=(a.textContent||'').trim();
        const href=a.getAttribute('href')||'';
        let score=0;
        if(/jahres|gesamt.*wertung|cup.*wertung|wertung/i.test(text))score+=5;
        if(/cup/i.test(text))score+=2;
        if(/\.pdf(?:$|\?)/i.test(href))score+=2;
        if(/wp-content\/uploads/i.test(href))score+=1;
        if(/ausschreibung|reglement/i.test(text))score-=7;
        return{text,href,score};
      }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);

      if(scored[0]){
        const url=absoluteUrl(scored[0].href);
        if(url)return{url,label:scored[0].text||'Cup-Wertung',source:'Fallback'};
      }
      return null;
    }

    function yearFromUrl(url){
      const m=String(url||'').match(/(?:19|20)\d{2}/g);
      return m&&m.length?m[m.length-1]:'';
    }

    function currentFallback(){
      return w.localStorage.getItem(CACHE_KEY)||w.localStorage.getItem(MANUAL_KEY)||w.DEFAULT_CUP_URL||'';
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
      status.innerHTML='<strong style="color:#ffd400">AUTO</strong> Jahreswertung wird erst beim Öffnen von Cup geprüft – der App-Start bleibt schnell.';
      box.appendChild(status);
      return status;
    }

    function setStatus(text,state){
      const el=ensureStatusUi();if(!el)return;
      const color=state==='ok'?'#9fd56c':state==='error'?'#ff8b78':'#ffd400';
      el.innerHTML='<strong style="color:'+color+'">AUTO</strong> '+text;
    }

    function fetchWithTimeout(url){
      const controller=typeof AbortController!=='undefined'?new AbortController():null;
      let timer=null;
      if(controller)timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
      return w.fetch(url,{cache:'no-store',signal:controller?controller.signal:undefined})
        .finally(()=>{if(timer)clearTimeout(timer)});
    }

    async function refreshCupUrl(opts){
      opts=opts||{};
      if(checking)return currentFallback();
      const now=Date.now();
      if(!opts.force && now-lastCheck<30000)return currentFallback();
      checking=true;lastCheck=now;
      const input=d.getElementById('cupUrlInput');
      setStatus('Prüfe den Stardesign-Link „Jahreswertung“ …','loading');
      try{
        const res=await fetchWithTimeout(CUPS_PAGE);
        if(!res.ok)throw new Error('HTTP '+res.status);
        const html=await res.text();
        const found=parseCurrentStandingsLink(html);
        if(!found||!found.url)throw new Error('Kein Jahreswertungs-Link gefunden');

        w.localStorage.setItem(CACHE_KEY,found.url);
        w.localStorage.setItem(CACHE_META_KEY,JSON.stringify({url:found.url,label:found.label,source:found.source,checkedAt:new Date().toISOString()}));
        if(input)input.value=found.url;
        const yr=yearFromUrl(found.url);
        setStatus('Jahreswertung gefunden'+(yr?' · '+yr:'')+' · Link automatisch aktuell.','ok');
        return found.url;
      }catch(err){
        console.warn('[Cup Auto] Aktualisierung fehlgeschlagen:',err);
        const fallback=currentFallback();
        if(input&&fallback)input.value=fallback;
        setStatus('Stardesign-Prüfung derzeit nicht erreichbar – gespeicherter Link wird verwendet.','error');
        return fallback;
      }finally{
        checking=false;
      }
    }

    // loadCupUrl bleibt bewusst lokal/schnell. Keine Netzabfrage mehr während initApp().
    const originalLoad=w.loadCupUrl;
    w.loadCupUrl=function(){
      if(typeof originalLoad==='function')originalLoad.apply(this,arguments);
      ensureStatusUi();
      const fallback=currentFallback();
      const input=d.getElementById('cupUrlInput');
      if(input&&fallback)input.value=fallback;
    };

    const originalSave=w.saveCupUrl;
    w.saveCupUrl=function(){
      if(typeof originalSave==='function')originalSave.apply(this,arguments);
      setStatus('Manueller Link als Fallback gespeichert.','ok');
    };

    // Erst wenn der Benutzer wirklich in Cup wechselt, wird im Hintergrund geprüft.
    const originalSwitch=w.switchPage;
    if(typeof originalSwitch==='function'){
      w.switchPage=function(page){
        const result=originalSwitch.apply(this,arguments);
        if(page==='cup')setTimeout(()=>refreshCupUrl(),60);
        return result;
      };
    }

    // Beim Öffnen wird nochmals geprüft. Das Fenster wird sofort erzeugt, damit Android
    // den späteren Redirect nach der asynchronen Prüfung nicht als Popup blockiert.
    w.openCupInBrowser=function(){
      let popup=null;
      try{popup=w.open('about:blank','_blank')}catch(_){popup=null}
      refreshCupUrl({force:true}).then(function(url){
        if(!url){if(popup)popup.close();return}
        try{
          if(popup)popup.location.href=url;
          else w.location.href=url;
        }catch(_){w.open(url,'_blank')}
      });
    };

    w.upperCupAutoTest={refresh:refreshCupUrl,parse:parseCurrentStandingsLink};
    setTimeout(ensureStatusUi,700);
  });
})();
