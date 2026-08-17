(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;
  frame.addEventListener('load',function(){
    const d=frame.contentDocument;
    if(!d||d.getElementById('upperHeaderFrameCleanOverride'))return;
    const style=d.createElement('style');
    style.id='upperHeaderFrameCleanOverride';
    style.textContent=`
      .app-container{padding-top:7px!important}
      .app-header{
        position:relative!important;
        box-sizing:border-box!important;
        margin:0 8px 20px!important;
        border:1px solid #292929!important;
        border-radius:15px!important;
        background:linear-gradient(180deg,#121212 0%,#0c0c0c 100%)!important;
        box-shadow:0 8px 24px rgba(0,0,0,.32),0 1px 0 rgba(255,255,255,.025) inset!important;
        overflow:hidden!important;
      }
      .app-header:before{
        content:''!important;
        position:absolute!important;
        left:14px!important;
        top:0!important;
        width:118px!important;
        height:3px!important;
        border-radius:0 0 3px 3px!important;
        background:linear-gradient(90deg,#f3cf18 0%,#e7bd13 44%,#d44631 78%,#e53935 100%)!important;
        opacity:.9!important;
        pointer-events:none!important;
      }
      .app-header:after{
        content:''!important;
        position:absolute!important;
        left:18px!important;
        right:18px!important;
        bottom:0!important;
        height:1px!important;
        background:rgba(255,255,255,.055)!important;
        opacity:1!important;
        pointer-events:none!important;
      }
      .header-brand-row{padding-top:3px!important}
      main{border-top:1px solid #202020!important;padding-top:12px!important}
      main:before{display:none!important;content:none!important}
      @media(max-width:360px){
        .app-header{margin-left:6px!important;margin-right:6px!important;border-radius:13px!important}
        .app-header:before{left:12px!important;width:104px!important}
      }
    `;
    d.head.appendChild(style);
  });
})();
