(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  const SUPABASE_URL='https://qdujqoexesztcmfljlap.supabase.co';
  const SUPABASE_KEY='sb_publishable_7wW-Ayw3KSucm4-yMIP3FA_bd3CmDuk';
  const SDK_URL='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  const HINT_VERSION='2';
  const AUTOSAVE_DELAY=45000;
  const MAX_BACKUPS=5;

  let client=null,sdkPromise=null,currentUser=null,autosaveTimer=null,dirty=false,storagePatched=false;

  function loadSdk(){
    if(window.supabase&&window.supabase.createClient)return Promise.resolve(window.supabase);
    if(sdkPromise)return sdkPromise;
    sdkPromise=new Promise(function(resolve,reject){
      const s=document.createElement('script');s.src=SDK_URL;s.async=true;
      s.onload=function(){window.supabase&&window.supabase.createClient?resolve(window.supabase):reject(new Error('Supabase SDK nicht verfügbar'))};
      s.onerror=function(){sdkPromise=null;reject(new Error('Supabase SDK konnte nicht geladen werden'))};
      document.head.appendChild(s);
    });
    return sdkPromise;
  }

  async function getClient(){
    if(client)return client;
    const sdk=await loadSdk();
    client=sdk.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }

  function fmtDate(iso){
    if(!iso)return'—';
    const d=new Date(iso);if(!Number.isFinite(d.getTime()))return'—';
    return d.toLocaleString('de-AT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  }

  function ignoredKey(key){return !key||/^sb-/i.test(key)||/^supabase/i.test(key)||/^upper_cloud_/i.test(key)}

  function snapshot(w){
    const payload={version:2,saved_at:new Date().toISOString(),items:{}};
    for(let i=0;i<w.localStorage.length;i++){
      const key=w.localStorage.key(i);if(ignoredKey(key))continue;
      payload.items[key]=w.localStorage.getItem(key);
    }
    return payload;
  }

  function hasLocalData(w){
    for(let i=0;i<w.localStorage.length;i++){
      const key=w.localStorage.key(i);if(ignoredKey(key))continue;
      if(/^upper_|^baseline_|^curves_/i.test(key))return true;
    }
    return false;
  }

  function initKey(userId){return'upper_cloud_sync_initialized_'+userId}

  async function listBackups(){
    if(!currentUser)return[];
    const sb=await getClient();
    const q=await sb.from('user_backups').select('backup_id,created_at,updated_at,backup_type').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(MAX_BACKUPS);
    if(q.error)throw q.error;
    return q.data||[];
  }

  async function trimBackups(){
    if(!currentUser)return;
    const sb=await getClient();
    const q=await sb.from('user_backups').select('backup_id,created_at').eq('user_id',currentUser.id).order('created_at',{ascending:false});
    if(q.error)throw q.error;
    const extra=(q.data||[]).slice(MAX_BACKUPS).map(x=>x.backup_id);
    if(extra.length){const del=await sb.from('user_backups').delete().in('backup_id',extra);if(del.error)throw del.error}
  }

  async function saveBackup(w,type){
    if(!currentUser)return null;
    const sb=await getClient();
    const now=new Date().toISOString();
    const ins=await sb.from('user_backups').insert({user_id:currentUser.id,payload:snapshot(w),backup_type:type||'auto',created_at:now,updated_at:now}).select('backup_id,created_at,backup_type').single();
    if(ins.error)throw ins.error;
    await trimBackups();dirty=false;
    refreshCloudUi(frame.contentDocument).catch(()=>{});
    return ins.data;
  }

  async function restoreBackup(w,backupId){
    const sb=await getClient();
    let q=sb.from('user_backups').select('payload,created_at').eq('user_id',currentUser.id);
    q=backupId?q.eq('backup_id',backupId):q.order('created_at',{ascending:false}).limit(1);
    const res=backupId?await q.maybeSingle():await q.maybeSingle();
    if(res.error)throw res.error;
    if(!res.data||!res.data.payload||!res.data.payload.items)throw new Error('Kein Cloud-Backup vorhanden');
    Object.keys(res.data.payload.items).forEach(function(key){
      const value=res.data.payload.items[key];
      if(value===null)w.localStorage.removeItem(key);else w.localStorage.setItem(key,value);
    });
    w.localStorage.setItem(initKey(currentUser.id),'true');dirty=false;
  }

  function scheduleAutosave(w){
    if(!currentUser||w.localStorage.getItem(initKey(currentUser.id))!=='true')return;
    dirty=true;
    clearTimeout(autosaveTimer);
    autosaveTimer=setTimeout(function(){saveBackup(w,'auto').catch(err=>console.warn('[Cloud autosave]',err))},AUTOSAVE_DELAY);
  }

  function patchStorage(w){
    if(storagePatched)return;storagePatched=true;
    const proto=Object.getPrototypeOf(w.localStorage);
    const origSet=proto.setItem,origRemove=proto.removeItem,origClear=proto.clear;
    proto.setItem=function(k,v){const r=origSet.call(this,k,v);if(!ignoredKey(String(k)))scheduleAutosave(w);return r};
    proto.removeItem=function(k){const r=origRemove.call(this,k);if(!ignoredKey(String(k)))scheduleAutosave(w);return r};
    proto.clear=function(){const r=origClear.call(this);scheduleAutosave(w);return r};
    w.document.addEventListener('visibilitychange',function(){if(w.document.visibilityState==='hidden'&&dirty&&currentUser)saveBackup(w,'auto').catch(()=>{})});
  }

  function addStyles(d){
    if(d.getElementById('upperCloudV2Styles'))return;
    const s=d.createElement('style');s.id='upperCloudV2Styles';s.textContent=`
      .uc-card{border:1px solid #343434;background:linear-gradient(180deg,#171717,#101010);border-radius:14px;padding:14px;margin:0 0 14px;color:#fff}.uc-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:12px}.uc-kicker{font-size:.62rem;color:#ffd400;font-weight:900;letter-spacing:.08em}.uc-title{font-size:1.05rem;font-weight:900;margin-top:2px}.uc-state{font-size:.68rem;color:#999}.uc-input{width:100%;box-sizing:border-box;padding:11px 12px;margin:0 0 8px;border:1px solid #3b3b3b;border-radius:9px;background:#0d0d0d;color:#fff}.uc-row{display:flex;gap:8px}.uc-btn{border:0;border-radius:9px;padding:11px 12px;font-weight:900;cursor:pointer}.uc-primary{background:#ffd400;color:#111}.uc-secondary{background:#252525;color:#fff;border:1px solid #3d3d3d}.uc-link{background:none;border:0;color:#bdbdbd;text-decoration:underline;padding:7px 0;font-size:.72rem}.uc-status{display:none;margin-top:9px;padding:9px;border-radius:8px;background:#202020;font-size:.72rem;line-height:1.4}.uc-backup{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #292929;font-size:.72rem}.uc-backup:first-child{border-top:0}.uc-modal{position:fixed;inset:0;z-index:15000;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:18px}.uc-dialog{width:min(420px,100%);background:#151515;border:1px solid #3a3a3a;border-radius:16px;padding:17px;box-shadow:0 18px 55px #000}.uc-dialog h3{margin:0 0 8px;font-size:1.05rem}.uc-dialog p{margin:0 0 14px;color:#bbb;font-size:.78rem;line-height:1.45}.uc-dialog .uc-btn{width:100%;margin-top:8px}
    `;d.head.appendChild(s);
  }

  function status(d,text,type){const el=d.getElementById('ucStatus');if(!el)return;el.style.display='block';el.style.color=type==='error'?'#ff8b78':type==='ok'?'#a8da78':'#ddd';el.textContent=text}

  function openBackupPage(w,d){
    if(typeof w.switchPage==='function')w.switchPage('backup');
    setTimeout(()=>{const el=d.getElementById('upperCloudV2');if(el)el.scrollIntoView({behavior:'smooth',block:'start'})},120);
  }

  function modal(d,title,text,buttons){
    const old=d.getElementById('ucModal');if(old)old.remove();
    const wrap=d.createElement('div');wrap.id='ucModal';wrap.className='uc-modal';
    const dialog=d.createElement('div');dialog.className='uc-dialog';dialog.innerHTML='<h3>'+title+'</h3><p>'+text+'</p>';
    (buttons||[]).forEach(function(b){const btn=d.createElement('button');btn.className='uc-btn '+(b.primary?'uc-primary':'uc-secondary');btn.textContent=b.label;btn.onclick=async function(){if(b.close!==false)wrap.remove();if(b.onClick)await b.onClick()};dialog.appendChild(btn)});
    wrap.appendChild(dialog);d.body.appendChild(wrap);return wrap;
  }

  async function maybeFirstSync(w,d){
    if(!currentUser||w.localStorage.getItem(initKey(currentUser.id))==='true')return;
    let backups=[];try{backups=await listBackups()}catch(_){return}
    const local=hasLocalData(w);
    if(!local&&!backups.length){w.localStorage.setItem(initKey(currentUser.id),'true');return}
    modal(d,'Cloud-Synchronisierung einrichten','Auf diesem Gerät bzw. in der Cloud sind bereits Daten vorhanden. Wähle einmal bewusst, welcher Stand als Ausgangspunkt verwendet werden soll.',[
      {label:'Dieses Gerät → Cloud sichern',primary:true,onClick:async()=>{try{await saveBackup(w,'manual');w.localStorage.setItem(initKey(currentUser.id),'true');status(d,'Gerät wurde als Ausgangsstand gesichert. Autospeichern ist aktiv.','ok')}catch(e){status(d,e.message,'error')}}},
      ...(backups.length?[{label:'Letztes Cloud-Backup → Gerät',onClick:async()=>{try{await restoreBackup(w,backups[0].backup_id);location.reload()}catch(e){status(d,e.message,'error')}}}]:[]),
      {label:'Noch nicht synchronisieren'}
    ]);
  }

  function maybeHint(w,d){
    if(currentUser)return;
    if(w.localStorage.getItem('upper_cloud_hint_version')===HINT_VERSION)return;
    setTimeout(function(){
      if(currentUser||d.getElementById('ucModal'))return;
      modal(d,'Deine Trackday-Daten sichern?','Mit einem kostenlosen Konto kannst du Setup, Kurven, Zeitplan, Runden und weitere App-Daten automatisch in der Cloud sichern. Die App funktioniert auch ohne Login weiterhin vollständig lokal.',[
        {label:'Cloud aktivieren',primary:true,onClick:()=>{w.localStorage.setItem('upper_cloud_hint_version',HINT_VERSION);openBackupPage(w,d)}},
        {label:'Später',onClick:()=>w.localStorage.setItem('upper_cloud_hint_version',HINT_VERSION)}
      ]);
    },900);
  }

  function recoveryDialog(d){
    const wrap=modal(d,'Neues Passwort festlegen','Der Reset-Link wurde bestätigt. Lege jetzt ein neues Passwort mit mindestens 6 Zeichen fest.',[]);
    const dialog=wrap.querySelector('.uc-dialog');
    const p1=d.createElement('input');p1.type='password';p1.placeholder='Neues Passwort';p1.className='uc-input';
    const p2=d.createElement('input');p2.type='password';p2.placeholder='Passwort wiederholen';p2.className='uc-input';
    const btn=d.createElement('button');btn.className='uc-btn uc-primary';btn.textContent='Passwort speichern';btn.onclick=async function(){
      if(p1.value.length<6||p1.value!==p2.value){alert('Passwörter müssen übereinstimmen und mindestens 6 Zeichen haben.');return}
      try{const sb=await getClient();const r=await sb.auth.updateUser({password:p1.value});if(r.error)throw r.error;wrap.remove();alert('Passwort wurde geändert. Du bist weiterhin angemeldet.')}catch(e){alert('Passwort konnte nicht geändert werden: '+e.message)}
    };
    dialog.appendChild(p1);dialog.appendChild(p2);dialog.appendChild(btn);
  }

  async function refreshCloudUi(d){
    if(!d)return;
    const out=d.getElementById('ucLoggedOut'),inn=d.getElementById('ucLoggedIn'),state=d.getElementById('ucState');
    if(!out||!inn||!state)return;
    if(currentUser){
      out.style.display='none';inn.style.display='block';state.textContent='● Verbunden';state.style.color='#a8da78';
      d.getElementById('ucUser').textContent=currentUser.email||currentUser.id;
      try{
        const backups=await listBackups();
        const list=d.getElementById('ucBackups');list.innerHTML='';
        if(!backups.length)list.innerHTML='<div style="color:#777;font-size:.72rem;padding:7px 0">Noch kein Cloud-Backup.</div>';
        backups.forEach(function(b,i){
          const row=d.createElement('div');row.className='uc-backup';
          const left=d.createElement('div');left.innerHTML='<strong>'+(i===0?'Aktuell':'Backup '+(i+1))+'</strong><br><span style="color:#888">'+fmtDate(b.created_at||b.updated_at)+' · '+(b.backup_type==='auto'?'automatisch':'manuell')+'</span>';
          const btn=d.createElement('button');btn.className='uc-btn uc-secondary';btn.style.padding='7px 9px';btn.textContent='Laden';btn.onclick=async()=>{if(!confirm('Dieses Backup auf das Gerät laden? Lokale Werte mit gleichen Schlüsseln werden überschrieben.'))return;try{await restoreBackup(frame.contentWindow,b.backup_id);location.reload()}catch(e){status(d,e.message,'error')}};
          row.appendChild(left);row.appendChild(btn);list.appendChild(row);
        });
      }catch(e){status(d,'Backups konnten nicht geladen werden: '+e.message,'error')}
    }else{
      out.style.display='block';inn.style.display='none';state.textContent='Nicht angemeldet';state.style.color='#999';
    }
  }

  function buildUi(w,d){
    addStyles(d);
    const page=d.getElementById('pageBackup');if(!page)return;
    let root=d.getElementById('upperCloudV2');if(root)return;
    root=d.createElement('div');root.id='upperCloudV2';root.className='uc-card';
    root.innerHTML=`<div class="uc-head"><div><div class="uc-kicker">KONTO & CLOUD</div><div class="uc-title">UpperRacing Cloud</div></div><div id="ucState" class="uc-state">Nicht angemeldet</div></div>
      <div id="ucLoggedOut"><input id="ucEmail" class="uc-input" type="email" autocomplete="email" placeholder="E-Mail-Adresse"><input id="ucPassword" class="uc-input" type="password" autocomplete="current-password" placeholder="Passwort (mind. 6 Zeichen)"><div class="uc-row"><button id="ucLogin" class="uc-btn uc-primary" style="flex:1">Anmelden</button><button id="ucRegister" class="uc-btn uc-secondary" style="flex:1">Registrieren</button></div><button id="ucForgot" class="uc-link">Passwort vergessen?</button><div style="font-size:.67rem;color:#818181;line-height:1.4">Du bleibst auf diesem Gerät angemeldet. Ohne Login funktioniert die App weiterhin lokal.</div></div>
      <div id="ucLoggedIn" style="display:none"><div style="font-size:.75rem;color:#bbb;margin-bottom:10px">Angemeldet als <strong id="ucUser" style="color:#fff"></strong></div><button id="ucSaveNow" class="uc-btn uc-primary" style="width:100%;margin-bottom:8px">☁️ Jetzt sichern</button><div style="font-size:.67rem;color:#888;margin-bottom:10px">Autospeichern: ca. 45 Sek. nach Änderungen · maximal die letzten 5 Backups.</div><div id="ucBackups"></div><button id="ucLogout" class="uc-link">Abmelden</button></div><div id="ucStatus" class="uc-status"></div>`;
    page.insertBefore(root,page.firstChild);

    d.getElementById('ucLogin').onclick=async function(){const email=d.getElementById('ucEmail').value.trim(),password=d.getElementById('ucPassword').value;if(!email||!password){status(d,'Bitte E-Mail und Passwort eingeben.','error');return}status(d,'Anmeldung läuft …');try{const sb=await getClient();const r=await sb.auth.signInWithPassword({email,password});if(r.error)throw r.error;status(d,'Erfolgreich angemeldet.','ok')}catch(e){status(d,'Anmeldung fehlgeschlagen: '+e.message,'error')}};
    d.getElementById('ucRegister').onclick=async function(){const email=d.getElementById('ucEmail').value.trim(),password=d.getElementById('ucPassword').value;if(!email||password.length<6){status(d,'Bitte gültige E-Mail und mindestens 6 Zeichen Passwort eingeben.','error');return}status(d,'Konto wird angelegt …');try{const sb=await getClient();const r=await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});if(r.error)throw r.error;status(d,r.data&&r.data.session?'Konto angelegt und angemeldet.':'Konto angelegt. Bitte Bestätigungs-E-Mail öffnen.','ok')}catch(e){status(d,'Registrierung fehlgeschlagen: '+e.message,'error')}};
    d.getElementById('ucForgot').onclick=async function(){const email=d.getElementById('ucEmail').value.trim();if(!email){status(d,'Bitte zuerst deine E-Mail-Adresse eingeben.','error');return}try{const sb=await getClient();const r=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(r.error)throw r.error;status(d,'Reset-Mail wurde versendet. Öffne den Link in der E-Mail.','ok')}catch(e){status(d,'Reset-Mail konnte nicht gesendet werden: '+e.message,'error')}};
    d.getElementById('ucSaveNow').onclick=async function(){try{status(d,'Backup wird gespeichert …');await saveBackup(w,'manual');status(d,'Cloud-Backup gespeichert.','ok')}catch(e){status(d,'Backup fehlgeschlagen: '+e.message,'error')}};
    d.getElementById('ucLogout').onclick=async function(){try{const sb=await getClient();await sb.auth.signOut();currentUser=null;status(d,'Abgemeldet.','ok');await refreshCloudUi(d)}catch(e){status(d,'Abmelden fehlgeschlagen: '+e.message,'error')}};
  }

  async function activate(){
    const w=frame.contentWindow,d=frame.contentDocument;if(!w||!d)return;
    buildUi(w,d);patchStorage(w);
    try{
      const sb=await getClient();
      const sess=await sb.auth.getSession();currentUser=sess.data&&sess.data.session&&sess.data.session.user||null;
      await refreshCloudUi(d);
      if(currentUser)await maybeFirstSync(w,d);else maybeHint(w,d);
      sb.auth.onAuthStateChange(function(event,session){
        currentUser=session&&session.user||null;
        setTimeout(async function(){await refreshCloudUi(d);if(event==='PASSWORD_RECOVERY')recoveryDialog(d);else if(currentUser)await maybeFirstSync(w,d);else maybeHint(w,d)},0);
      });
    }catch(e){status(d,'Cloud konnte nicht gestartet werden: '+e.message,'error')}
  }

  if(frame.contentDocument&&frame.contentDocument.readyState==='complete')activate();else frame.addEventListener('load',activate,{once:true});
})();
