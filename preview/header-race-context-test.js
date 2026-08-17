(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const style=d.createElement('style');
    style.id='previewHeaderContextStyles';
    style.textContent=`
      #headerScheduleWidget.preview-context-mode::before{content:attr(data-context-label)!important}
      #headerScheduleWidget.preview-context-mode .preview-context-main{font-size:1.18rem;font-weight:900;color:#fff;line-height:1.18}
      #headerScheduleWidget.preview-context-mode .preview-context-sub{font-size:.68rem;font-weight:800;color:#aaa;margin-top:3px}
      #headerScheduleWidget.preview-context-mode .preview-turn-countdown{display:inline-flex;align-items:center;gap:10px;margin-top:4px;padding:7px 12px;border:2px solid #4a4a4a;border-radius:10px;background:#101010;box-shadow:none;font-size:1.7rem;font-weight:950;line-height:1;color:#fff;font-variant-numeric:tabular-nums;letter-spacing:.2px;transition:border-color .18s,box-shadow .18s,background .18s}
      #headerScheduleWidget.preview-context-mode .preview-turn-countdown .preview-turn-group{color:var(--turn-color,#fff);min-width:1.05em;text-align:center}
      #headerScheduleWidget.preview-context-mode .preview-turn-countdown .preview-turn-time{color:#fff}
      #headerScheduleWidget.preview-context-mode .preview-race-countdown{display:inline-flex;align-items:center;gap:10px;margin-top:4px;padding:7px 12px;border:2px solid #9C27B0;border-radius:10px;background:#161016;box-shadow:0 0 0 1px rgba(156,39,176,.15);font-size:1.28rem;font-weight:950;line-height:1;color:#fff;font-variant-numeric:tabular-nums}
      #headerScheduleWidget.preview-context-mode .preview-race-countdown .preview-race-name{color:#d48cff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px}
      #headerScheduleWidget.preview-context-mode .preview-race-countdown .preview-race-time{color:#fff}

      #headerScheduleWidget.preview-alert-10{border-color:#ffd400!important;box-shadow:0 0 0 1px rgba(255,212,0,.34),0 0 18px rgba(255,212,0,.30)!important;background:linear-gradient(145deg,#272300,#171600)!important}
      #headerScheduleWidget.preview-alert-10 .preview-turn-countdown{border-color:#ffd400!important;box-shadow:0 0 0 1px rgba(255,212,0,.22),0 0 12px rgba(255,212,0,.20)!important}

      @keyframes ur-header-alert-5{0%,100%{box-shadow:0 0 0 1px rgba(255,50,35,.42),0 0 15px rgba(255,45,25,.42)}50%{box-shadow:0 0 0 2px rgba(255,75,50,.82),0 0 28px rgba(255,45,25,.78)}}
      @keyframes ur-inner-alert-5{0%,100%{box-shadow:0 0 0 1px rgba(255,50,35,.28),0 0 8px rgba(255,45,25,.28)}50%{box-shadow:0 0 0 2px rgba(255,75,50,.70),0 0 18px rgba(255,45,25,.62)}}
      #headerScheduleWidget.preview-alert-5{border-color:#ff2d19!important;background:linear-gradient(145deg,#3b0d07,#1d0906)!important;animation:ur-header-alert-5 .85s ease-in-out infinite!important}
      #headerScheduleWidget.preview-alert-5 .preview-turn-countdown{border-color:#ff2d19!important;animation:ur-inner-alert-5 .85s ease-in-out infinite!important}

      #headerScheduleWidget.preview-own-active{border-color:#4CAF50!important;box-shadow:0 0 0 1px rgba(76,175,80,.34),0 0 18px rgba(76,175,80,.30)!important;background:linear-gradient(145deg,#102a14,#101a12)!important}
      #headerScheduleWidget.preview-own-active .preview-turn-countdown{border-color:#4CAF50!important;box-shadow:0 0 0 1px rgba(76,175,80,.22),0 0 12px rgba(76,175,80,.22)!important}
    `;
    const oldStyle=d.getElementById('previewHeaderContextStyles');if(oldStyle)oldStyle.remove();
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
    function label(it){if(!it)return'PROGRAMM';if(isTurn(it))return'TURN';if(isRace(it))return'RENNEN';if(it.group==='Anmeldung')return'ANMELDUNG';if(it.group==='Pause')return'MITTAGSPAUSE';if(it.group==='Briefing')return'FAHRERBESPRECHUNG';return'PROGRAMM'}
    function groupColor(group){if(group==='A')return'#4CAF50';if(group==='B')return'#2196F3';if(group==='C')return'#FF9800';if(group==='D')return'#E91E63';if(group==='A+B+C+D')return'#FFD700';return'#888'}
    function effectiveEnd(items,index){const it=items[index];if(!it)return 0;if(it.end&&mins(it.end)>mins(it.start))return mins(it.end);const start=mins(it.start);for(let j=index+1;j<items.length;j++){const n=mins(items[j].start);if(n>start)return n}return start+(isTurn(it)?20:30)}
    function countdownText(diffMinutes){const totalSec=Math.max(0,Math.ceil(diffMinutes*60));const mm=Math.floor(totalSec/60),ss=String(totalSec%60).padStart(2,'0');return mm+':'+ss}
    function turnCountdown(group,time){return '<div class="preview-turn-countdown" style="--turn-color:'+groupColor(group)+'"><span class="preview-turn-group">'+esc(group||'')+'</span><span class="preview-turn-time">'+esc(time)+'</span></div>'}
    function raceCountdown(name,time){return '<div class="preview-race-countdown"><span class="preview-race-name">🏁 '+esc(name)+'</span><span class="preview-race-time">'+esc(time)+'</span></div>'}

    function estimatedRaceBlock(items,nowM){
      const races=items.filter(isRace).sort((a,b)=>mins(a.start)-mins(b.start)||((a.sequence||0)-(b.sequence||0)));
      if(!races.length)return null;
      const firstStart=mins(races[0].start);
      const sequential=races.filter(r=>mins(r.start)===firstStart);
      const block=sequential.length>1?sequential:races;
      const blockEnd=firstStart+block.length*RACE_ESTIMATE_MIN;
      if(nowM<firstStart||nowM>=blockEnd)return null;
      const idx=Math.min(block.length-1,Math.floor((nowM-firstStart)/RACE_ESTIMATE_MIN));
      const current=block[idx];
      const estStart=firstStart+idx*RACE_ESTIMATE_MIN;
      const estEnd=estStart+RACE_ESTIMATE_MIN;
      return{current,index:idx,start:estStart,end:estEnd,blockEnd,count:block.length};
    }

    let applying=false;
    function render(){
      if(applying)return;
      const widget=d.getElementById('headerScheduleWidget'),side=d.querySelector('.preview-next-turn-time');if(!widget||!side)return;
      const items=loadItems().filter(it=>it&&it.start).sort((a,b)=>mins(a.start)-mins(b.start)||((a.sequence||0)-(b.sequence||0)));if(!items.length)return;
      const now=new Date(),nowM=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
      const group=selectedGroup();
      const trackTurns=items.filter(isTurn),ownTurns=items.filter(it=>isOwnTurn(it,group));
      const nextTrack=trackTurns.find(it=>mins(it.start)>nowM)||null;
      const nextOwn=ownTurns.find(it=>mins(it.start)>nowM)||null;
      const minsToOwn=nextOwn?mins(nextOwn.start)-nowM:Infinity;
      const raceBlock=estimatedRaceBlock(items,nowM);

      let activeIndex=-1;
      for(let i=0;i<items.length;i++){if(isRace(items[i]))continue;const start=mins(items[i].start),end=effectiveEnd(items,i);if(nowM>=start&&nowM<end){activeIndex=i;break}}
      const active=activeIndex>=0?items[activeIndex]:null;
      const ownActive=!!(active&&isOwnTurn(active,group));

      let leftLabel='PROGRAMM',leftMain='',leftSub='',leftHtml='';
      if(raceBlock){
        leftLabel='RENNEN';
        leftHtml=raceCountdown(title(raceBlock.current),countdownText(raceBlock.end-nowM));
        leftSub='ca. '+RACE_ESTIMATE_MIN+' Min. pro Rennen';
      }else if(active&&isOrga(active)){
        const after=trackTurns.find(it=>mins(it.start)>nowM)||null,diff=after?mins(after.start)-nowM:Infinity;
        if(after&&diff>0&&diff<=10){leftLabel='TURN';leftHtml=turnCountdown(after.group,countdownText(diff));leftSub=fmt(after.start)}
        else{leftLabel=label(active);leftMain=esc(title(active));leftSub=fmt(active.start)+(effectiveEnd(items,activeIndex)>mins(active.start)?'–'+String(Math.floor(effectiveEnd(items,activeIndex)/60)).padStart(2,'0')+':'+String(Math.floor(effectiveEnd(items,activeIndex)%60)).padStart(2,'0'):'')}
      }else if(active&&isTurn(active)){
        const end=effectiveEnd(items,activeIndex);leftLabel='TURN';leftHtml=turnCountdown(active.group,countdownText(end-nowM));
      }else if(nextTrack){
        const diff=mins(nextTrack.start)-nowM;leftLabel='TURN';leftHtml=turnCountdown(nextTrack.group,countdownText(diff));leftSub=fmt(nextTrack.start);
      }else{
        const nextItem=items.find(it=>mins(it.start)>nowM)||null;if(nextItem){leftLabel=label(nextItem);leftMain=fmt(nextItem.start)+' · '+esc(title(nextItem))}else{leftLabel='PROGRAMM';leftMain='Tag beendet'}
      }

      applying=true;
      widget.classList.add('preview-context-mode');widget.classList.remove('preview-warning-10','preview-warning-5','preview-alert-10','preview-alert-5','preview-own-active');
      const alert10=w.localStorage.getItem('upper_schedule_alert10m')!=='false',alert5=w.localStorage.getItem('upper_schedule_alert5m')!=='false';
      if(!raceBlock){if(ownActive)widget.classList.add('preview-own-active');else if(minsToOwn>0&&minsToOwn<=5&&alert5)widget.classList.add('preview-alert-5');else if(minsToOwn>5&&minsToOwn<=10&&alert10)widget.classList.add('preview-alert-10')}
      widget.setAttribute('data-context-label',leftLabel);
      const html=leftHtml||(leftMain?'<div class="preview-context-main">'+leftMain+'</div>':'')+(leftSub?'<div class="preview-context-sub">'+leftSub+'</div>':'');
      const finalHtml=leftHtml+(leftSub?'<div class="preview-context-sub">'+leftSub+'</div>':'') || html;if(widget.innerHTML!==finalHtml)widget.innerHTML=finalHtml;

      let sideHtml='';
      if(raceBlock){sideHtml='<div class="pnt-label">RENNBLOCK</div><div class="pnt-group">'+esc((raceBlock.index+1)+'/'+raceBlock.count)+'</div><div class="pnt-time">ca.</div>'}
      else if(nextOwn){sideHtml='<div class="pnt-label">MEIN NÄCHSTER TURN</div><div class="pnt-group">'+esc(group==='ALL'?(nextOwn.group||''):group)+'</div><div class="pnt-time">'+esc(fmt(nextOwn.start))+'</div>'}
      else{sideHtml='<div class="pnt-label">MEIN NÄCHSTER TURN</div><div class="pnt-time">—</div>'}
      if(side.innerHTML!==sideHtml)side.innerHTML=sideHtml;applying=false;
    }

    setInterval(render,250);setTimeout(render,700);
  });
})();