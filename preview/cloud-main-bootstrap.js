(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d||d.__upperCloudMainBootstrap)return;
    d.__upperCloudMainBootstrap=true;

    const migrationKey='upper_cloud_hint_migrated_main_v1';
    if(w.localStorage.getItem(migrationKey)!=='true'){
      w.localStorage.removeItem('upper_cloud_hint_version');
      w.localStorage.setItem(migrationKey,'true');
    }

    function relabel(){
      const btn=d.querySelector('.ur3-more-btn[data-page="backup"]');
      if(btn)btn.innerHTML='☁️ Konto & Cloud<span>Login, Autospeichern & Backups</span>';
    }

    relabel();
    setTimeout(relabel,300);
    setTimeout(relabel,900);
  });
})();