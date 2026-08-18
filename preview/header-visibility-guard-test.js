(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const d=frame.contentDocument;
    if(!d)return;

    function ensureHeader(){
      const header=d.querySelector('.app-header');
      if(!header)return;
      header.style.setProperty('display','block','important');
      header.style.setProperty('visibility','visible','important');
      header.style.setProperty('opacity','1','important');
    }

    ensureHeader();
    setTimeout(ensureHeader,250);
    setTimeout(ensureHeader,800);

    const observer=new MutationObserver(function(mutations){
      for(const m of mutations){
        if(m.type==='attributes'){
          const t=m.target;
          if(t&&t.classList&&t.classList.contains('app-header')){ensureHeader();return;}
        }
      }
      ensureHeader();
    });

    observer.observe(d.documentElement,{subtree:true,attributes:true,attributeFilter:['style','class']});

    d.addEventListener('change',function(){setTimeout(ensureHeader,0);setTimeout(ensureHeader,120)},true);
    d.addEventListener('click',function(){setTimeout(ensureHeader,0);setTimeout(ensureHeader,180)},true);
    frame.contentWindow.addEventListener('storage',function(){setTimeout(ensureHeader,0)});
  });
})();
