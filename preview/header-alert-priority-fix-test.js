(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d||d.__upperHeaderAlertPriorityFixTest)return;
    d.__upperHeaderAlertPriorityFixTest=true;

    const style=d.createElement('style');
    style.id='upperHeaderAlertPriorityFixStyles';
    style.textContent=`
      @keyframes ur-test-header-alert-5{
        0%,100%{box-shadow:0 0 0 1px rgba(255,50,35,.42),0 0 16px rgba(255,45,25,.42)!important}
        50%{box-shadow:0 0 0 2px rgba(255,75,50,.86),0 0 30px rgba(255,45,25,.80)!important}
      }
      .app-header.ur-turn-alert-10{
        border-color:#ffd400!important;
        background:linear-gradient(145deg,#272300 0%,#171600 100%) padding-box,
                   linear-gradient(115deg,#ffd400 0%,#ffd400 100%) border-box!important;
        box-shadow:0 0 0 1px rgba(255,212,0,.34),0 0 20px rgba(255,212,0,.34)!important;
      }
      .app-header.ur-turn-alert-5{
        border-color:#ff2d19!important;
        background:linear-gradient(145deg,#3b0d07 0%,#1d0906 100%) padding-box,
                   linear-gradient(115deg,#ff2d19 0%,#ff5a43 100%) border-box!important;
        animation:ur-test-header-alert-5 .85s ease-in-out infinite!important;
      }
      .app-header.ur-turn-own-active{
        border-color:#4CAF50!important;
        background:linear-gradient(145deg,#102a14 0%,#101a12 100%) padding-box,
                   linear-gradient(115deg,#4CAF50 0%,#74d17b 100%) border-box!important;
        box-shadow:0 0 0 1px rgba(76,175,80,.36),0 0 22px rgba(76,175,80,.34)!important;
        animation:none!important;
      }
      .app-header.ur-turn-own-active #headerRaceScheduleWidget{
        border-color:#4CAF50!important;
        background:linear-gradient(145deg,#102a14,#101a12)!important;
        box-shadow:0 0 0 1px rgba(76,175,80,.34),0 0 18px rgba(76,175,80,.30)!important;
      }
      .app-header.ur-turn-own-active #headerRaceScheduleWidget .preview-turn-countdown{
        border-color:#4CAF50!important;
        box-shadow:0 0 0 1px rgba(76,175,80,.22),0 0 12px rgba(76,175,80,.22)!important;
      }
    `;
    d.head.appendChild(style);

    function mins(t){
      if(!t)return NaN;
      const p=String(t).trim().replace('.',':').split(':');
      if(p.length<2)return NaN;
      const h=Number(p[0]),m=Number(p[1]);
      return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:NaN;
    }
    function loadItems(){
      try{
        const days=JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}')||{};
        let day=w.localStorage.getItem('upper_schedule_activeday');
        if(!day||!days[day])day=Object.keys(days)[0];
        return Array.isArray(days[day])?days[day].filter(it=>it&&it.start).slice().sort((a,b)=>mins(a.start)-mins(b.start)||((a.sequence||0)-(b.sequence||0))):[];
      }catch(_){return[]}
    }
    function selectedGroup(){return w.localStorage.getItem('upper_schedule_mygroup')||'A'}
    function isTurn(it){return !!(it&&it.type==='turn'&&it.start)}
    function isOwnTurn(it,group){return isTurn(it)&&(group==='ALL'||it.group===group||it.group==='A+B+C+D')}
    function effectiveEnd(items,index){
      const it=items[index];
      if(!it)return NaN;
      const start=mins(it.start);
      const explicit=mins(it.end);
      if(Number.isFinite(explicit)&&explicit>start)return explicit;
      for(let j=index+1;j<items.length;j++){
        const next=mins(items[j].start);
        if(Number.isFinite(next)&&next>start)return next;
      }
      return start+20;
    }

    function apply(){
      const header=d.querySelector('.app-header');
      const widget=d.getElementById('headerRaceScheduleWidget');
      if(!header||!widget)return;

      const items=loadItems();
      const group=selectedGroup();
      const now=new Date();
      const nowM=now.getHours()*60+now.getMinutes()+now.getSeconds()/60;

      let ownActive=false;
      for(let i=0;i<items.length;i++){
        if(!isOwnTurn(items[i],group))continue;
        const start=mins(items[i].start),end=effectiveEnd(items,i);
        if(Number.isFinite(start)&&Number.isFinite(end)&&nowM>=start&&nowM<end){ownActive=true;break}
      }

      const nextOwn=items.find(it=>isOwnTurn(it,group)&&mins(it.start)>nowM)||null;
      const diff=nextOwn?mins(nextOwn.start)-nowM:Infinity;
      const alert10=w.localStorage.getItem('upper_schedule_alert10m')!=='false';
      const alert5=w.localStorage.getItem('upper_schedule_alert5m')!=='false';

      header.classList.remove('ur-turn-alert-10','ur-turn-alert-5','ur-turn-own-active');

      if(ownActive){
        header.classList.add('ur-turn-own-active');
        widget.classList.remove('preview-alert-10','preview-alert-5');
        widget.classList.add('preview-own-active');
        return;
      }

      widget.classList.remove('preview-own-active');
      if(diff>0&&diff<=5&&alert5){
        header.classList.add('ur-turn-alert-5');
        widget.classList.remove('preview-alert-10');
        widget.classList.add('preview-alert-5');
      }else if(diff>5&&diff<=10&&alert10){
        header.classList.add('ur-turn-alert-10');
        widget.classList.remove('preview-alert-5');
        widget.classList.add('preview-alert-10');
      }else{
        widget.classList.remove('preview-alert-10','preview-alert-5');
      }
    }

    apply();
    setInterval(apply,250);
    d.addEventListener('change',apply,true);
    w.addEventListener('storage',apply);
  });
})();
