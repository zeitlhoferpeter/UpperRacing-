(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;
  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    // Einmalige Test-Migration: neuen Cloud-Hinweis erneut zeigen,
    // ohne ihn bei jedem Start zurückzusetzen.
    const migrationKey='upper_cloud_hint_migrated_v3';
    if(w.localStorage.getItem(migrationKey)!=='true'){
      w.localStorage.removeItem('upper_cloud_hint_version');
      w.localStorage.setItem(migrationKey,'true');
    }

    // Im neuen Dashboard klar benennen, wo Login und Cloud zu finden sind.
    function relabel(){
      const btn=d.querySelector('.ur3-more-btn[data-page="backup"]');
      if(btn){
        btn.innerHTML='☁️ Konto & Cloud<span>Login, Autospeichern & Backups</span>';
      }
    }
    relabel();
    setTimeout(relabel,300);
    setTimeout(relabel,900);
  });
})();
