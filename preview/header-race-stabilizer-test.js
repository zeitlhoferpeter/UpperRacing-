(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const d=frame.contentDocument;
    if(!d||d.__upperRaceHeaderStabilizer)return;
    d.__upperRaceHeaderStabilizer=true;

    const widget=d.getElementById('headerScheduleWidget');
    const side=d.querySelector('.preview-next-turn-time');
    if(!widget||!side)return;

    let lastWidgetHtml='';
    let lastSideHtml='';
    let lastLabel='';
    let armed=false;
    let restoring=false;

    function isRaceHeaderOwned(){
      return !!widget.querySelector('.preview-race-list,.preview-context-main,.preview-turn-countdown');
    }

    function capture(){
      if(!isRaceHeaderOwned())return false;
      lastWidgetHtml=widget.innerHTML;
      lastSideHtml=side.innerHTML;
      lastLabel=widget.getAttribute('data-context-label')||'';
      armed=true;
      return true;
    }

    function restore(){
      if(!armed||restoring)return;
      restoring=true;
      if(widget.innerHTML!==lastWidgetHtml)widget.innerHTML=lastWidgetHtml;
      if(side.innerHTML!==lastSideHtml)side.innerHTML=lastSideHtml;
      if((widget.getAttribute('data-context-label')||'')!==lastLabel)widget.setAttribute('data-context-label',lastLabel);
      restoring=false;
    }

    const widgetObserver=new MutationObserver(function(){
      if(restoring)return;
      if(isRaceHeaderOwned()){
        // Nur ein gueltiger Schreibvorgang der Race-Header-Logik darf
        // Widget UND rechte Statusbox gemeinsam als neuen Stand speichern.
        Promise.resolve().then(function(){
          if(isRaceHeaderOwned())capture();
        });
      }else if(armed){
        restore();
      }
    });
    widgetObserver.observe(widget,{childList:true,subtree:true,characterData:true});

    const sideObserver=new MutationObserver(function(){
      if(restoring||!armed)return;
      // Die alte Preview-Logik aktualisiert diese Box weiterhin alle 500 ms.
      // Solche isolierten Aenderungen duerfen NICHT als gueltiger neuer Stand
      // uebernommen werden, sonst flackert z. B. zwischen Rennblock und
      // Siegerehrung kurz wieder der spaetere freie Turn auf.
      if(side.innerHTML!==lastSideHtml)restore();
    });
    sideObserver.observe(side,{childList:true,subtree:true,characterData:true});

    setTimeout(capture,760);
  });
})();
