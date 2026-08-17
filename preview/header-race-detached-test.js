(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d||d.__upperDetachedRaceHeader)return;

    const legacyWidget=d.getElementById('headerScheduleWidget');
    const legacySide=d.querySelector('.preview-next-turn-time');
    const status=d.querySelector('.header-status-grid');
    if(!legacyWidget||!legacySide||!status)return;
    d.__upperDetachedRaceHeader=true;

    const widget=legacyWidget.cloneNode(true);
    widget.id='headerRaceScheduleWidget';
    widget.classList.add('preview-context-mode');
    widget.removeAttribute('data-context-label');

    const side=d.createElement('div');
    side.className='preview-race-side';

    status.insertBefore(widget,legacyWidget);
    status.insertBefore(side,legacySide);
    legacyWidget.style.setProperty('display','none','important');
    legacySide.style.setProperty('display','none','important');

    const oldStyle=d.getElementById('previewHeaderContextStyles');
    if(oldStyle)oldStyle.remove();
    const style=d.createElement('style');
    style.id='previewHeaderContextStyles';
    style.textContent=`
      #headerRaceScheduleWidget{grid-column:1 / -1!important;grid-row:1!important;width:100%!important;max-width:none!important;min-height:74px!important;padding:9px 118px 9px 10px!important;margin:0!important;display:flex!important;align-items:center!important;align-content:center!important;flex-wrap:wrap!important;gap:5px 8px!important;overflow:hidden!important;position:relative!important;transition:border-color .18s ease,background .18s ease,box-shadow .18s ease!important;box-sizing:border-box!important}
      #headerRaceScheduleWidget::before{content:attr(data-context-label)!important;width:100%!important;margin:0 0 3px!important}
      #headerRaceScheduleWidget.preview-race-active{min-height:126px!important;align-items:flex-start!important;align-content:flex-start!important}
      #headerRaceScheduleWidget .preview-context-main{font-size:1.18rem;font-weight:900;color:#fff;line-height:1.18}
      #headerRaceScheduleWidget .preview-context-sub{font-size:.68rem;font-weight:800;color:#aaa;margin-top:3px;width:100%}
      #headerRaceScheduleWidget .preview-turn-countdown{display:inline-flex;align-items:center;gap:10px;margin-top:4px;padding:7px 12px;border:2px solid #4a4a4a;border-radius:10px;background:#101010;box-shadow:none;font-size:1.7rem;font-weight:950;line-height:1;color:#fff;font-variant-numeric:tabular-nums;letter-spacing:.2px;transition:border-color .18s,box-shadow .18s,background .18s}
      #headerRaceScheduleWidget .preview-turn-group{color:var(--turn-color,#fff);min-width:1.05em;text-align:center}
      #headerRaceScheduleWidget .preview-turn-time{color:#fff}
      #headerRaceScheduleWidget .preview-race-list{width:100%;margin-top:3px;padding:7px 10px;border:2px solid #9C27B0;border-radius:10px;background:#161016;box-shadow:0 0 0 1px rgba(156,39,176,.14);box-sizing:border-box}
      #headerRaceScheduleWidget .preview-race-row{display:flex;align-items:center;gap:7px;min-width:0;font-size:.75rem;font-weight:900;line-height:1.28;color:#ddd}
      #headerRaceScheduleWidget .preview-race-row+.preview-race-row{margin-top:2px}
      #headerRaceScheduleWidget .preview-race-time{width:43px;flex:0 0 43px;color:#fff;font-variant-numeric:tabular-nums}
      #headerRaceScheduleWidget .preview-race-next{width:43px;flex:0 0 43px;color:#d48cff;font-size:.62rem;letter-spacing:.5px}
      #headerRaceScheduleWidget .preview-race-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff}
      #headerRaceScheduleWidget .preview-race-row:first-child .preview-race-name{color:#d48cff}
      #headerRaceScheduleWidget .preview-race-note{margin-top:4px;color:#888;font-size:.58rem;font-weight:800}
      .preview-race-side{grid-column:2!important;grid-row:1!important;align-self:stretch!important;justify-self:stretch!important;z-index:4!important;pointer-events:none!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:flex-end!important;text-align:right!important;padding:7px 9px 7px 4px!important;box-sizing:border-box!important}
      .preview-race-side .pnt-label{color:#8e8e8e;font-size:.47rem;font-weight:900;letter-spacing:.45px;line-height:1.1;white-space:nowrap}
      .preview-race-side .pnt-group{color:#aaa;font-size:.49rem;font-weight:800;margin-top:2px;white-space:nowrap}
      .preview-race-side .pnt-time{color:#fff;font-size:1rem;font-weight:900;line-height:1.05;margin-top:2px;white-space:nowrap}
      #headerRaceScheduleWidget.preview-alert-10{border-color:#ffd400!important;box-shadow:0 0 0 1px rgba(255,212,0,.34),0 0 18px rgba(255,212,0,.30)!important;background:linear-gradient(145deg,#272300,#171600)!important}
      #headerRaceScheduleWidget.preview-alert-10 .preview-turn-countdown{border-color:#ffd400!important;box-shadow:0 0 0 1px rgba(255,212,0,.22),0 0 12px rgba(255,212,0,.20)!important}
      @keyframes ur-header-alert-5{0%,100%{box-shadow:0 0 0 1px rgba(255,50,35,.42),0 0 15px rgba(255,45,25,.42)}50%{box-shadow:0 0 0 2px rgba(255,75,50,.82),0 0 28px rgba(255,45,25,.78)}}
      @keyframes ur-inner-alert-5{0%,100%{box-shadow:0 0 0 1px rgba(255,50,35,.28),0 0 8px rgba(255,45,25,.28)}50%{box-shadow:0 0 0 2px rgba(255,75,50,.70),0 0 18px rgba(255,45,25,.62)}}
      #headerRaceScheduleWidget.preview-alert-5{border-color:#ff2d19!important;background:linear-gradient(145deg,#3b0d07,#1d0906)!important;animation:ur-header-alert-5 .85s ease-in-out infinite!important}
      #headerRaceScheduleWidget.preview-alert-5 .preview-turn-countdown{border-color:#ff2d19!important;animation:ur-inner-alert-5 .85s ease-in-out infinite!important}
      #headerRaceScheduleWidget.preview-own-active{border-color:#4CAF50!important;box-shadow:0 0 0 1px rgba(76,175,80,.34),0 0 18px rgba(76,175,80,.30)!important;background:linear-gradient(145deg,#102a14,#101a12)!important}
      #headerRaceScheduleWidget.preview-own-active .preview-turn-countdown{border-color:#4CAF50!important;box-shadow:0 0 0 1px rgba(76,175,80,.22),0 0 12px rgba(76,175,80,.22)!important}
      @media(max-width:360px){#headerRaceScheduleWidget{min-height:72px!important;padding:8px 110px 8px 8px!important}.preview-race-side{padding-right:7px!important}.preview-race-side .pnt-time{font-size:.92rem!important}}
    `;
    d.head.appendChild(style);

    const RACE_ESTIMATE_MIN=25;
    function mins(t){if(!t)return 0;const p=String(t).trim().replace('.',':').split(':');return(+p[0]||0)*60+(+p[1]||0)}
    function fmt(t){return String(t||'').trim().replace('.',':')}
    function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')}
    function loadItems(){try{const days=JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}');let day=w.localStorage.getItem('upper_schedule_activeday');if(!day||!days[day])day=Object.keys(days)[0];return Array.isArray(days[day])?days[day].slice():[]}catch(_){return[]}}
    function selectedGroup(){return w.localStorage.getItem('upper_schedule_mygroup')||'A'}
    function isTurn(it){return !!(it&&it.type==='turn'&&it.start)}
    function isRace(it){return !!(it&&it.type==='race'&&it.start)}
    function isOwnTurn(it,group){return isTurn(it)&&(group==='ALL'||it.group===group||it.group==='A+B+C+D')}
    function isOrga(it){return it&&(it.type==='orga'||['Anmeldung','Pause','Briefing','REGROUPING','Siegerehrung'].includes(it.group))}
    function title(it){if(!it)return'Programmpunkt';if(it.title)return String(it.title);if(it.group==='Anmeldung')return'Anmeldung';if(it.group==='Pause')return'Mittagspause';if(it.group==='Briefing')return'Fahrerbesprechung';if(it.group==='REGROUPING')return'REGROUPING';return String(it.group||'Programmpunkt')}
    function label(it){if(!it)return'PROGRAMM';if(isTurn(it))return'TURN';if(isRace(it))return'RENNEN';if(it.group==='Anmeldung')return'ANMELDUNG';if(it.group==='Pause')return'MITTAGSPAUSE';if(it.group==='Briefing')return'FAHRERBESPRECHUNG';if(it.group==='Siegerehrung')return'SIEGEREHRUNG';return'PROGRAMM'}
    function groupColor(group){if(group==='A')return'#4CAF50';if(group==='B')return'#2196F3';if(group==='C')return'#FF9800';if(group==='D')return'#E91E63';if(group==='A+B+C+D')return'#FFD700';return'#888'}
    function effectiveEnd(items,index){const it=items[index];if(!it)return 0;if(it.end&&mins(it.end)>mins(it.start))return mins(it.end);const start=mins(it.start);for(let j=index+1;j<items.length;j++){const n=mins(items[j].start);if(n>start)return n}return start+(isTurn(it)?20:30)}
    function countdownText(diffMinutes){const totalSec=Math.max(0,Math.ceil(diffMinutes*60));const mm=Math.floor(totalSec/60),ss=String(totalSec%60).padStart(2,'0');return mm+':'+ss}
    function turnCountdown(group,time){return '<div class="preview-turn-countdown" style="--turn-color:'+groupColor(group)+'"><span class="preview-turn-group">'+esc(group||'')+'</span><span class="preview-turn-time">'+esc(time)+'</span></div>'}

    function raceInfo(items){
      const races=items.filter(isRace).sort((a,b)=>mins(a.start)-mins(b.start)||((a.sequence||0)-(b.sequence||0)));
      if(!races.length)return null;
      const firstStart=mins(races[0].start);
      const sameStart=races.filter(r=>mins(r.start)===firstStart);
      const block=sameStart.length>1?sameStart:races;
      const blockEnd=firstStart+block.length*RACE_ESTIMATE_MIN;
      const after=items.filter(it=>!isRace(it)&&!isTurn(it)&&mins(it.start)>firstStart).sort((a,b)=>mins(a.start)-mins(b.start))[0]||null;
      return{block,firstStart,blockEnd,after};
    }
    function raceListHtml(info){
      const rows=info.block.map(function(r,i){
        const lead=i===0?'<span class="preview-race-time">'+esc(fmt(r.start))+'</span>':'<span class="preview-race-next">NEXT</span>';
        return '<div class="preview-race-row">'+lead+'<span class="preview-race-name">'+esc(title(r))+'</span></div>';
      }).join('');
      return '<div class="preview-race-list">'+rows+'<div class="preview-race-note">Zeitfolge laut Plan · intern ca. '+RACE_ESTIMATE_MIN+' Min. je Rennen</div></div>';
    }

    let lastWidgetHtml='',lastSideHtml='',lastLabel='',lastMode='';
    function render(){
      const items=loadItems().filter(it=>it&&it.start).sort((a,b)=>mins(a.start)-mins(b.start)||((a.sequence||0)-(b.sequence||0)));
      if(!items.length)return;
      const now=new Date(),nowM=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
      const group=selectedGroup();
      const trackTurns=items.filter(isTurn),ownTurns=items.filter(it=>isOwnTurn(it,group));
      const nextTrack=trackTurns.find(it=>mins(it.start)>nowM)||null;
      const nextOwn=ownTurns.find(it=>mins(it.start)>nowM)||null;
      const minsToOwn=nextOwn?mins(nextOwn.start)-nowM:Infinity;
      const race=raceInfo(items);
      const inRaceBlock=!!(race&&nowM>=race.firstStart&&nowM<race.blockEnd);
      const waitingAfterRace=!!(race&&race.after&&nowM>=race.blockEnd&&nowM<mins(race.after.start));
      const postRacePhase=!!(race&&nowM>=race.firstStart);

      let activeIndex=-1;
      for(let i=0;i<items.length;i++){
        if(isRace(items[i]))continue;
        const start=mins(items[i].start),end=effectiveEnd(items,i);
        if(nowM>=start&&nowM<end){activeIndex=i;break}
      }
      const active=activeIndex>=0?items[activeIndex]:null;
      const ownActive=!!(active&&isOwnTurn(active,group));

      let leftLabel='PROGRAMM',leftMain='',leftSub='',leftHtml='';
      if(inRaceBlock){leftLabel='RENNEN';leftHtml=raceListHtml(race)}
      else if(waitingAfterRace){leftLabel='NÄCHSTER PROGRAMMPUNKT';leftMain=fmt(race.after.start)+' · '+esc(title(race.after));leftSub='nach dem Rennblock'}
      else if(active&&isOrga(active)){
        const after=trackTurns.find(it=>mins(it.start)>nowM)||null,diff=after?mins(after.start)-nowM:Infinity;
        if(!postRacePhase&&after&&diff>0&&diff<=10){leftLabel='TURN';leftHtml=turnCountdown(after.group,countdownText(diff));leftSub=fmt(after.start)}
        else{leftLabel=label(active);leftMain=esc(title(active));leftSub=fmt(active.start)+(effectiveEnd(items,activeIndex)>mins(active.start)?'–'+String(Math.floor(effectiveEnd(items,activeIndex)/60)).padStart(2,'0')+':'+String(Math.floor(effectiveEnd(items,activeIndex)%60)).padStart(2,'0'):'')}
      }
      else if(active&&isTurn(active)&&!postRacePhase){const end=effectiveEnd(items,activeIndex);leftLabel='TURN';leftHtml=turnCountdown(active.group,countdownText(end-nowM))}
      else if(nextTrack&&!postRacePhase){const diff=mins(nextTrack.start)-nowM;leftLabel='TURN';leftHtml=turnCountdown(nextTrack.group,countdownText(diff));leftSub=fmt(nextTrack.start)}
      else{
        const nextProgram=items.find(it=>!isRace(it)&&!isTurn(it)&&mins(it.start)>nowM)||null;
        const nextItem=nextProgram||items.find(it=>mins(it.start)>nowM)||null;
        if(nextItem){leftLabel=label(nextItem);leftMain=fmt(nextItem.start)+' · '+esc(title(nextItem))}
        else{leftLabel='PROGRAMM';leftMain='Tag beendet'}
      }

      const alert10=w.localStorage.getItem('upper_schedule_alert10m')!=='false',alert5=w.localStorage.getItem('upper_schedule_alert5m')!=='false';
      widget.classList.remove('preview-alert-10','preview-alert-5','preview-own-active','preview-race-active');
      if(inRaceBlock)widget.classList.add('preview-race-active');
      if(!postRacePhase){
        if(ownActive)widget.classList.add('preview-own-active');
        else if(minsToOwn>0&&minsToOwn<=5&&alert5)widget.classList.add('preview-alert-5');
        else if(minsToOwn>5&&minsToOwn<=10&&alert10)widget.classList.add('preview-alert-10');
      }

      const html=leftHtml||(leftMain?'<div class="preview-context-main">'+leftMain+'</div>':'')+(leftSub?'<div class="preview-context-sub">'+leftSub+'</div>':'');
      const finalHtml=leftHtml+(leftSub?'<div class="preview-context-sub">'+leftSub+'</div>':'') || html;
      if(lastLabel!==leftLabel){widget.setAttribute('data-context-label',leftLabel);lastLabel=leftLabel}
      if(lastWidgetHtml!==finalHtml){widget.innerHTML=finalHtml;lastWidgetHtml=finalHtml}

      let sideHtml='';
      if(inRaceBlock&&race.after)sideHtml='<div class="pnt-label">DANACH</div><div class="pnt-group">'+esc(fmt(race.after.start))+'</div><div class="pnt-time" style="font-size:.82rem;line-height:1.05">'+esc(title(race.after))+'</div>';
      else if(waitingAfterRace&&race.after)sideHtml='<div class="pnt-label">NÄCHSTER PUNKT</div><div class="pnt-group">'+esc(fmt(race.after.start))+'</div><div class="pnt-time" style="font-size:.82rem;line-height:1.05">'+esc(title(race.after))+'</div>';
      else if(!postRacePhase&&nextOwn)sideHtml='<div class="pnt-label">MEIN NÄCHSTER TURN</div><div class="pnt-group">'+esc(group==='ALL'?(nextOwn.group||''):group)+'</div><div class="pnt-time">'+esc(fmt(nextOwn.start))+'</div>';
      else sideHtml='<div class="pnt-label">PROGRAMM</div><div class="pnt-time">—</div>';
      if(lastSideHtml!==sideHtml){side.innerHTML=sideHtml;lastSideHtml=sideHtml}

      const mode=inRaceBlock?'race':waitingAfterRace?'waiting':'normal';
      if(lastMode!==mode){widget.dataset.raceMode=mode;lastMode=mode}
    }

    render();
    setInterval(render,1000);
  });
})();