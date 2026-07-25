// pack.js - UpperRacing Packliste

const defaultPackCategories = [
    {
        title: "🏍️ Motorrad & Technik",
        items: [
            "Motorrad (Vollgetankt)",
            "Zweitfelgensatz / Regenreifen",
            "Reifenwärmer",
            "Heck- und Frontständer",
            "Benzinkanister (voll)",
            "Motoröl & Bremsflüssigkeit",
            "Ersatzteile (Hebel, Rasten)",
            "Werkzeugkasten & Drehmomentschlüssel",
            "Kettenreiniger & Spray",
            "Luftdruckprüfer & Pumpe"
        ]
    },
    {
        title: "🧑‍🦰 Fahrer-Ausstattung",
        items: [
            "Lederkombi",
            "Helm + Ersatzvisier",
            "Stiefel",
            "Handschuhe (2 Paar)",
            "Rückenprotektor / Airbag",
            "Funktionsunterwäsche",
            "Ohrstöpsel"
        ]
    },
    {
        title: "🍝 Spaghetti & Zutaten",
        items: [
            "Spaghetti (Packung)",
            "Tomatensoße / Passata",
            "Olivenöl",
            "Salz & Pfeffer",
            "Parmesan / Reibekäse",
            "Knoblauch / Zwiebeln",
            "Topf & Gaskocher",
            "Teller & Besteck"
        ]
    },
    {
        title: "🏕️ Fahrerlager & Sonstiges",
        items: [
            "Ausweis & Nennungsbestätigung",
            "Pavillon / Zelt & Heringe",
            "Campingstühle & Tisch",
            "Kabeltrommel & Verlängerung",
            "Wasser & Verpflegung",
            "Handtücher & Duschsachen",
            "Erste-Hilfe-Set"
        ]
    }
];

function initPack() {
    renderPackList();
}

function getPackData() {
    const saved = localStorage.getItem('upper_pack_list');
    if (saved) {
        try { return JSON.parse(saved); } catch(e) {}
    }
    return JSON.parse(JSON.stringify(defaultPackCategories));
}

function renderPackList() {
    const container = document.getElementById('packContainer');
    if (!container) return;

    let categories = getPackData();
    let checkedItems = JSON.parse(localStorage.getItem('upper_pack_checked')) || {};

    let html = '';
    categories.forEach((cat, cIndex) => {
        html += `
            <div class="setup-box" style="margin-bottom:12px;">
                <h3 style="margin-bottom:8px; font-size:1rem; color:#FFD700;">${cat.title}</h3>
                <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">
        `;

        cat.items.forEach((item, iIndex) => {
            const uniqueKey = `${cIndex}_${iIndex}`;
            const isChecked = checkedItems[uniqueKey] ? 'checked' : '';
            const textStyle = isChecked ? 'text-decoration: line-through; color: #777;' : 'color: #fff;';

            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 0;">
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:0.9rem; flex:1;">
                        <input type="checkbox" ${isChecked} onchange="togglePackItem(${cIndex}, ${iIndex})" style="width:18px; height:18px; accent-color:#4CAF50; cursor:pointer;">
                        <span style="${textStyle}">${item}</span>
                    </label>
                    <button type="button" onclick="deletePackItem(${cIndex}, ${iIndex})" style="background:none; border:none; color:#f44336; cursor:pointer; font-size:0.9rem; padding:2px 6px;" title="Löschen">🗑️</button>
                </div>
            `;
        });

        html += `
                </div>
                <div style="display:flex; gap:6px; margin-top:8px;">
                    <input type="text" id="new_item_input_${cIndex}" placeholder="Eigenes Item hinzufügen..." style="flex:1; padding:6px; background:#111; border:1px solid #444; color:#fff; border-radius:4px; font-size:0.85rem;">
                    <button type="button" onclick="addPackItem(${cIndex})" style="background:#2196F3; color:#fff; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:0.85rem;">+ Hinzufügen</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function togglePackItem(cIndex, iIndex) {
    let checkedItems = JSON.parse(localStorage.getItem('upper_pack_checked')) || {};
    const uniqueKey = `${cIndex}_${iIndex}`;
    checkedItems[uniqueKey] = !checkedItems[uniqueKey];
    localStorage.setItem('upper_pack_checked', JSON.stringify(checkedItems));
    renderPackList();
}

function addPackItem(cIndex) {
    const input = document.getElementById(`new_item_input_${cIndex}`);
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;

    let categories = getPackData();
    categories[cIndex].items.push(val);
    localStorage.setItem('upper_pack_list', JSON.stringify(categories));
    renderPackList();
}

function deletePackItem(cIndex, iIndex) {
    let categories = getPackData();
    const itemName = categories[cIndex].items[iIndex];
    
    if (confirm(`Möchtest du "${itemName}" wirklich aus der Packliste löschen?`)) {
        categories[cIndex].items.splice(iIndex, 1);
        localStorage.setItem('upper_pack_list', JSON.stringify(categories));
        renderPackList();
    }
}

function resetPackList() {
    if (confirm("Möchtest du alle Häkchen zurücksetzen? (Eigene Einträge bleiben erhalten)")) {
        localStorage.removeItem('upper_pack_checked');
        renderPackList();
        showNotice('saveNotice', 'Häkchen zurückgesetzt!');
    }
}
