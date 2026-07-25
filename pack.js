// pack.js - Packliste mit Bike, Ausrüstung, Verpflegung (Spaghetti) & Sicherheitsabfrage

const DEFAULT_PACK_DATA = {
    "Bike": [
        { id: 1, text: "Motorrad & Reifenwärmer", checked: false },
        { id: 2, text: "Ersatzteile (Hebel, Rasten etc.)", checked: false },
        { id: 3, text: "Werkzeugkasten & Drehmomentschlüssel", checked: false },
        { id: 4, text: "Benzin / Kanister", checked: false },
        { id: 5, text: "Montageständer vorne & hinten", checked: false }
    ],
    "Ausrüstung": [
        { id: 6, text: "Lederkombi", checked: false },
        { id: 7, text: "Helm & Ersatz-Visier", checked: false },
        { id: 8, text: "Stiefel & Handschuhe", checked: false },
        { id: 9, text: "Rückenprotektor & Funktionsunterwäsche", checked: false },
        { id: 10, text: "Ohrstöpsel", checked: false }
    ],
    "Verpflegung": [
        { id: 11, text: "Wasser & Isogetränke", checked: false },
        { id: 12, text: "Müsliriegel & Snacks", checked: false },
        { id: 13, text: "Obst (Banane etc.)", checked: false },
        { id: 14, text: "🍝 Spaghetti (Carbo-Loading vor dem Rennen)", checked: false, isSpecial: true }
    ],
    "Dokumente & Sonstiges": [
        { id: 15, text: "Personalausweis / Führerschein", checked: false },
        { id: 16, text: "Nennung / Bestätigung / Ticket", checked: false },
        { id: 17, text: "Geld / EC-Karte", checked: false },
        { id: 18, text: "Kabelbinder & Klebeband (Panzertape)", checked: false }
    ]
};

function initPack() {
    renderPack();
}

function getStoredPackData() {
    const saved = localStorage.getItem('upper_pack_data');
    if (!saved) {
        localStorage.setItem('upper_pack_data', JSON.stringify(DEFAULT_PACK_DATA));
        return JSON.parse(JSON.stringify(DEFAULT_PACK_DATA));
    }
    return JSON.parse(saved);
}

function savePackData(data) {
    localStorage.setItem('upper_pack_data', JSON.stringify(data));
}

function renderPack() {
    const container = document.getElementById('packContainer');
    if (!container) return;

    const packData = getStoredPackData();
    container.innerHTML = '';

    for (const [categoryName, items] of Object.entries(packData)) {
        let box = document.createElement('div');
        box.className = 'setup-box';
        box.style.marginBottom = '15px';

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0; font-size:1rem; color:#4CAF50;">📂 ${categoryName}</h3>
                <span style="font-size:0.75rem; color:#888;">${items.filter(i => i.checked).length} / ${items.length} erledigt</span>
            </div>
            <div style="margin-bottom:10px;">
        `;

        items.forEach(item => {
            let specialStyle = item.isSpecial ? 'font-weight:bold; color:#FF9800;' : '';
            html += `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid #333;">
                    <label style="display:flex; align-items:center; cursor:pointer; flex-grow:1; font-size:0.85rem; ${specialStyle}">
                        <input type="checkbox" ${item.checked ? 'checked' : ''} 
                            onchange="togglePackItem('${categoryName}', ${item.id})" 
                            style="margin-right:10px; width:18px; height:18px; accent-color:#4CAF50;">
                        <span class="${item.checked ? 'pack-item-done' : ''}">${item.text}</span>
                    </label>
                    <button type="button" onclick="deletePackItem('${categoryName}', ${item.id})" 
                        style="background:none; border:none; color:#f44336; cursor:pointer; font-size:0.9rem; padding:2px 6px;" title="Löschen">❌</button>
                </div>
            `;
        });

        html += `
            </div>
            <div style="display:flex; gap:6px; margin-top:8px;">
                <input type="text" id="new_item_${escapeCategoryKey(categoryName)}" placeholder="Neuen Gegenstand hinzufügen..." 
                    style="flex-grow:1; padding:6px; font-size:0.8rem; background:#222; border:1px solid #444; color:#fff; border-radius:4px;"
                    onkeydown="if(event.key === 'Enter') addPackItem('${categoryName}')">
                <button type="button" onclick="addPackItem('${categoryName}')" 
                    style="background:#4CAF50; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:0.8rem; cursor:pointer;">+ Hinzufügen</button>
            </div>
        `;

        box.innerHTML = html;
        container.appendChild(box);
    }
}

function escapeCategoryKey(cat) {
    return cat.replace(/[^a-zA-Z0-9]/g, '_');
}

function togglePackItem(categoryName, itemId) {
    let packData = getStoredPackData();
    if (packData[categoryName]) {
        let item = packData[categoryName].find(i => i.id === itemId);
        if (item) {
            item.checked = !item.checked;
            savePackData(packData);
            renderPack();
        }
    }
}

function addPackItem(categoryName) {
    const inputId = 'new_item_' + escapeCategoryKey(categoryName);
    const inputEl = document.getElementById(inputId);
    if (!inputEl) return;

    const text = inputEl.value.trim();
    if (!text) {
        alert("Bitte einen Text eingeben!");
        return;
    }

    let packData = getStoredPackData();
    if (!packData[categoryName]) packData[categoryName] = [];

    const newId = Date.now() + Math.floor(Math.random() * 1000);

    packData[categoryName].push({
        id: newId,
        text: text,
        checked: false
    });

    savePackData(packData);
    renderPack();
}

function deletePackItem(categoryName, itemId) {
    let packData = getStoredPackData();
    if (!packData[categoryName]) return;

    let item = packData[categoryName].find(i => i.id === itemId);
    const itemName = item ? item.text : 'Diesen Gegenstand';

    if (confirm(`Möchtest du "${itemName}" wirklich aus der Packliste löschen?`)) {
        packData[categoryName] = packData[categoryName].filter(i => i.id !== itemId);
        savePackData(packData);
        renderPack();
    }
}

function resetPackList() {
    if (confirm("Möchtest du die Packliste komplett auf die Standard-Werte zurücksetzen?")) {
        localStorage.removeItem('upper_pack_data');
        renderPack();
    }
}
