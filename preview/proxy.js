(function(){
  const WORKER_BASE='https://upperracing-stardesign.zeitlhofer-peter.workers.dev';
  const originalFetch=window.fetch.bind(window);

  function shouldProxy(raw){
    try{
      const u=new URL(typeof raw==='string'?raw:raw.url, window.location.href);
      return u.protocol==='https:' && (u.hostname==='stardesignracing.com' || u.hostname==='www.stardesignracing.com');
    }catch(e){
      return false;
    }
  }

  window.fetch=function(input, init){
    if(!shouldProxy(input)) return originalFetch(input, init);

    const target=new URL(typeof input==='string'?input:input.url, window.location.href).toString();
    const proxied=WORKER_BASE+'/proxy?url='+encodeURIComponent(target);
    const nextInit=Object.assign({}, init||{});
    nextInit.method='GET';
    delete nextInit.body;
    delete nextInit.mode;
    delete nextInit.credentials;
    return originalFetch(proxied, nextInit);
  };

  window.UPPERRACING_STARDESIGN_PROXY=WORKER_BASE;
})();
