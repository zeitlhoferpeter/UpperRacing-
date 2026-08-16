(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const d=frame.contentDocument;
    if(!d)return;

    const style=d.createElement('style');
    style.id='upperDashboardStyleV5';
    style.textContent=`
      #upperDashboardV3{background:linear-gradient(180deg,#0b0b0b 0%,#101010 100%)!important;padding-top:14px!important}
      .ur3-head{margin:1px 1px 12px!important}.ur3-head h2{font-size:.88rem!important;color:#f0f0f0!important}.ur3-head span{font-size:.58rem!important;color:#777!important}

      #upperDashboardV3 .ur3-card:first-of-type{
        background:linear-gradient(145deg,#1b1b1b,#111)!important;
        border:1px solid #665700!important;
        box-shadow:inset 4px 0 0 #ffd400,0 6px 18px rgba(0,0,0,.22)!important;
        border-radius:14px!important;
        padding:14px 14px 13px!important;
        margin-bottom:12px!important;
      }
      #upperDashboardV3 .ur3-card:first-of-type .ur3-card-title{margin-bottom:10px!important}
      #upperDashboardV3 .ur3-card:first-of-type .ur3-card-title strong{color:#ffd400!important;font-size:.72rem!important;letter-spacing:.9px!important}
      #upperDashboardV3 .ur3-card:first-of-type .ur3-card-title span{background:#242424;border:1px solid #3a3a3a;border-radius:999px;padding:4px 7px;color:#c7c7c7!important}
      #upperDashboardV3 .ur3-card:first-of-type .ur3-row{grid-template-columns:96px minmax(0,1fr)!important;padding:7px 0!important;border-color:#303030!important}
      #upperDashboardV3 .ur3-card:first-of-type .ur3-label{font-size:.58rem!important;color:#858585!important;text-transform:uppercase;letter-spacing:.35px}
      #upperDashboardV3 .ur3-card:first-of-type .ur3-value{font-size:.76rem!important;color:#f7f7f7!important}
      #ur3Next{font-size:.82rem!important;line-height:1.35!important}
      #ur3Group{display:inline-block!important;width:auto!important;background:#262100!important;border:1px solid #5c4e00!important;color:#ffd400!important;border-radius:999px!important;padding:4px 8px!important}

      #upperDashboardV3 .ur3-card:nth-of-type(2){
        background:#131313!important;
        border:0!important;
        border-radius:12px!important;
        padding:12px 0 2px!important;
        margin-bottom:13px!important;
        box-shadow:none!important;
      }
      #upperDashboardV3 .ur3-card:nth-of-type(2) .ur3-card-title{padding:0 2px 8px!important;margin:0!important}
      #upperDashboardV3 .ur3-card:nth-of-type(2) .ur3-card-title strong{font-size:.69rem!important;color:#d7d7d7!important}
      #upperDashboardV3 .ur3-card:nth-of-type(2) .ur3-card-title span{color:#777!important}
      .ur3-pressure{gap:8px!important}
      .ur3-pressure-box{background:linear-gradient(180deg,#191919,#101010)!important;border:1px solid #333!important;border-radius:12px!important;padding:10px 10px 11px!important}
      .ur3-pressure-box:first-child{box-shadow:inset 0 2px 0 rgba(255,255,255,.03)}
      .ur3-pressure-label{font-size:.53rem!important;color:#777!important;letter-spacing:.7px!important;margin-bottom:4px!important}
      .ur4-tire-desc{font-size:.58rem!important;color:#c6c6c6!important;min-height:2.5em!important;margin:0 0 8px!important;line-height:1.35!important}
      .ur3-pressure-input{background:#0b0b0b;border-radius:10px;padding:3px 5px 3px 7px;border:1px solid #2e2e2e;gap:5px!important}
      .ur3-pressure-input input{background:transparent!important;border:0!important;padding:7px 3px!important;font-size:1.18rem!important;text-align:left!important}
      .ur3-pressure-input input:focus{box-shadow:none!important;border:0!important;outline:none!important}
      .ur3-unit{font-size:.6rem!important;color:#777!important;padding-right:2px}
      .ur3-save-line{margin-top:8px!important;padding:0 2px!important}.ur3-save-state{font-size:.56rem!important;color:#6f6f6f!important}.ur3-open-setup{font-size:.6rem!important;background:#1c1c1c!important;border:1px solid #333!important;border-radius:999px!important;padding:6px 9px!important;color:#ddd!important}

      .ur3-quick{display:block!important;margin-top:2px!important}
      .ur3-mini{min-height:0!important;background:linear-gradient(90deg,#181818,#111)!important;border:1px solid #313131!important;border-radius:11px!important;padding:11px 12px!important;display:grid!important;grid-template-columns:92px minmax(0,1fr)!important;grid-template-areas:'k v' 'k s' 'p p'!important;align-items:center!important}
      .ur3-mini .k{grid-area:k;font-size:.56rem!important;color:#888!important}.ur3-mini .v{grid-area:v;margin:0!important;text-align:right!important;font-size:.92rem!important;color:#ffd400!important}.ur3-mini .s{grid-area:s;margin:2px 0 0!important;text-align:right!important;font-size:.57rem!important;color:#777!important}.ur3-progress{grid-area:p;margin-top:9px!important;height:5px!important;background:#222!important}
      .ur3-progress>span{background:linear-gradient(90deg,#d9b800,#ffd400)!important}

      .ur3-bottom{box-shadow:0 -8px 18px rgba(0,0,0,.22)!important}

      @media(max-width:370px){
        #upperDashboardV3 .ur3-card:first-of-type .ur3-row{grid-template-columns:84px minmax(0,1fr)!important}
        .ur3-pressure-box{padding:9px 8px 10px!important}.ur3-pressure-input input{font-size:1.08rem!important}.ur4-tire-desc{font-size:.55rem!important}
      }
    `;
    d.head.appendChild(style);
  });
})();