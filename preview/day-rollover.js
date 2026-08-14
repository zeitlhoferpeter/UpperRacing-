(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    function mins(t){
      if(!t)return 0;
      const p=String(t).trim().replace('.',':').split(':');
      return (+p[0]||0)*60+(+p[1]||0);
    }

    function loadDays(){
      try{return JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}')||{}}catch(_){return{}}
    }

    function belongs(item,group){
      if(!item||item.type!=='turn'||!item.start)return false;
      if(group==='ALL')return true;
      return item.group===group||item.group==='A+B+C+D';
    }

    function itemEndMins(item){
      if(!item)return 0;
      if(item.end)return mins(item.end);
      const base=mins(item.start);
      if(item.type==='turn'||item.type==='race')return base+20;
      return base+5;
    }

    function update(){
      const box=d.querySelector('.preview-next-turn-time');
      const widget=d.getElementById('headerScheduleWidget');
      if(!box||!widget)return;

      const days=loadDays();
      const keys=Object.keys(days);
      if(keys.length<2)return;

      let active=w.localStorage.getItem('upper_schedule_activeday');
      let idx=keys.indexOf(active);
      if(idx<0)idx=0;
      const current=Array.isArray(days[keys[idx]])?days[keys[idx]]:[];
      if(!current.length)return;

      const now=new Date();
      const nowMins=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
      const lastEnd=current.reduce(function(max,it){return Math.max(max,itemEndMins(it))},0);
      if(nowMins<=lastEnd)return;

      const group=w.localStorage.getItem('upper_schedule_mygroup')||'A';
      let nextDayIndex=-1,nextTurn=null;
      for(let i=idx+1;i<keys.length;i++){
        const turns=(Array.isArray(days[keys[i]])?days[keys[i]]:[])
          .filter(function(it){return belongs(it,group)})
          .sort(function(a,b){return mins(a.start)-mins(b.start)});
        if(turns.length){nextDayIndex=i;nextTurn=turns[0];break}
      }

      widget.classList.remove('preview-warning-10','preview-warning-5');
      if(!nextTurn){
        box.innerHTML='<div class="pnt-label">EVENT</div><div class="pnt-time">beendet</div>';
        return;
      }

      const dayText=nextDayIndex===idx+1?'MORGEN':keys[nextDayIndex].toUpperCase();
      const groupText=group==='ALL'?(nextTurn.group||''):'GR. '+group;
      box.innerHTML='<div class="pnt-label">NÄCHSTER TURN</div><div class="pnt-group">'+dayText+' · '+groupText+'</div><div class="pnt-time">'+nextTurn.start+'</div>';
    }

    setInterval(update,250);
    setTimeout(update,1000);
  });
})();