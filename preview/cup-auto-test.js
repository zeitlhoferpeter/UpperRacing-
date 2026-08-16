(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  function init(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d||w.__upperCupAutoInitialized)return;
    w.__upperCupAutoInitialized=true;

    const CUPS_PAGE='https://www.stardesignracing.com/cups';
    const WORKER_BASE='https://upperracing-stardesign.zeitlhofer-peter.workers.dev';
    const CACHE_KEY='upper_cup_auto_url';
    const CACHE_META_KEY='upper_cup_auto_meta';
    const MANUAL_KEY='cupUrl';
    const FRESH_MS=15*60*1000;
    let refreshPromise=null;

    function absoluteUrl(href){try{return new URL(href,CUPS_PAGE).toString()}catch(_){return''}}
    function parseCurrentStandingsLink(html){
      const doc=new DOMParser().parseFromString(html,'text/html');
      const links=Array.from(doc.querySelectorAll('a[href]'));
      const exact=links.find(a=>/^jahreswertung$/i.test((a.textContent||'').trim()));
      if(exact){const url=absoluteUrl(exact.getAttribute('href'));if(url)return{url,label:'Jahreswertung',source:'Jahreswertung'}}
      const similar=links.find(a=>/jahreswertung/i.test((a.textContent||'').trim()));
      if(similar){const url=absoluteUrl(similar.getAttribute('href'));if(url)return{url,label:(similar.textContent||'Jahreswertung').trim(),source:'Jahreswertung-Fallback'}}
      return null;
    }
    function yearFromUrl(url){const m=String(url||'').match(/(?:19|20)\d{2}/g);return m&&m.length?m[m.length-1]:''}
    function readMeta(){try{return JSON.parse(w.localStorage.getItem(CACHE_META_KEY)||'null')}catch(_){return null}}
    function isFresh(){const meta=readMeta();if(!meta||!meta.checkedAt)return false;const t=new Date(meta.checkedAt).getTime();return Number.isFinite(t)&&(Date.now()-t)<FRESH_MS}
    function timeLabel(iso){if(!iso)return'';const dt=new Date(iso);if(!Number.isFinite(dt.getTime()))return'';return dt.toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit'})}
    function fallbackUrl(){return w.localStorage.getItem(CACHE_KEY)||w.localStorage.getItem(MANUAL_KEY)||w.DEFAULT_CUP_URL||''}

    function styleCupPage(){
      const page=d.getElementById('pageCup'); if(!page)return;
      const box=page.querySelector('.setup-box'); if(!box)return;
      const title=box.querySelector('h3'); if(title)title.textContent='Cup-Jahreswertung';
      const intro=box.querySelector('p'); if(intro)intro.textContent='Aktuelle Jahreswertung direkt von Stardesign.';
      const input=d.getElementById('cupUrlInput');
      if(input){
        const wrap=input.parentElement;
        const label=wrap&&wrap.querySelector('label'); if(label)label.textContent='Fallback-Link';
        if(wrap){wrap.style.opacity='.55';wrap.style.marginTop='16px'}
      }
      const openBtn=page.querySelector('button[onclick*="openCupInBrowser"]');
      const saveBtn=page.querySelector('button[onclick*="saveCupUrl"]');
      const actions=openBtn&&openBtn.parentElement;
      if(actions){actions.style.display='flex';actions.style.flexDirection='column';actions.style.gap='8px'}
      if(openBtn){
        openBtn.textContent='🏆 Jahreswertung öffnen ↗';
        openBtn.style.order='-1';openBtn.style.width='100%';openBtn.style.flex='none';
        openBtn.style.background='#ffd400';openBtn.style.color='#0b0b0b';openBtn.style.fontWeight='900';
        openBtn.style.fontSize='1rem';openBtn.style.padding='14px 12px';openBtn.style.borderRadius='8px';
      }
      if(saveBtn){
        saveBtn.textContent='Fallback-Link speichern';saveBtn.style.width='100%';saveBtn.style.flex='none';
        saveBtn.style.background='#2a2a2a';saveBtn.style.color='#aaa';saveBtn.style.fontSize='.78rem';saveBtn.style.padding='9px';
      }
    }

    function ensureStatusUi(){
      const input=d.getElementById('cupUrlInput');if(!input)return null;
      const box=input.parentElement;if(!box)return null;
      let status=d.getElementById('upperCupAutoStatus');if(status)return status;
      status=d.createElement('div');status.id='upperCupAutoStatus';
      status.style.cssText='margin:10px 0 0;padding:8px 9px;border:1px solid #353535;border-radius:7px;background:#171717;color:#aaa;font-size:.68rem;line-height:1.35;';
      status.innerHTML='<strong style="color:#ffd400">AUTO</strong> Jahreswertung wird geprüft.';
      box.appendChild(status);return status;
    }
    function setStatus(text,state){const el=ensureStatusUi();if(!el)return;const color=state==='ok'?'#9fd56c':state==='error'?'#ff8b78':'#ffd400';el.innerHTML='<strong style="color:'+color+'">AUTO</strong> '+text}
    function showCachedStatus(){const meta=readMeta();if(meta&&meta.checkedAt){const yr=yearFromUrl(meta.url||fallbackUrl());setStatus('Jahreswertung'+(yr?' · '+yr:'')+' · zuletzt geprüft '+timeLabel(meta.checkedAt)+'.','ok')}else setStatus('Prüfung läuft …','loading')}

    async function fetchCupsPage(){
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),4500);
      try{
        const proxied=WORKER_BASE+'/proxy?url='+encodeURIComponent(CUPS_PAGE);
        const res=await window.fetch(proxied,{cache:'no-store',signal:controller.signal});
        if(!res.ok)throw new Error('Proxy HTTP '+res.status);
        return await res.text();
      }finally{clearTimeout(timer)}
    }

    function refreshCupUrl(force){
      if(!force&&isFresh()){
        const cached=fallbackUrl(),input=d.getElementById('cupUrlInput');if(input&&cached)input.value=cached;
        showCachedStatus();return Promise.resolve(cached);
      }
      if(refreshPromise)return refreshPromise;
      const input=d.getElementById('cupUrlInput');setStatus('Prüfe aktuellen Stardesign-Link …','loading');
      refreshPromise=(async function(){
        try{
          const html=await fetchCupsPage();const found=parseCurrentStandingsLink(html);
          if(!found||!found.url)throw new Error('Jahreswertung nicht gefunden');
          const meta={url:found.url,label:found.label,source:found.source,checkedAt:new Date().toISOString()};
          w.localStorage.setItem(CACHE_KEY,found.url);w.localStorage.setItem(CACHE_META_KEY,JSON.stringify(meta));if(input)input.value=found.url;
          const yr=yearFromUrl(found.url);setStatus('Jahreswertung'+(yr?' · '+yr:'')+' · geprüft '+timeLabel(meta.checkedAt)+'.','ok');return found.url;
        }catch(err){
          console.warn('[Cup Auto] Proxy-Prüfung fehlgeschlagen:',err);const fallback=fallbackUrl();if(input&&fallback)input.value=fallback;
          setStatus('Online-Prüfung derzeit nicht möglich – letzter Link bleibt verfügbar.','error');return fallback;
        }finally{refreshPromise=null}
      })();return refreshPromise;
    }

    const originalSave=w.saveCupUrl;
    w.saveCupUrl=function(){if(typeof originalSave==='function')originalSave.apply(this,arguments);setStatus('Fallback-Link gespeichert.','ok')};
    const originalLoad=w.loadCupUrl;
    w.loadCupUrl=function(){if(typeof originalLoad==='function')originalLoad.apply(this,arguments);const cached=fallbackUrl(),input=d.getElementById('cupUrlInput');if(input&&cached)input.value=cached};

    w.openCupInBrowser=function(){
      const url=fallbackUrl();
      if(url)w.open(url,'_blank');
      else refreshCupUrl(false).then(function(found){if(found)w.open(found,'_blank')});
    };

    w.upperCupAutoTest={
      refresh:function(){return refreshCupUrl(true)},
      activate:function(){styleCupPage();ensureStatusUi();const cached=fallbackUrl(),input=d.getElementById('cupUrlInput');if(input&&cached)input.value=cached;setTimeout(function(){refreshCupUrl(false)},0)},
      parse:parseCurrentStandingsLink
    };

    styleCupPage();
  }

  if(frame.contentDocument&&frame.contentDocument.readyState==='complete')init();
  else frame.addEventListener('load',init,{once:true});
})();