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
    return defaultPackCategories;
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
                <div style="display:flex; flex-direction:column; gap:6px;">
        `;

        cat.items.forEach((item, iIndex) => {
            const uniqueKey = `${cIndex}_${iIndex}`;
            const isChecked = checkedItems[uniqueKey] ? 'checked' : '';
            const textStyle = isChecked ? 'text-decoration: line-through; color: #777;' : 'color: #fff;';

            html += `
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:0.9rem; padding:4px 0;">
                    <input type="checkbox" ${isChecked} onchange="togglePackItem(${cIndex}, ${iIndex})" style="width:18px; height:18px; accent-color:#4CAF50; cursor:pointer;">
                    <span id="pack_text_${uniqueKey}" style="${textStyle}">${item}</span>
                </label>
            `;
        });

        html += `
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

function resetPackList() {
    if (confirm("Packliste auf Standard zurücksetzen?")) {
        localStorage.removeItem('upper_pack_checked');
        localStorage.removeItem('upper_pack_list');
        renderPackList();
        showNotice('saveNotice', 'Packliste zurückgesetzt!');
    }
}
