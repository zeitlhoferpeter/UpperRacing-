// app.js - UpperRacing Logic (Universal-Version)

const tracksData = {
    pannoniaring: { name: "Pannoniaring", curves: 18 },
    slovakia: { name: "Slovakiaring", curves: 14 },
    brünn: { name: "Automotodrom Brno / Brünn", curves: 14 },
    most: { name: "Autodrom Most", curves: 21 },
    grobnik: { name: "Automotodrom Grobnik / Rijeka", curves: 18 }
};

function initApp() {
    try {
        onTrackChange();
        loadCupUrl();
        switchPage('app');
        setupBaselineButtons();
        setupUniversalActionButtons();
    } catch (e) {
        console.error("Init Error:", e);
    }
}

// Lokale Zeit im sauberen Format
function getLocalTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// Fängt HTML-Buttons ab und zwingt sie zu den richtigen Aktionen
function setupBaselineButtons() {
    try {
        document.querySelectorAll('button').forEach(btn => {
            const text = btn.textContent.toLowerCase();
            const onclick = (btn.getAttribute('onclick') || '').toLowerCase();
            
            if (text.includes('basis') || text.includes('baseline') || onclick.includes('baseline') || onclick.includes('base')) {
                if (text.includes('speichern') || onclick.includes('save') || text.includes('als')) {
                    btn.removeAttribute('onclick');
                    btn.onclick = executeSaveBaseline;
                } else if (text.includes('laden') || onclick.includes('load')) {
                    btn.removeAttribute('onclick');
                    btn.onclick = loadBaseline;
                }
            }
        });
    } catch(e) {
        console.error("Setup buttons error:", e);
    }
}

// Fängt universell Buttons wie "+ Neu" ab
function setupUniversalActionButtons() {
    try {
        document.querySelectorAll('button').forEach(btn => {
            const text = btn.textContent.toLowerCase();
            const onclick = (btn.getAttribute('onclick') || '').toLowerCase();
            
            if (text.includes('neu') || text.includes('+') || onclick.includes('new') || onclick.includes('session')) {
                btn.removeAttribute('onclick');
                btn.onclick = startNewSessionForm;
            }
        });
    } catch(e) {
        console.error("Universal buttons error:", e);
    }
}

// --- ABSOLUT SICHERE SEITEN-NAVIGATION ---
function switchPage(pageKey) {
    try {
        if (pageKey === 'setup') pageKey = 'app';

        const allPossiblePageIds = [
            'pageApp', 'pageSetup', 'setup', 'app', 
            'pageCurves', 'curves', 
            'pageLaps', 'laps', 
            'pageCup', 'cup', 
            'pagePack', 'pack'
        ];

        allPossiblePageIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                el.classList.remove('active');
            }
        });

        document.querySelectorAll('.page-content').forEach(el => {
            el.style.display = 'none';
            el.classList.remove('active');
        });

        let target = document.getElementById('page' + pageKey.charAt(0).toUpperCase() + pageKey.slice(1)) ||
                     document.getElementById(pageKey) ||
                     document.getElementById('page' + pageKey) ||
                     (pageKey === 'app' ? document.getElementById('setup') : null) ||
                     (pageKey === 'app' ? document.getElementById('pageSetup') : null);
        
        if (target) {
            target.style.display = 'block';
            target.classList.add('active');
        }

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            const onclick = (btn.getAttribute('onclick') || '').toLowerCase();
            if (onclick.includes(pageKey.toLowerCase())) {
                btn.classList.add('active');
            }
        });
    } catch (e) {
        console.error("Navigation Error:", e);
    }
}

function showPage(key) { switchPage(key); }
function changePage(key) { switchPage(key); }
function newSession() { startNewSessionForm(); }
function addNewSession() { startNewSessionForm(); }

function onTrackChange() {
    try {
        const trackEl = document.getElementById('trackSelect');
        if (!trackEl) return;
        const track = trackEl.value;
        loadSessionsForTrack(track);
        renderCurves(track);
        loadAllTimeBest();
    } catch (e) {
        console.error("TrackChange Error:", e);
    }
}

function getSessionsKey(track) {
    return 'upper_sessions_' + track;
}

function loadSessionsForTrack(track) {
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect) return;
    sessionSelect.innerHTML = '';
    
    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    
    let keys = Object.keys(sessions).sort((a, b) => {
        const dateA = new Date(a.replace(' ', 'T'));
        const dateB = new Date(b.replace(' ', 'T'));
        return dateB - dateA;
    });
    
    if (keys.length === 0) {
        const defaultKey = getLocalTimestamp();
        sessions[defaultKey] = getEmptySessionData(track);
        localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
        keys = [defaultKey];
    }

    keys.forEach(k => {
        let opt = document.createElement('option');
        opt.value = k;
        opt.textContent = k;
        sessionSelect.appendChild(opt);
    });

    sessionSelect.value = keys[0];
    loadSessionData(keys[0]);
}

function getEmptySessionData(track) {
    const baseline = JSON.parse(localStorage.getItem(`baseline_${track}`));
    if (baseline) {
        return {
            tireFront: baseline.tireFront || '',
            tireRear: baseline.tireRear || '',
            outsideTemp: baseline.outsideTemp || '',
            gearing: baseline.gearing || '',
            forkRebound: baseline.forkRebound || '',
            forkCompression: baseline.forkCompression || '',
            forkPreload: baseline.forkPreload || '',
            forkSag: baseline.forkSag || '',
            forkRemaining: baseline.forkRemaining || '',
            shockRebound: baseline.shockRebound || '',
            shockCompression: baseline.shockCompression || '',
            shockPreload: baseline.shockPreload || '',
            shockSag: baseline.shockSag || '',
            shockRemaining: baseline.shockRemaining || '',
            tireImage: ''
        };
    }
    return {
        tireFront: '', tireRear: '', outsideTemp: '', gearing: '',
        forkRebound: '', forkCompression: '', forkPreload: '', forkSag: '', forkRemaining: '',
        shockRebound: '', shockCompression: '', shockPreload: '', shockSag: '', shockRemaining: '',
        tireImage: ''
    };
}

function onSessionChange() {
    const sessionSelect = document.getElementById('sessionSelect');
    if (sessionSelect) loadSessionData(sessionSelect.value);
}

function loadSessionData(sessionKey) {
    const track = document.getElementById('trackSelect').value;
    const sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    const data = sessions[sessionKey] || getEmptySessionData(track);

    setFieldValue('tireFront', data.tireFront);
    setFieldValue('tireRear', data.tireRear);
    setFieldValue('outsideTemp', data.outsideTemp);
    setFieldValue('gearing', data.gearing);
    
    setFieldValue('forkRebound', data.forkRebound);
    setFieldValue('forkCompression', data.forkCompression);
    setFieldValue('forkPreload', data.forkPreload);
    setFieldValue('forkSag', data.forkSag);
    setFieldValue('forkRemaining', data.forkRemaining);

    setFieldValue('shockRebound', data.shockRebound);
    setFieldValue('shockCompression', data.shockCompression);
    setFieldValue('shockPreload', data.shockPreload);
    setFieldValue('shockSag', data.shockSag);
    setFieldValue('shockRemaining', data.shockRemaining);

    const imgPrev = document.getElementById('tireImagePreview');
    const imgCont = document.getElementById('tireImageContainer');
    if (imgPrev && imgCont) {
        if (data.tireImage) {
            imgPrev.src = data.tireImage;
            imgCont.style.display = 'block';
        } else {
            imgPrev.src = '';
            imgCont.style.display = 'none';
        }
    }
}

function setFieldValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

function startNewSessionForm() {
    const track = document.getElementById('trackSelect').value;
    const newKey = getLocalTimestamp();
    
    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    sessions[newKey] = getEmptySessionData(track);
    localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));

    loadSessionsForTrack(track);
    document.getElementById('sessionSelect').value = newKey;
    loadSessionData(newKey);
    showNotice('saveNotice', 'Neuer Eintrag angelegt (Basis-Setup übernommen)!');
}

function saveData() {
    const track = document.getElementById('trackSelect').value;
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect) return;
    const sessionKey = sessionSelect.value;
    if (!sessionKey) return;

    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    
    const preview = document.getElementById('tireImagePreview');
    const existingImg = sessions[sessionKey]?.tireImage || '';
    const imgSrc = preview && preview.src.startsWith('data:') ? preview.src : existingImg;

    sessions[sessionKey] = {
        tireFront: document.getElementById('tireFront')?.value || '',
        tireRear: document.getElementById('tireRear')?.value || '',
        outsideTemp: document.getElementById('outsideTemp')?.value || '',
        gearing: document.getElementById('gearing')?.value || '',
        forkRebound: document.getElementById('forkRebound')?.value || '',
        forkCompression: document.getElementById('forkCompression')?.value || '',
        forkPreload: document.getElementById('forkPreload')?.value || '',
        forkSag: document.getElementById('forkSag')?.value || '',
        forkRemaining: document.getElementById('forkRemaining')?.value || '',
        shockRebound: document.getElementById('shockRebound')?.value || '',
        shockCompression: document.getElementById('shockCompression')?.value || '',
        shockPreload: document.getElementById('shockPreload')?.value || '',
        shockSag: document.getElementById('shockSag')?.value || '',
        shockRemaining: document.getElementById('shockRemaining')?.value || '',
        tireImage: imgSrc
    };

    localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
    showNotice('saveNotice', 'Erfolgreich gespeichert!');
}

function deleteCurrentSession() {
    const track = document.getElementById('trackSelect').value;
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect) return;
    const sessionKey = sessionSelect.value;

    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    if (Object.keys(sessions).length <= 1) {
        alert("Der letzte Eintrag kann nicht gelöscht werden.");
        return;
    }

    if (confirm(`Eintrag "${sessionKey}" wirklich löschen?`)) {
        delete sessions[sessionKey];
        localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
        loadSessionsForTrack(track);
        showNotice('saveNotice', 'Eintrag gelöscht!');
    }
}

// --- BASIS SETUP SPEICHERN & LADEN ---
function saveAsBaseline() { executeSaveBaseline(); }
function saveBaseline() { executeSaveBaseline(); }
function saveBaseSetup() { executeSaveBaseline(); }
function saveBasisSetup() { executeSaveBaseline(); }

function executeSaveBaseline() {
    const track = document.getElementById('trackSelect').value;
    
    if (!confirm("Möchtest du das aktuelle Setup wirklich als neues Basis-Setup für " + (tracksData[track]?.name || track) + " speichern?")) {
        return;
    }

    const baseline = {
        tireFront: document.getElementById('tireFront')?.value || '',
        tireRear: document.getElementById('tireRear')?.value || '',
        outsideTemp: document.getElementById('outsideTemp')?.value || '',
        gearing: document.getElementById('gearing')?.value || '',
        forkRebound: document.getElementById('forkRebound')?.value || '',
        forkCompression: document.getElementById('forkCompression')?.value || '',
        forkPreload: document.getElementById('forkPreload')?.value || '',
        forkSag: document.getElementById('forkSag')?.value || '',
        forkRemaining: document.getElementById('forkRemaining')?.value || '',
        shockRebound: document.getElementById('shockRebound')?.value || '',
        shockCompression: document.getElementById('shockCompression')?.value || '',
        shockPreload: document.getElementById('shockPreload')?.value || '',
        shockSag: document.getElementById('shockSag')?.value || '',
        shockRemaining: document.getElementById('shockRemaining')?.value || ''
    };
    
    localStorage.setItem(`baseline_${track}`, JSON.stringify(baseline));
    showNotice('saveNotice', 'Basis-Setup für ' + (tracksData[track]?.name || track) + ' gespeichert!');
}

function loadBaseline() {
    const track = document.getElementById('trackSelect').value;
    const baseline = JSON.parse(localStorage.getItem(`baseline_${track}`));
    if (!baseline) {
        alert('Kein Basis-Setup für diese Strecke gefunden!');
        return;
    }
    setFieldValue('tireFront', baseline.tireFront);
    setFieldValue('tireRear', baseline.tireRear);
    setFieldValue('outsideTemp', baseline.outsideTemp);
    setFieldValue('gearing', baseline.gearing);
    setFieldValue('forkRebound', baseline.forkRebound);
    setFieldValue('forkCompression', baseline.forkCompression);
    setFieldValue('forkPreload', baseline.forkPreload);
    setFieldValue('forkSag', baseline.forkSag);
    setFieldValue('forkRemaining', baseline.forkRemaining);
    setFieldValue('shockRebound', baseline.shockRebound);
    setFieldValue('shockCompression', baseline.shockCompression);
    setFieldValue('shockPreload', baseline.shockPreload);
    setFieldValue('shockSag', baseline.shockSag);
    setFieldValue('shockRemaining', baseline.shockRemaining);
    
    showNotice('saveNotice', 'Basis-Setup geladen!');
}

// --- CURVES (Manuelles Speichern wie Basis-Setup) ---
function renderCurves(track) {
    const container = document.getElementById('curvesContainer');
    if (!container) return;
    container.innerHTML = '';
    const count = tracksData[track].curves;
    const savedCurves = JSON.parse(localStorage.getItem(`curves_${track}`)) || {};

    for (let i = 1; i <= count; i++) {
        const cData = savedCurves[i] || { status: 'green', gear: '', line: '', notes: '' };
        let card = document.createElement('div');
        card.className = 'setup-box curve-card';
        card.dataset.curveNum = i;
        card.dataset.status = cData.status || 'green';
        card.style.marginBottom = '10px';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>Kurve ${i}</strong>
                <div class="curve-status-buttons" data-curve="${i}">
                    <button type="button" class="btn-status ${cData.status==='red'?'active-red':''}" onclick="setCurveStatus(${i}, 'red')">🔴</button>
                    <button type="button" class="btn-status ${cData.status==='yellow'?'active-yellow':''}" onclick="setCurveStatus(${i}, 'yellow')">🟡</button>
                    <button type="button" class="btn-status ${cData.status==='green'?'active-green':''}" onclick="setCurveStatus(${i}, 'green')">🟢</button>
                </div>
            </div>
            <div class="grid-2" style="margin-top:6px;">
                <div><label style="font-size:0.7rem">Gang</label><input type="text" id="curve_gear_${i}" value="${cData.gear}" placeholder="z.B. 3"></div>
                <div><label style="font-size:0.7rem">Linie / Apex</label><input type="text" id="curve_line_${i}" value="${cData.line}" placeholder="Spät einlenken"></div>
            </div>
            <div style="margin-top:4px;"><textarea id="curve_notes_${i}" rows="2" placeholder="Notiz...">${cData.notes}</textarea></div>
        `;
        container.appendChild(card);
    }
}

function setCurveStatus(num, status) {
    const container = document.getElementById('curvesContainer');
    if (!container) return;
    const card = container.querySelector(`[data-curve-num="${num}"]`);
    if (!card) return;

    card.dataset.status = status;

    const buttons = card.querySelectorAll('.btn-status');
    buttons.forEach(btn => {
        btn.classList.remove('active-red', 'active-yellow', 'active-green');
        const onclick = btn.getAttribute('onclick') || '';
        if (onclick.includes("'red'") && status === 'red') btn.classList.add('active-red');
        if (onclick.includes("'yellow'") && status === 'yellow') btn.classList.add('active-yellow');
        if (onclick.includes("'green'") && status === 'green') btn.classList.add('active-green');
    });
}

function saveCurvesData() {
    const track = document.getElementById('trackSelect').value;
    const container = document.getElementById('curvesContainer');
    if (!container) return;

    let savedCurves = {};
    const cards = container.querySelectorAll('.curve-card');
    
    cards.forEach(card => {
        const i = card.dataset.curveNum;
        const status = card.dataset.status || 'green';
        const gearEl = document.getElementById(`curve_gear_${i}`);
        const lineEl = document.getElementById(`curve_line_${i}`);
        const notesEl = document.getElementById(`curve_notes_${i}`);

        savedCurves[i] = {
            status: status,
            gear: gearEl ? gearEl.value : '',
            line: lineEl ? lineEl.value : '',
            notes: notesEl ? notesEl.value : ''
        };
    });

    localStorage.setItem(`curves_${track}`, JSON.stringify(savedCurves));
    showNotice('saveNoticeCurves', 'Kurven für ' + (tracksData[track]?.name || track) + ' erfolgreich gespeichert!');
}

// --- ALL TIME BEST ---
function loadAllTimeBest() {
    const track = document.getElementById('trackSelect').value;
    const best = JSON.parse(localStorage.getItem(`allTimeBest_${track}`));
    const valEl = document.getElementById('allTimeValue');
    const dateEl = document.getElementById('allTimeDate');
    if (!valEl || !dateEl) return;
    
    if (best && best.timeStr) {
        valEl.textContent = best.timeStr;
        dateEl.textContent = best.date || 'Unbekanntes Datum';
    } else {
        valEl.textContent = '--:--.---';
        dateEl.textContent = 'Noch keine Zeit';
    }
}

function confirmClearAllTimeBest() {
    const track = document.getElementById('trackSelect').value;
    if(confirm("All-Time-Best für diese Strecke wirklich löschen?")) {
        localStorage.removeItem(`allTimeBest_${track}`);
        loadAllTimeBest();
    }
}

// --- CUP & IMAGES ---
function openCupInBrowser() {
    const urlInput = document.getElementById('cupUrlInput');
    const url = urlInput ? urlInput.value : '#';
    window.open(url, '_blank');
}

function saveCupUrl() {
    const urlInput = document.getElementById('cupUrlInput');
    if (!urlInput) return;
    localStorage.setItem('cupUrl', urlInput.value);
    showNotice('saveNotice', 'Cup-Link gespeichert!');
}

function loadCupUrl() {
    const urlInput = document.getElementById('cupUrlInput');
    const url = localStorage.getItem('cupUrl');
    if(url && urlInput) {
        urlInput.value = url;
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const imgPrev = document.getElementById('tireImagePreview');
        const imgCont = document.getElementById('tireImageContainer');
        if (imgPrev && imgCont) {
            imgPrev.src = e.target.result;
            imgCont.style.display = 'block';
        }
    }
    reader.readAsDataURL(file);
}

function deleteTireImage() {
    const imgPrev = document.getElementById('tireImagePreview');
    const imgCont = document.getElementById('tireImageContainer');
    if (imgPrev) imgPrev.src = '';
    if (imgCont) imgCont.style.display = 'none';
    saveData();
}

function openModal(src) {
    if(!src) return;
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImg');
    if (modal && modalImg) {
        modal.style.display = 'block';
        modalImg.src = src;
    }
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    if (modal) modal.style.display = 'none';
}

function showNotice(elementId, text) {
    const el = document.getElementById(elementId);
    if(!el) return;
    el.textContent = text;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 2500);
}

function exportData() {
    const track = document.getElementById('trackSelect').value;
    const sessions = localStorage.getItem(getSessionsKey(track));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(sessions);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `UpperRacing_${track}_Export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}
