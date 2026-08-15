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
      #headerScheduleWidget.preview-context-mode .preview-context-time{font-size:1.18rem;font-weight:900;color:#fff;line-height:1.15}
      #headerScheduleWidget.preview-context-mode .preview-context-note{font-size:.68rem;font-weight:800;color:#aaa}
    `;
    d.head.appendChild(style);

    function mins(t){if(!t)return 0;const p=String(t).trim().replace('.',':').split(':');return(+p[0]||0)*60+(+p[1]||0)}
    function fmtTime(t){return String(t||'').trim().replace('.',':')}
    function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
    function loadItems(){
      try{const days=JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}');let day=w.localStorage.getItem('upper_schedule_activeday');if(!day||!days[day])day=Object.keys(days)[0];return Array.isArray(days[day])?days[day].slice():[]}catch(_){return[]}
    }
    function isOrga(it){return it&&(it.type==='orga'||['Anmeldung','Pause','Briefing','REGROUPING','Siegerehrung'].includes(it.group))}
    function contextLabel(it){
      if(!it)return'PROGRAMM';
      if(it.group==='Anmeldung')return'ANMELDUNG';
      if(it.group==='Pause')return'MITTAGSPAUSE';
      if(it.group==='Briefing')return/String(it.title||'Fahrerbesprechung').toUpperCase();
      if(it.group==='REGROUPING')return'REGROUPING';
      if(it.group==='Siegerehrung')return'SIEGEREHRUNG';
      return String(it.title||'PROGRAMM').toUpperCase();
    }
    function effectiveEnd(items,index){
      const it=items[index];if(!it)return 0;
      if(it.end&&mins(it.end)>mins(it.start))return mins(it.end);
      const start=mins(it.start);
      for(let j=index+1;j<items.length;j++){const n=mins(items[j].start);if(n>start)return n}
      return start+30;
    }
    function nextTurnAfter(items,startM){return items.find(it=>it&&it.type==='turn'&&it.start&&mins(it.start)>startM)||null}
    function displayRange(it,endM){const start=fmtTime(it.start);const end=it.end?fmtTime(it.end):(endM>mins(it.start)?String(Math.floor(endM/60)).padStart(2,'0')+':'+String(Math.round(endM%60)).padStart(2,'0'):'');return end?start+'–'+end:start}

    let applying=false;
    function render(){
      if(applying)return;
      const widget=d.getElementById('headerScheduleWidget'),side=d.querySelector('.preview-next-turn-time');if(!widget||!side)return;
      const items=loadItems().filter(it=>it&&it.start).sort((a,b)=>mins(a.start)-mins(b.start)||((a.sequence||0)-(b.sequence||0)));
      if(!items.length){widget.classList.remove('preview-context-mode');widget.removeAttribute('data-context-label');return}

      const now=new Date(),nowM=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
      let latestContext=null,latestIndex=-1,activeContext=null,activeEnd=0;

      for(let i=0;i<items.length;i++){
        const it=items[i];if(!isOrga(it)||mins(it.start)>nowM)continue;
        const endM=effectiveEnd(items,i);
        if(nowM>=mins(it.start)&&nowM<endM){activeContext=it;activeEnd=endM}
        const firstTurn=nextTurnAfter(items,mins(it.start));
        if(firstTurn&&nowM<mins(firstTurn.start)){latestContext={item:it,index:i,firstTurn:firstTurn,endM:endM};latestIndex=i}
      }

      let mode=null;
      if(latestContext){
        const diff=mins(latestContext.firstTurn.start)-nowM;
        if(diff>0&&diff<=10)mode={type:'restart',turn:latestContext.firstTurn,diff:diff};
        else if(diff>10)mode={type:'orga',item:latestContext.item,endM:latestContext.endM,firstTurn:latestContext.firstTurn};
      }else if(activeContext){
        mode={type:'orga',item:activeContext,endM:activeEnd,firstTurn:null};
      }

      if(!mode){widget.classList.remove('preview-context-mode');widget.removeAttribute('data-context-label');return}

      applying=true;
      widget.classList.add('preview-context-mode');widget.classList.remove('preview-warning-10','preview-warning-5');
      if(mode.type==='restart'){
        const totalSec=Math.max(0,Math.round(mode.diff*60)),mm=Math.floor(totalSec/60),ss=String(totalSec%60).padStart(2,'0');
        widget.setAttribute('data-context-label','TURN');
        const html='<span class="turn-group-badge my-group">Gr. '+esc(mode.turn.group||'A')+'</span><span class="turn-time-rem">⏳ '+mm+':'+ss+'</span>';
        if(widget.innerHTML!==html)widget.innerHTML=html;
        const sideHtml='<div class="pnt-label">ERSTER TURN</div><div class="pnt-group">GR. '+esc(mode.turn.group||'A')+'</div><div class="pnt-time">'+esc(fmtTime(mode.turn.start))+'</div>';
        if(side.innerHTML!==sideHtml)side.innerHTML=sideHtml;
        const alert10=w.localStorage.getItem('upper_schedule_alert10m')!=='false',alert5=w.localStorage.getItem('upper_schedule_alert5m')!=='false';
        if(mode.diff<=5&&alert5)widget.classList.add('preview-warning-5');else if(mode.diff>5&&mode.diff<=10&&alert10)widget.classList.add('preview-warning-10');
      }else{
        widget.setAttribute('data-context-label',contextLabel(mode.item));
        const range=displayRange(mode.item,mode.endM);
        const html='<span class="preview-context-time">'+esc(range)+'</span>';
        if(widget.innerHTML!==html)widget.innerHTML=html;
        if(mode.firstTurn){const sideHtml='<div class="pnt-label">ERSTER TURN</div><div class="pnt-group">GR. '+esc(mode.firstTurn.group||'A')+'</div><div class="pnt-time">'+esc(fmtTime(mode.firstTurn.start))+'</div>';if(side.innerHTML!==sideHtml)side.innerHTML=sideHtml}
        else{const sideHtml='<div class="pnt-label">PROGRAMM</div><div class="pnt-time">läuft</div>';if(side.innerHTML!==sideHtml)side.innerHTML=sideHtml}
      }
      applying=false;
    }

    const widget=d.getElementById('headerScheduleWidget');
    if(widget)new MutationObserver(function(){setTimeout(render,0)}).observe(widget,{childList:true,subtree:true,characterData:true,attributes:true});
    setInterval(render,200);setTimeout(render,700);
  });
})();