(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const weekdays=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

    function mins(t){
      if(!t)return NaN;
      const p=String(t).trim().replace('.',':').split(':');
      if(p.length<2)return NaN;
      const h=Number(p[0]),m=Number(p[1]);
      return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:NaN;
    }

    function fmtMinutes(total){
      total=Math.max(0,Math.round(total));
      return String(Math.floor(total/60)%24).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
    }

    function data(){
      try{
        const days=JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}')||{};
        let active=w.localStorage.getItem('upper_schedule_activeday');
        if(!active||!days[active])active=Object.keys(days)[0]||'';
        const items=(Array.isArray(days[active])?days[active]:[])
          .filter(it=>it&&it.start&&Number.isFinite(mins(it.start)))
          .slice()
          .sort((a,b)=>mins(a.start)-mins(b.start)||Number(a.sequence||0)-Number(b.sequence||0));
        return{days,active,items};
      }catch(_){return{days:{},active:'',items:[]}}
    }

    function selectedGroup(){return w.localStorage.getItem('upper_schedule_mygroup')||'A'}

    function isOwnTurn(item,group){
      if(!item||item.type!=='turn')return false;
      if(group==='ALL')return true;
      return item.group===group||item.group==='A+B+C+D';
    }

    function itemTitle(item){
      if(!item)return'Programmpunkt';
      if(item.title)return String(item.title);
      if(item.group==='Pause')return'Mittagspause';
      if(item.group==='Anmeldung')return'Anmeldung';
      if(item.group==='Briefing')return'Fahrerbesprechung';
      if(item.group==='REGROUPING')return'REGROUPING';
      if(item.group==='Siegerehrung')return'Siegerehrung';
      return String(item.group||'Programmpunkt');
    }

    function effectiveEnd(items,index){
      const item=items[index];
      const start=mins(item.start);
      const explicit=mins(item.end);
      if(Number.isFinite(explicit)&&explicit>start)return explicit;
      for(let i=index+1;i<items.length;i++){
        const n=mins(items[i].start);
        if(Number.isFinite(n)&&n>start)return n;
      }
      return start+20;
    }

    function selectedDayIsLive(state,now){
      const idx=weekdays.indexOf(state.active);
      if(idx>=0)return idx===now.getDay();
      return !!state.active;
    }

    function writeProgram(widget,kicker,title,timeText){
      widget.classList.remove('preview-warning-10','preview-warning-5');
      widget.innerHTML=
        '<div class="header-status-label">'+kicker+'</div>'+ 
        '<div class="header-status-value" style="line-height:1.2">'+title+'</div>'+ 
        (timeText?'<div style="font-size:.62rem;color:#969696;font-weight:800;margin-top:4px">'+timeText+'</div>':'');
      widget.dataset.upperProgramOwned='1';
    }

    function release(widget){
      if(widget.dataset.upperProgramOwned==='1')delete widget.dataset.upperProgramOwned;
    }

    function render(){
      const widget=d.getElementById('headerScheduleWidget');
      if(!widget)return;
      const state=data();
      if(!state.active||!state.items.length){release(widget);return}

      const now=new Date();
      if(!selectedDayIsLive(state,now)){release(widget);return}

      const nowM=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
      const group=selectedGroup();

      // Die gewohnte A-D-Logik bekommt exakt in den letzten 10 Minuten vor
      // dem eigenen Turn und während des eigenen Turns wieder freie Hand.
      const nextOwn=state.items.find(it=>isOwnTurn(it,group)&&mins(it.start)>nowM)||null;
      const ownActive=state.items.some((it,i)=>isOwnTurn(it,group)&&nowM>=mins(it.start)&&nowM<effectiveEnd(state.items,i));
      if(ownActive||(nextOwn&&mins(nextOwn.start)-nowM<=10&&mins(nextOwn.start)-nowM>0)){
        release(widget);
        return;
      }

      // Außerhalb dieses 10-Minuten-Fensters bestimmt ausschließlich der
      // chronologische Zeitplan, was im Header steht.
      let activeIndex=-1;
      for(let i=0;i<state.items.length;i++){
        const start=mins(state.items[i].start),end=effectiveEnd(state.items,i);
        if(nowM>=start&&nowM<end){activeIndex=i;break}
      }

      if(activeIndex>=0){
        const item=state.items[activeIndex];
        const end=effectiveEnd(state.items,activeIndex);
        writeProgram(widget,'PROGRAMM',itemTitle(item),String(item.start).replace('.',':')+'–'+fmtMinutes(end));
        return;
      }

      const next=state.items.find(it=>mins(it.start)>nowM)||null;
      if(next){
        writeProgram(widget,'NÄCHSTER PROGRAMMPUNKT',itemTitle(next),String(next.start).replace('.',':'));
        return;
      }

      release(widget);
    }

    // Die Basis-Zeitplanlogik aktualisiert denselben Header regelmäßig. Darum
    // setzen wir die Programmanzeige bewusst häufiger danach wieder korrekt.
    setInterval(render,200);
    setTimeout(render,100);
  });
})();