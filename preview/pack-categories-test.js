(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d||d.__upperPackCategoriesTest)return;
    d.__upperPackCategoriesTest=true;

    function esc(value){
      return String(value==null?'':value)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#039;');
    }

    function getChecked(){
      try{return JSON.parse(w.localStorage.getItem('upper_pack_checked')||'{}')||{}}catch(_){return{}}
    }

    function saveChecked(data){
      w.localStorage.setItem('upper_pack_checked',JSON.stringify(data||{}));
    }

    function saveCategories(categories){
      w.localStorage.setItem('upper_pack_list',JSON.stringify(categories));
    }

    w.addPackCategory=function(){
      const input=d.getElementById('new_pack_category_input');
      if(!input)return;
      const title=input.value.trim();
      if(!title)return;
      const categories=w.getPackData();
      categories.push({title:title,items:[]});
      saveCategories(categories);
      w.renderPackList();
    };

    w.renamePackCategory=function(cIndex){
      const categories=w.getPackData();
      const cat=categories[cIndex];
      if(!cat)return;
      const next=w.prompt('Kategorie umbenennen:',cat.title||'');
      if(next===null)return;
      const title=next.trim();
      if(!title)return;
      cat.title=title;
      saveCategories(categories);
      w.renderPackList();
    };

    w.deletePackCategory=function(cIndex){
      const categories=w.getPackData();
      const cat=categories[cIndex];
      if(!cat)return;
      if(!w.confirm('Möchtest du die Kategorie "'+(cat.title||'Kategorie')+'" inklusive aller Gegenstände wirklich löschen?'))return;

      categories.splice(cIndex,1);
      saveCategories(categories);

      const oldChecked=getChecked();
      const nextChecked={};
      Object.keys(oldChecked).forEach(function(key){
        const m=key.match(/^(\d+)_(\d+)$/);
        if(!m)return;
        let ci=Number(m[1]),ii=Number(m[2]);
        if(ci===cIndex)return;
        if(ci>cIndex)ci--;
        if(oldChecked[key])nextChecked[ci+'_'+ii]=true;
      });
      saveChecked(nextChecked);
      w.renderPackList();
    };

    // Beim Löschen eines Gegenstands Häkchen derselben Kategorie sauber nachrücken.
    w.deletePackItem=function(cIndex,iIndex){
      const categories=w.getPackData();
      if(!categories[cIndex]||!categories[cIndex].items)return;
      const itemName=categories[cIndex].items[iIndex];
      if(!w.confirm('Möchtest du "'+itemName+'" wirklich aus der Packliste löschen?'))return;

      categories[cIndex].items.splice(iIndex,1);
      saveCategories(categories);

      const oldChecked=getChecked();
      const nextChecked={};
      Object.keys(oldChecked).forEach(function(key){
        const m=key.match(/^(\d+)_(\d+)$/);
        if(!m)return;
        const ci=Number(m[1]);
        let ii=Number(m[2]);
        if(ci===cIndex){
          if(ii===iIndex)return;
          if(ii>iIndex)ii--;
        }
        if(oldChecked[key])nextChecked[ci+'_'+ii]=true;
      });
      saveChecked(nextChecked);
      w.renderPackList();
    };

    w.renderPackList=function(){
      const container=d.getElementById('packContainer');
      if(!container)return;

      const categories=w.getPackData();
      const checkedItems=getChecked();
      let html='';

      html += '<div class="setup-box" style="margin-bottom:12px;border-color:#4a4a4a;">'
        +'<div style="font-size:.72rem;font-weight:900;color:#FFD700;letter-spacing:.5px;margin-bottom:8px;">KATEGORIEN VERWALTEN</div>'
        +'<div style="display:flex;gap:6px;">'
        +'<input type="text" id="new_pack_category_input" placeholder="Neue Kategorie hinzufügen..." style="flex:1;min-width:0;padding:8px;background:#111;border:1px solid #444;color:#fff;border-radius:6px;font-size:.85rem;">'
        +'<button type="button" onclick="addPackCategory()" style="background:#2196F3;color:#fff;border:none;padding:8px 11px;border-radius:6px;cursor:pointer;font-size:.82rem;font-weight:800;">+ Hinzufügen</button>'
        +'</div></div>';

      categories.forEach(function(cat,cIndex){
        html += '<div class="setup-box" style="margin-bottom:12px;">'
          +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">'
          +'<h3 style="margin:0;font-size:1rem;color:#FFD700;min-width:0;overflow:hidden;text-overflow:ellipsis;">'+esc(cat.title)+'</h3>'
          +'<div style="display:flex;gap:2px;flex:0 0 auto;">'
          +'<button type="button" onclick="renamePackCategory('+cIndex+')" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:.95rem;padding:4px 6px;" title="Kategorie umbenennen">✏️</button>'
          +'<button type="button" onclick="deletePackCategory('+cIndex+')" style="background:none;border:none;color:#f44336;cursor:pointer;font-size:.95rem;padding:4px 6px;" title="Kategorie löschen">🗑️</button>'
          +'</div></div>'
          +'<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">';

        (cat.items||[]).forEach(function(item,iIndex){
          const uniqueKey=cIndex+'_'+iIndex;
          const isChecked=!!checkedItems[uniqueKey];
          const textStyle=isChecked?'text-decoration:line-through;color:#777;':'color:#fff;';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;">'
            +'<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:.9rem;flex:1;min-width:0;">'
            +'<input type="checkbox" '+(isChecked?'checked':'')+' onchange="togglePackItem('+cIndex+','+iIndex+')" style="width:18px;height:18px;accent-color:#4CAF50;cursor:pointer;">'
            +'<span style="'+textStyle+'">'+esc(item)+'</span></label>'
            +'<button type="button" onclick="deletePackItem('+cIndex+','+iIndex+')" style="background:none;border:none;color:#f44336;cursor:pointer;font-size:.9rem;padding:2px 6px;" title="Löschen">🗑️</button>'
            +'</div>';
        });

        if(!(cat.items||[]).length){
          html += '<div style="color:#777;font-size:.76rem;padding:4px 0 7px;">Noch keine Gegenstände in dieser Kategorie.</div>';
        }

        html += '</div><div style="display:flex;gap:6px;margin-top:8px;">'
          +'<input type="text" id="new_item_input_'+cIndex+'" placeholder="Eigenes Item hinzufügen..." style="flex:1;min-width:0;padding:6px;background:#111;border:1px solid #444;color:#fff;border-radius:4px;font-size:.85rem;">'
          +'<button type="button" onclick="addPackItem('+cIndex+')" style="background:#2196F3;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:.85rem;">+ Hinzufügen</button>'
          +'</div></div>';
      });

      container.innerHTML=html;

      const catInput=d.getElementById('new_pack_category_input');
      if(catInput)catInput.addEventListener('keydown',function(e){if(e.key==='Enter')w.addPackCategory()});
      categories.forEach(function(_,cIndex){
        const input=d.getElementById('new_item_input_'+cIndex);
        if(input)input.addEventListener('keydown',function(e){if(e.key==='Enter')w.addPackItem(cIndex)});
      });
    };

    // Falls die Packliste bereits offen ist, sofort neu zeichnen.
    if(d.getElementById('packContainer'))w.renderPackList();
  });
})();
