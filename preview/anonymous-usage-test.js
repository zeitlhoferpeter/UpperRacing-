(function(){
  'use strict';

  const SUPABASE_URL='https://qdujqoexesztcmfljlap.supabase.co';
  const SUPABASE_KEY='sb_publishable_7wW-Ayw3KSucm4-yMIP3FA_bd3CmDuk';
  const DEVICE_KEY='upper_anon_device_id_v1';
  const LAST_PING_KEY='upper_anon_device_last_ping_v1';
  const MIN_PING_INTERVAL=15*60*1000;

  function installed(){
    try{
      return !!((window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true);
    }catch(_){return false}
  }

  function uuid(){
    try{
      if(crypto&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
      if(crypto&&typeof crypto.getRandomValues==='function'){
        const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
        bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
        return [...bytes].map((b,i)=>(i===4||i===6||i===8||i===10?'-':'')+b.toString(16).padStart(2,'0')).join('');
      }
    }catch(_){ }
    return null;
  }

  function getDeviceId(){
    try{
      let id=localStorage.getItem(DEVICE_KEY);
      if(id)return id;
      id=uuid();
      if(!id)return null;
      localStorage.setItem(DEVICE_KEY,id);
      return id;
    }catch(_){return null}
  }

  function due(force){
    if(force)return true;
    try{
      const last=Number(localStorage.getItem(LAST_PING_KEY)||0);
      return !last||Date.now()-last>=MIN_PING_INTERVAL;
    }catch(_){return true}
  }

  async function ping(force){
    if(!due(force))return;
    const id=getDeviceId();
    if(!id)return;
    try{
      const res=await fetch(SUPABASE_URL+'/rest/v1/rpc/record_app_device',{
        method:'POST',
        headers:{
          'apikey':SUPABASE_KEY,
          'Authorization':'Bearer '+SUPABASE_KEY,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({p_device_id:id,p_channel:'test',p_installed:installed()}),
        keepalive:true
      });
      if(res.ok){
        try{localStorage.setItem(LAST_PING_KEY,String(Date.now()))}catch(_){ }
      }
    }catch(_){
      // Tracking must never affect UpperRacing.
    }
  }

  ping(false);
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')ping(false)});
  window.addEventListener('pageshow',function(){ping(false)});
})();
