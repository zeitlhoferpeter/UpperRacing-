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
    `;
    d.head.appendChild(style);

    function mins(t){if(!t)return 0;const p=String(t).trim().replace('.',':').split(':');return(+p[0]||0)*60+(+p[1]||0)}
    function fmt(t){return String(t||'').trim().replace('.',':')}
    function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')}
    function loadItems(){
      try{const days=JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}');let day=w.localStorage.getItem('upper_schedule_activeday');if(!day||!days[day])day=Object.keys(days)[0];return Array.isArray(days[day])?days[day].slice():[]}catch(_){return[]}
    }
    function selectedGroup(){return w.localStorage.getItem('upper_schedule_mygroup')||'A'}
    function isTurn(it){return !!(it&&it.type==='turn'&&it.start)}
    function isOwnTurn(it,group){return isTurn(it)&&(group==='ALL'||it.group===group||it.group==='A+B+C+D')}
    function isOrga(it){return it&&(it.type==='orga'||['Anmeldung','Pause','Briefing','REGROUPING','Siegerehrung'].includes(it.group))}
    function title(it){
      if(!it)return'Programmpunkt';
      if(it.title)return String(it.title);
      if(it.group==='Anmeldung')return'Anmeldung';
      if(it.group==='Pause')return'Mittagspause';
      if(it.group==='Briefing')return'Fahrerbesprechung';
      if(it.group==='REGROUPING')return'REGROUPING';
      return String(it.group||'Programmpunkt');
    }
    function label(it){
      if(!it)return'PROGRAMM';
      if(isTurn(it))return'TURN';
      if(it.group==='Anmeldung')return'ANMELDUNG';
      if(it.group==='Pause')return'MITTAGSPAUSE';
      if(it.group==='Briefing')return'FAHRERBESPRECHUNG';
      return'PROGRAMM';
    }
    function effectiveEnd(items,index){
      const it=items[index];if(!it)return 0;
      if(it.end&&mins(it.end)>mins(it.start))return mins(it.end);
      const start=mins(it.start);
      for(let j=index+1;j<items.length;j++){const n=mins(items[j].start);if(n>start)return n}
      return start+(isTurn(it)?20:30);
    }
    function countdownText(diffMinutes){
      const totalSec=Math.max(0,Math.ceil(diffMinutes*60));
      const mm=Math.floor(totalSec/60),ss=String(totalSec%60).padStart(2,'0');
      return mm+':'+ss;
    }

    let applying=false;
    function render(){
      if(applying)return;
      const widget=d.getElementById('headerScheduleWidget'),side=d.querySelector('.preview-next-turn-time');
      if(!widget||!side)return;

      const items=loadItems().filter(it=>it&&it.start).sort((a,b)=>mins(a.start)-mins(b.start)||((a.sequence||0)-(b.sequence||0)));
      if(!items.length)return;

      const now=new Date(),nowM=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
      const group=selectedGroup();
      const trackTurns=items.filter(isTurn);
      const ownTurns=items.filter(it=>isOwnTurn(it,group));
      const nextTrack=trackTurns.find(it=>mins(it.start)>nowM)||null;
      const nextOwn=ownTurns.find(it=>mins(it.start)>nowM)||null;

      let activeIndex=-1;
      for(let i=0;i<items.length;i++){
        const start=mins(items[i].start),end=effectiveEnd(items,i);
        if(nowM>=start&&nowM<end){activeIndex=i;break}
      }
      const active=activeIndex>=0?items[activeIndex]:null;

      let leftLabel='PROGRAMM',leftMain='',leftSub='';

      if(active&&isOrga(active)){
        const after=trackTurns.find(it=>mins(it.start)>nowM)||null;
        const diff=after?mins(after.start)-nowM:Infinity;
        if(after&&diff>0&&diff<=10){
          leftLabel='TURN';
          leftMain='Nächstes: Gr. '+esc(after.group||'')+' in '+countdownText(diff);
          leftSub=fmt(after.start);
        }else{
          leftLabel=label(active);
          leftMain=esc(title(active));
          leftSub=fmt(active.start)+(effectiveEnd(items,activeIndex)>mins(active.start)?'–'+String(Math.floor(effectiveEnd(items,activeIndex)/60)).padStart(2,'0')+':'+String(Math.floor(effectiveEnd(items,activeIndex)%60)).padStart(2,'0'):'');
        }
      }else if(active&&isTurn(active)){
        const end=effectiveEnd(items,activeIndex);
        leftLabel='TURN';
        leftMain='Gr. '+esc(active.group||'')+' läuft';
        leftSub='noch '+countdownText(end-nowM);
      }else if(nextTrack){
        const diff=mins(nextTrack.start)-nowM;
        leftLabel='TURN';
        leftMain='Nächstes: Gr. '+esc(nextTrack.group||'')+' in '+countdownText(diff);
        leftSub=fmt(nextTrack.start);
      }else{
        const nextItem=items.find(it=>mins(it.start)>nowM)||null;
        if(nextItem){leftLabel=label(nextItem);leftMain=fmt(nextItem.start)+' · '+esc(title(nextItem));}
        else{leftLabel='PROGRAMM';leftMain='Tag beendet';}
      }

      applying=true;
      widget.classList.add('preview-context-mode');
      widget.classList.remove('preview-warning-10','preview-warning-5');
      widget.setAttribute('data-context-label',leftLabel);
      const html='<div class="preview-context-main">'+leftMain+'</div>'+(leftSub?'<div class="preview-context-sub">'+leftSub+'</div>':'');
      if(widget.innerHTML!==html)widget.innerHTML=html;

      let sideHtml='';
      if(nextOwn){
        sideHtml='<div class="pnt-label">MEIN NÄCHSTER TURN</div><div class="pnt-group">GR. '+esc(group==='ALL'?(nextOwn.group||''):group)+'</div><div class="pnt-time">'+esc(fmt(nextOwn.start))+'</div>';
      }else{
        sideHtml='<div class="pnt-label">MEIN NÄCHSTER TURN</div><div class="pnt-time">—</div>';
      }
      if(side.innerHTML!==sideHtml)side.innerHTML=sideHtml;
      applying=false;
    }

    const widget=d.getElementById('headerScheduleWidget');
    if(widget)new MutationObserver(function(){setTimeout(render,0)}).observe(widget,{childList:true,subtree:true,characterData:true,attributes:true});
    setInterval(render,250);
    setTimeout(render,700);
  });
})();