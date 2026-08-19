(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const d=frame.contentDocument;
    if(!d)return;

    const style=d.createElement('style');
    style.id='upperDashboardLayoutV6Test';
    style.textContent=`
      #upperDashboardV3{padding-top:10px!important}
      #upperDashboardV3 .ur3-head{margin:4px 1px 9px!important;padding:0 2px!important}
      #upperDashboardV3 .ur3-head #ur3Context{display:none!important}
      #upperDashboardV3 #ur3DayLabel{display:none!important}

      #upperDashboardV3 .ur6-pressure-card{
        background:#131313!important;
        border:0!important;
        border-radius:12px!important;
        padding:10px 0 2px!important;
        margin:0 0 15px!important;
        box-shadow:none!important;
      }
      #upperDashboardV3 .ur6-pressure-card .ur3-card-title{padding:0 2px 8px!important;margin:0!important}
      #upperDashboardV3 .ur6-pressure-card .ur3-card-title strong{font-size:.69rem!important;color:#d7d7d7!important;letter-spacing:.7px!important}
      #upperDashboardV3 .ur6-pressure-card .ur3-card-title span{color:#777!important;background:none!important;border:0!important;padding:0!important}

      #upperDashboardV3 .ur6-overview-card{
        background:linear-gradient(145deg,#1a1a1a,#111)!important;
        border:1px solid #4a4a4a!important;
        box-shadow:inset 3px 0 0 #ffd400,0 7px 20px rgba(0,0,0,.24)!important;
        border-radius:14px!important;
        padding:14px 14px 13px!important;
        margin:0 0 12px!important;
      }
      #upperDashboardV3 .ur6-overview-card .ur3-card-title{margin-bottom:10px!important}
      #upperDashboardV3 .ur6-overview-card .ur3-card-title strong{color:#ffd400!important;font-size:.72rem!important;letter-spacing:.9px!important}
      #upperDashboardV3 .ur6-overview-card .ur3-row{grid-template-columns:96px minmax(0,1fr)!important;padding:7px 0!important;border-color:#303030!important}
      #upperDashboardV3 .ur6-overview-card .ur3-label{font-size:.58rem!important;color:#858585!important;text-transform:uppercase!important;letter-spacing:.35px!important}
      #upperDashboardV3 .ur6-overview-card .ur3-value{font-size:.76rem!important;color:#f7f7f7!important}

      #upperDashboardV3 .ur3-quick{margin-top:0!important}
      @media(max-width:370px){
        #upperDashboardV3 .ur6-overview-card .ur3-row{grid-template-columns:84px minmax(0,1fr)!important}
      }
    `;
    d.head.appendChild(style);

    function apply(){
      const dashboard=d.getElementById('upperDashboardV3');
      if(!dashboard)return;
      const cards=[...dashboard.querySelectorAll(':scope > .ur3-card')];
      const overview=cards.find(card=>card.querySelector('#ur3Schedule'));
      const pressure=cards.find(card=>card.querySelector('#ur3TireFront'));
      const head=dashboard.querySelector(':scope > .ur3-head');
      const quick=dashboard.querySelector(':scope > .ur3-quick');
      if(!overview||!pressure||!head)return;

      overview.classList.add('ur6-overview-card');
      pressure.classList.add('ur6-pressure-card');

      // Gewünschte Reihenfolge: Reifendruck -> Überschrift Übersicht -> Übersicht -> Packliste.
      dashboard.insertBefore(pressure,head);
      if(quick){
        dashboard.insertBefore(head,overview);
        dashboard.insertBefore(overview,quick);
      }else{
        dashboard.insertBefore(head,overview);
      }

      const ctx=d.getElementById('ur3Context');if(ctx)ctx.style.display='none';
      const day=d.getElementById('ur3DayLabel');if(day)day.style.display='none';
    }

    setTimeout(apply,1200);
    setTimeout(apply,1900);
  });
})();
