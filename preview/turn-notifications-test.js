(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  const ENABLE_KEY='upper_turn_notifications_enabled';
  const SENT_PREFIX='upper_turn_notification_sent_';
  const CHECK_MS=5000;
  let timer=null;

  function notificationSupported(){return 'Notification' in window&&'serviceWorker' in navigator}
  function permission(){return notificationSupported()?Notification.permission:'unsupported'}

  function mins(t){
    if(!t)return NaN;
    const p=String(t).trim().replace('.',':').split(':');
    if(p.length<2)return NaN;
    const h=Number(p[0]),m=Number(p[1]);
    return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:NaN;
  }

  function getDays(w){try{return JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}')||{}}catch(_){return{}}}
  function activeDay(w,days){let day=w.localStorage.getItem('upper_schedule_activeday');if(day&&days[day])return day;return Object.keys(days)[0]||''}
  function myGroup(w){return w.localStorage.getItem('upper_schedule_mygroup')||'A'}
  function isOwnTurn(it,group){return !!(it&&it.type==='turn'&&it.start&&(group==='ALL'||it.group===group||it.group==='A+B+C+D'))}

  function eventDateKey(w,day){
    const raw=w.localStorage.getItem('upper_preview_schedule_date')||'';
    return raw||day||'day';
  }

  function sentKey(w,day,it,threshold){
    return SENT_PREFIX+[eventDateKey(w,day),day,it.start,it.group,threshold].join('|');
  }

  function wasSent(w,key){return w.localStorage.getItem(key)==='1'}
  function markSent(w,key){w.localStorage.setItem(key,'1')}

  async function registration(){
    if(!('serviceWorker' in navigator))return null;
    try{
      const existing=await navigator.serviceWorker.getRegistration();
      if(existing)return existing;
      return await navigator.serviceWorker.register('../sw.js');
    }catch(_){return null}
  }

  async function showSystem(title,body,tag,urgent){
    if(permission()!=='granted')return false;
    const reg=await registration();
    if(!reg||typeof reg.showNotification!=='function')return false;
    try{
      await reg.showNotification(title,{
        body:body,
        icon:'../icon.png',
        badge:'../icon.png',
        tag:tag,
        renotify:true,
        requireInteraction:!!urgent,
        vibrate:urgent?[260,110,260,110,450]:[130,100,130],
        data:{url:location.origin+'/UpperRacing-/preview-race/'}
      });
      return true;
    }catch(e){console.warn('[Turn Notification]',e);return false}
  }

  async function check(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d||w.localStorage.getItem(ENABLE_KEY)!=='true'||permission()!=='granted')return;
    const days=getDays(w),day=activeDay(w,days),items=Array.isArray(days[day])?days[day]:[];
    if(!items.length)return;
    const group=myGroup(w);
    const now=new Date(),nowM=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;

    const turns=items.filter(it=>isOwnTurn(it,group)&&Number.isFinite(mins(it.start)));
    for(const it of turns){
      const diff=mins(it.start)-nowM;
      if(diff<=0||diff>10.25)continue;

      if(diff<=5.25){
        const key=sentKey(w,day,it,5);
        if(!wasSent(w,key)){
          const ok=await showSystem('🚨 UpperRacing – Turn '+it.group+' in 5 Minuten','Dein Turn startet um '+String(it.start).replace('.',':')+'. Gleich geht’s los – ab zur Boxenausfahrt!', 'upper-turn-5-'+day+'-'+it.start+'-'+it.group,true);
          if(ok)markSent(w,key);
        }
      }else{
        const key=sentKey(w,day,it,10);
        if(!wasSent(w,key)){
          const ok=await showSystem('🏁 UpperRacing – Turn '+it.group+' in 10 Minuten','Dein Turn startet um '+String(it.start).replace('.',':')+'. Zeit zum Vorbereiten.', 'upper-turn-10-'+day+'-'+it.start+'-'+it.group,false);
          if(ok)markSent(w,key);
        }
      }
    }
    updateUi();
  }

  function statusText(w){
    if(!notificationSupported())return'Auf diesem Gerät nicht unterstützt';
    if(permission()==='denied')return'Benachrichtigungen im Browser blockiert';
    if(permission()==='granted'&&w.localStorage.getItem(ENABLE_KEY)==='true')return'Aktiv · 10 Min. + 5 Min. vor deinem Turn';
    return'Noch nicht aktiviert';
  }

  function updateUi(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;
    const card=d.getElementById('upperTurnNotifyCard');if(!card)return;
    const state=card.querySelector('.utn-state'),btn=card.querySelector('.utn-btn');
    if(state)state.textContent=statusText(w);
    if(!btn)return;
    const active=permission()==='granted'&&w.localStorage.getItem(ENABLE_KEY)==='true';
    btn.textContent=active?'🔔 Turn-Benachrichtigungen aktiv':'🔔 Turn-Benachrichtigungen aktivieren';
    btn.disabled=active||permission()==='denied'||!notificationSupported();
    btn.style.opacity=btn.disabled&&active?'1':btn.disabled?'.55':'1';
  }

  async function enable(){
    const w=frame.contentWindow;
    if(!w||!notificationSupported())return;
    let result=permission();
    if(result!=='granted'){
      try{result=await Notification.requestPermission()}catch(e){console.warn('[Turn Notification permission]',e);return}
    }
    if(result==='granted'){
      w.localStorage.setItem(ENABLE_KEY,'true');
      await registration();
      updateUi();
      check();
    }else updateUi();
  }

  function mount(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;
    const page=d.getElementById('pageSchedule');
    if(!page||d.getElementById('upperTurnNotifyCard'))return;

    if(!d.getElementById('upperTurnNotifyStyles')){
      const s=d.createElement('style');s.id='upperTurnNotifyStyles';s.textContent=`
        #upperTurnNotifyCard{background:linear-gradient(145deg,#181818,#111);border:1px solid #3b3b3b;border-radius:14px;padding:12px;margin:0 0 10px;color:#fff;box-shadow:0 5px 16px rgba(0,0,0,.18)}
        #upperTurnNotifyCard .utn-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}
        #upperTurnNotifyCard .utn-title{font-size:.72rem;font-weight:900;color:#ffd400;letter-spacing:.55px}
        #upperTurnNotifyCard .utn-state{font-size:.62rem;color:#969696;line-height:1.35;margin-bottom:9px}
        #upperTurnNotifyCard .utn-btn{width:100%;border:0;border-radius:9px;padding:10px 11px;background:#ffd400;color:#111;font-size:.76rem;font-weight:900;cursor:pointer}
        #upperTurnNotifyCard .utn-note{font-size:.57rem;color:#707070;line-height:1.35;margin-top:7px}
      `;d.head.appendChild(s);
    }

    const card=d.createElement('div');card.id='upperTurnNotifyCard';
    card.innerHTML='<div class="utn-head"><div class="utn-title">TURN-ERINNERUNG</div></div><div class="utn-state"></div><button type="button" class="utn-btn">🔔 Turn-Benachrichtigungen aktivieren</button><div class="utn-note">Erinnert dich 10 und 5 Minuten vor den Turns deiner aktuell gewählten Gruppe.</div>';
    const top=d.getElementById('previewScheduleTop');
    if(top&&top.parentNode)top.parentNode.insertBefore(card,top.nextSibling);else page.insertBefore(card,page.firstChild);
    card.querySelector('.utn-btn').addEventListener('click',enable);
    updateUi();
  }

  frame.addEventListener('load',function(){
    const d=frame.contentDocument;if(!d||d.__upperTurnNotificationsTest)return;
    d.__upperTurnNotificationsTest=true;
    setTimeout(mount,650);
    setTimeout(mount,1300);
    if(timer)clearInterval(timer);
    timer=setInterval(function(){mount();check()},CHECK_MS);
  });
})();
