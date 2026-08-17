(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const style=d.createElement('style');
    style.id='previewHeaderProgramContextStyles';
    style.textContent=`
      #headerScheduleWidget.preview-program-context{
        padding:9px 10px!important;
        display:block!important;
      }
      #headerScheduleWidget.preview-program-context::before{
        content:attr(data-program-kicker)!important;
        display:block!important;
        width:100%!important;
        margin:0 0 5px!important;
        color:#929292!important;
        font-size:.52rem!important;
        font-weight:900!important;
        letter-spacing:.65px!important;
        line-height:1.1!important;
      }
      #headerScheduleWidget.preview-program-context::after{
        content:attr(data-program-main) "\A" attr(data-program-sub)!important;
        display:block!important;
        white-space:pre-line!important;
        color:#fff!important;
        font-size:1.02rem!important;
        font-weight:900!important;
        line-height:1.25!important;
      }
      #headerScheduleWidget.preview-program-context>*{display:none!important}
      #headerScheduleWidget.preview-program-context + .preview-next-turn-time{display:none!important}
    `;
    d.head.appendChild(style);

    const weekdays=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

    function mins(t){
      if(!t)return 0;
      const p=String(t).trim().replace('.',':').split(':');
      return (+p[0]||0)*60+(+p[1]||0);
    }

    function fmt(t){
      const p=String(t||'').trim().replace('.',':').split(':');
      if(p.length<2)return String(t||'');
      return String(+p[0]).padStart(2,'0')+':'+String(+p[1]).padStart(2,'0');
    }

    function data(){
      try{
        const days=JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}')||{};
        let active=w.localStorage.getItem('upper_schedule_activeday');
        if(!active||!days[active])active=Object.keys(days)[0]||'';
        return{days:days,active:active,items:Array.isArray(days[active])?days[active].slice():[]};
      }catch(_){return{days:{},active:'',items:[]}}
    }

    function selectedGroup(){return w.localStorage.getItem('upper_schedule_mygroup')||'A'}

    function belongsToSelectedTurn(item,group){
      if(!item||item.type!=='turn'||!item.start)return false;
      if(group==='ALL')return true;
      return item.group===group||item.group==='A+B+C+D';
    }

    function itemTitle(item){
      if(!item)return'Programmpunkt';
      if(item.title)return String(item.title);
      if(item.group==='Siegerehrung')return'Siegerehrung';
      if(item.group==='Pause')return'Mittagspause';
      if(item.group==='Anmeldung')return'Anmeldung';
      if(item.group==='Briefing')return'Fahrerbesprechung';
      if(item.group==='REGROUPING')return'REGROUPING';
      return String(item.group||'Programmpunkt');
    }

    function setContext(kicker,main,sub){
      const widget=d.getElementById('headerScheduleWidget');
      if(!widget)return;
      widget.classList.add('preview-program-context');
      widget.setAttribute('data-program-kicker',kicker||'PROGRAMM');
      widget.setAttribute('data-program-main',main||'');
      widget.setAttribute('data-program-sub',sub||'');
    }

    function clearContext(){
      const widget=d.getElementById('headerScheduleWidget');
      if(!widget)return;
      widget.classList.remove('preview-program-context');
      widget.removeAttribute('data-program-kicker');
      widget.removeAttribute('data-program-main');
      widget.removeAttribute('data-program-sub');
    }

    function render(){
      const state=data();
      const items=state.items.filter(function(it){return it&&it.start}).sort(function(a,b){return mins(a.start)-mins(b.start)||((a.sequence||0)-(b.sequence||0))});
      if(!state.active||!items.length){clearContext();return}

      const now=new Date();
      const todayIndex=now.getDay();
      const selectedIndex=weekdays.indexOf(state.active);

      // Kommender gewählter Tag: erster echter Punkt dieses Tages.
      if(selectedIndex>=0){
        const diff=(selectedIndex-todayIndex+7)%7;
        if(diff>0&&diff<=3){
          const first=items[0];
          setContext(state.active.toUpperCase(),fmt(first.start)+' · '+itemTitle(first),'Erster Programmpunkt');
          return;
        }
        if(diff>=4){clearContext();return}
      }

      if(selectedIndex===todayIndex){
        const nowM=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;
        const group=selectedGroup();

        const selectedActiveTurn=items.find(function(it){
          if(!belongsToSelectedTurn(it,group)||!it.end)return false;
          const start=mins(it.start),end=mins(it.end);
          return end>start&&nowM>=start&&nowM<end;
        });
        if(selectedActiveTurn){
          // Während des eigenen Turns bleibt der normale Live-Turn-Timer sichtbar.
          clearContext();
          return;
        }

        const nextTurn=items.filter(function(it){return belongsToSelectedTurn(it,group)&&mins(it.start)>nowM}).sort(function(a,b){return mins(a.start)-mins(b.start)})[0]||null;
        const minsToTurn=nextTurn?mins(nextTurn.start)-nowM:Infinity;

        // Erst ab 10 Minuten vor dem eigenen Turn übernimmt der Gruppen-Countdown.
        if(nextTurn&&minsToTurn<=10&&minsToTurn>0){
          clearContext();
          return;
        }

        // Davor zeigt der Header immer den Punkt, der auch chronologisch im Zeitplan steht.
        const activeItem=items.find(function(it){
          if(!it.end)return false;
          const start=mins(it.start),end=mins(it.end);
          return end>start&&nowM>=start&&nowM<end;
        });
        if(activeItem){
          setContext('PROGRAMM',itemTitle(activeItem),fmt(activeItem.start)+'–'+fmt(activeItem.end));
          return;
        }

        const nextItem=items.filter(function(it){return mins(it.start)>nowM}).sort(function(a,b){return mins(a.start)-mins(b.start)||((a.sequence||0)-(b.sequence||0))})[0]||null;
        if(nextItem){
          setContext('NÄCHSTER PROGRAMMPUNKT',fmt(nextItem.start)+' · '+itemTitle(nextItem),'');
          return;
        }
      }

      clearContext();
    }

    setInterval(render,750);
    setTimeout(render,500);
  });
})();