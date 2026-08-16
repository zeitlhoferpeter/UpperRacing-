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

    function absoluteUrl(href){
      try{return new URL(href,CUPS_PAGE).toString()}catch(_){return''}
    }

    function parseCurrentStandingsLink(html){
      const doc=new DOMParser().parseFromString(html,'text/html');
      const links=Array.from(doc.querySelectorAll('a[href]'));

      // Primärquelle: der von Stardesign selbst als "Jahreswertung" bezeichnete Link.
      const exact=links.find(a=>/jahreswertung/i.test((a.textContent||'').trim()));
      if(exact){
        const url=absoluteUrl(exact.getAttribute('href'));
        if(url)return{url,label:(exact.textContent||'Jahreswertung').trim(),source:'Jahreswertung'};
      }

      // Robuster Fallback, falls Stardesign die Bezeichnung leicht ändert.
      const scored=links.map(a=>{
        const text=(a.textContent||'').trim();
        const href=a.getAttribute('href')||'';
        let score=0;
        if(/jahres|gesamt.*wertung|cup.*wertung|wertung/i.test(text))score+=5;
        if(/cup/i.test(text))score+=2;
        if(/\.pdf(?:$|\?)/i.test(href))score+=2;
        if(/wp-content\/uploads/i.test(href))score+=1;
        if(/ausschreibung|reglement/i.test(text))score-=7;
        return{a,text,href,score};
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

    async function refreshCupUrl(opts){
      opts=opts||{};
      const input=d.getElementById('cupUrlInput');
      setStatus('Prüfe aktuelle Jahreswertung bei Stardesign …','loading');
      try{
        const res=await w.fetch(CUPS_PAGE,{cache:'no-store'});
        if(!res.ok)throw new Error('HTTP '+res.status);
        const html=await res.text();
        const found=parseCurrentStandingsLink(html);
        if(!found||!found.url)throw new Error('Kein Jahreswertungs-Link gefunden');

        w.localStorage.setItem(CACHE_KEY,found.url);
        const meta={url:found.url,label:found.label,source:found.source,checkedAt:new Date().toISOString()};
        w.localStorage.setItem(CACHE_META_KEY,JSON.stringify(meta));
        if(input)input.value=found.url;

        const yr=yearFromUrl(found.url);
        setStatus('Aktueller Stardesign-Link gefunden'+(yr?' · '+yr:'')+' · automatisch aktualisiert.','ok');
        return found.url;
      }catch(err){
        console.warn('[Cup Auto] Aktualisierung fehlgeschlagen:',err);
        const cached=w.localStorage.getItem(CACHE_KEY)||'';
        const manual=w.localStorage.getItem(MANUAL_KEY)||'';
        const fallback=cached||manual||w.DEFAULT_CUP_URL||'';
        if(input&&fallback)input.value=fallback;
        setStatus('Online-Prüfung nicht möglich – gespeicherter Link bleibt als Fallback aktiv.','error');
        return fallback;
      }
    }

    // Bestehende manuelle Speicherung bleibt als Notfall-Fallback erhalten.
    const originalSave=w.saveCupUrl;
    w.saveCupUrl=function(){
      if(typeof originalSave==='function')originalSave.apply(this,arguments);
      setStatus('Manueller Link als Fallback gespeichert. Beim nächsten Öffnen wird trotzdem zuerst Stardesign geprüft.','ok');
    };

    // Beim Öffnen des Cup-Bereichs automatisch die Quelle neu prüfen.
    const originalLoad=w.loadCupUrl;
    w.loadCupUrl=function(){
      if(typeof originalLoad==='function')originalLoad.apply(this,arguments);
      ensureStatusUi();
      refreshCupUrl();
    };

    // Auch der Öffnen-Button prüft unmittelbar vorher nochmals, damit kein alter Link geöffnet wird.
    w.openCupInBrowser=async function(){
      const url=await refreshCupUrl({force:true});
      if(url)w.open(url,'_blank');
    };

    w.upperCupAutoTest={refresh:refreshCupUrl,parse:parseCurrentStandingsLink};

    // Falls der Cup-Bereich beim Initialisieren bereits aufgebaut ist.
    setTimeout(ensureStatusUi,1200);
  });
})();
