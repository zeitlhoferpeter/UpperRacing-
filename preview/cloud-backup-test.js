(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  const SUPABASE_URL='https://qdujqoexesztcmfljlap.supabase.co';
  const SUPABASE_KEY='sb_publishable_7wW-Ayw3KSucm4-yMIP3FA_bd3CmDuk';
  const SDK_URL='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  let client=null;
  let sdkPromise=null;

  function loadSdk(){
    if(window.supabase&&window.supabase.createClient)return Promise.resolve(window.supabase);
    if(sdkPromise)return sdkPromise;
    sdkPromise=new Promise(function(resolve,reject){
      const s=document.createElement('script');
      s.src=SDK_URL;
      s.async=true;
      s.onload=function(){
        if(window.supabase&&window.supabase.createClient)resolve(window.supabase);
        else reject(new Error('Supabase SDK nicht verfügbar'));
      };
      s.onerror=function(){sdkPromise=null;reject(new Error('Supabase SDK konnte nicht geladen werden'))};
      document.head.appendChild(s);
    });
    return sdkPromise;
  }

  async function getClient(){
    if(client)return client;
    const sdk=await loadSdk();
    client=sdk.createClient(SUPABASE_URL,SUPABASE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    return client;
  }

  function appStorageSnapshot(w){
    const payload={version:1,saved_at:new Date().toISOString(),items:{}};
    for(let i=0;i<w.localStorage.length;i++){
      const key=w.localStorage.key(i);
      if(!key)continue;
      if(/^sb-/i.test(key)||/^supabase/i.test(key)||/^upper_cloud_/i.test(key))continue;
      payload.items[key]=w.localStorage.getItem(key);
    }
    return payload;
  }

  function formatDate(iso){
    if(!iso)return'—';
    const dt=new Date(iso);
    if(!Number.isFinite(dt.getTime()))return'—';
    return dt.toLocaleString('de-AT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }

  function ui(frameWindow,doc){
    const page=doc.getElementById('pageBackup');
    if(!page)return null;
    let root=doc.getElementById('upperCloudTest');
    if(root)return root;

    root=doc.createElement('div');
    root.id='upperCloudTest';
    root.className='setup-box';
    root.style.cssText='border:1px solid #4b4318;background:#15140d;margin-bottom:14px;';
    root.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
        <div><div style="font-size:.72rem;color:#ffd400;font-weight:900;letter-spacing:.06em;">CLOUD TEST</div><h3 style="margin:2px 0 0;">UpperRacing Cloud</h3></div>
        <div id="upperCloudDot" style="font-size:.72rem;color:#999;white-space:nowrap;">Nicht angemeldet</div>
      </div>
      <div id="upperCloudLoggedOut">
        <input id="upperCloudEmail" type="email" autocomplete="email" placeholder="E-Mail-Adresse" style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:11px;background:#222;border:1px solid #444;color:#fff;border-radius:6px;">
        <input id="upperCloudPassword" type="password" autocomplete="current-password" placeholder="Passwort (mind. 6 Zeichen)" style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:11px;background:#222;border:1px solid #444;color:#fff;border-radius:6px;">
        <div style="display:flex;gap:8px;">
          <button id="upperCloudLogin" type="button" style="flex:1;background:#ffd400;color:#111;border:0;border-radius:6px;padding:11px;font-weight:900;">Anmelden</button>
          <button id="upperCloudRegister" type="button" style="flex:1;background:#2b2b2b;color:#fff;border:1px solid #444;border-radius:6px;padding:11px;font-weight:800;">Registrieren</button>
        </div>
        <div style="font-size:.67rem;color:#888;margin-top:8px;line-height:1.4;">Beim ersten Registrieren schickt Supabase eine Bestätigungs-E-Mail. Danach kannst du dich hier anmelden.</div>
      </div>
      <div id="upperCloudLoggedIn" style="display:none;">
        <div style="font-size:.76rem;color:#bbb;margin-bottom:10px;">Angemeldet als <strong id="upperCloudUser" style="color:#fff;"></strong></div>
        <button id="upperCloudSave" type="button" style="width:100%;background:#ffd400;color:#111;border:0;border-radius:7px;padding:13px;font-weight:900;margin-bottom:8px;">☁️ Jetzt in Cloud sichern</button>
        <button id="upperCloudLoad" type="button" style="width:100%;background:#242424;color:#fff;border:1px solid #444;border-radius:7px;padding:11px;font-weight:800;margin-bottom:8px;">↙ Cloud-Backup laden</button>
        <div id="upperCloudLast" style="font-size:.7rem;color:#999;margin:2px 0 10px;">Letztes Cloud-Backup: —</div>
        <button id="upperCloudLogout" type="button" style="background:transparent;color:#aaa;border:0;padding:5px 0;font-size:.74rem;text-decoration:underline;">Abmelden</button>
      </div>
      <div id="upperCloudStatus" style="display:none;margin-top:10px;padding:8px 9px;border-radius:6px;background:#222;color:#bbb;font-size:.72rem;line-height:1.4;"></div>
    `;
    page.insertBefore(root,page.firstChild);

    function status(text,type){
      const el=doc.getElementById('upperCloudStatus');
      el.style.display='block';
      el.style.color=type==='error'?'#ff8b78':type==='ok'?'#a8da78':'#ddd';
      el.textContent=text;
    }

    async function renderSession(){
      try{
        const sb=await getClient();
        const result=await sb.auth.getSession();
        const session=result.data&&result.data.session;
        const out=doc.getElementById('upperCloudLoggedOut');
        const inn=doc.getElementById('upperCloudLoggedIn');
        const dot=doc.getElementById('upperCloudDot');
        if(session&&session.user){
          out.style.display='none';inn.style.display='block';
          doc.getElementById('upperCloudUser').textContent=session.user.email||session.user.id;
          dot.textContent='● Verbunden';dot.style.color='#a8da78';
          const q=await sb.from('user_backups').select('updated_at').eq('user_id',session.user.id).maybeSingle();
          if(!q.error&&q.data)doc.getElementById('upperCloudLast').textContent='Letztes Cloud-Backup: '+formatDate(q.data.updated_at);
        }else{
          out.style.display='block';inn.style.display='none';
          dot.textContent='Nicht angemeldet';dot.style.color='#999';
        }
      }catch(err){status('Cloud konnte nicht initialisiert werden: '+err.message,'error')}
    }

    doc.getElementById('upperCloudLogin').onclick=async function(){
      const email=doc.getElementById('upperCloudEmail').value.trim();
      const password=doc.getElementById('upperCloudPassword').value;
      if(!email||!password){status('Bitte E-Mail und Passwort eingeben.','error');return}
      status('Anmeldung läuft …');
      try{
        const sb=await getClient();
        const res=await sb.auth.signInWithPassword({email:email,password:password});
        if(res.error)throw res.error;
        status('Erfolgreich angemeldet.','ok');
        await renderSession();
      }catch(err){status('Anmeldung fehlgeschlagen: '+err.message,'error')}
    };

    doc.getElementById('upperCloudRegister').onclick=async function(){
      const email=doc.getElementById('upperCloudEmail').value.trim();
      const password=doc.getElementById('upperCloudPassword').value;
      if(!email||password.length<6){status('Bitte gültige E-Mail und mindestens 6 Zeichen Passwort eingeben.','error');return}
      status('Konto wird angelegt …');
      try{
        const sb=await getClient();
        const res=await sb.auth.signUp({email:email,password:password});
        if(res.error)throw res.error;
        if(res.data&&res.data.session){status('Konto angelegt und angemeldet.','ok');await renderSession()}
        else status('Konto angelegt. Bitte Bestätigungs-E-Mail öffnen und danach hier anmelden.','ok');
      }catch(err){status('Registrierung fehlgeschlagen: '+err.message,'error')}
    };

    doc.getElementById('upperCloudSave').onclick=async function(){
      status('Cloud-Backup wird gespeichert …');
      try{
        const sb=await getClient();
        const sess=await sb.auth.getSession();
        const user=sess.data&&sess.data.session&&sess.data.session.user;
        if(!user)throw new Error('Nicht angemeldet');
        const payload=appStorageSnapshot(frameWindow);
        const res=await sb.from('user_backups').upsert({user_id:user.id,payload:payload},{onConflict:'user_id'}).select('updated_at').single();
        if(res.error)throw res.error;
        doc.getElementById('upperCloudLast').textContent='Letztes Cloud-Backup: '+formatDate(res.data.updated_at);
        status('Cloud-Backup erfolgreich gespeichert.','ok');
      }catch(err){status('Cloud-Backup fehlgeschlagen: '+err.message,'error')}
    };

    doc.getElementById('upperCloudLoad').onclick=async function(){
      if(!frameWindow.confirm('Cloud-Backup auf dieses Gerät laden? Gespeicherte Werte mit gleichen Schlüsseln werden überschrieben.'))return;
      status('Cloud-Backup wird geladen …');
      try{
        const sb=await getClient();
        const sess=await sb.auth.getSession();
        const user=sess.data&&sess.data.session&&sess.data.session.user;
        if(!user)throw new Error('Nicht angemeldet');
        const res=await sb.from('user_backups').select('payload,updated_at').eq('user_id',user.id).maybeSingle();
        if(res.error)throw res.error;
        if(!res.data||!res.data.payload||!res.data.payload.items)throw new Error('Noch kein Cloud-Backup vorhanden');
        Object.keys(res.data.payload.items).forEach(function(key){
          const value=res.data.payload.items[key];
          if(value===null)frameWindow.localStorage.removeItem(key); else frameWindow.localStorage.setItem(key,value);
        });
        status('Cloud-Backup geladen. App wird neu gestartet …','ok');
        setTimeout(function(){location.reload()},700);
      }catch(err){status('Cloud-Backup konnte nicht geladen werden: '+err.message,'error')}
    };

    doc.getElementById('upperCloudLogout').onclick=async function(){
      try{const sb=await getClient();await sb.auth.signOut();status('Abgemeldet.','ok');await renderSession()}catch(err){status('Abmelden fehlgeschlagen: '+err.message,'error')}
    };

    getClient().then(function(sb){
      sb.auth.onAuthStateChange(function(){setTimeout(renderSession,0)});
      renderSession();
    }).catch(function(err){status('Supabase konnte nicht geladen werden: '+err.message,'error')});

    return root;
  }

  async function activate(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;
    ui(w,d);
  }

  window.upperCloudBackupTest={activate:activate};
  if(frame.contentDocument&&frame.contentDocument.readyState==='complete')activate();
  else frame.addEventListener('load',activate,{once:true});
})();