// app.js - UpperRacing Hauptlogik (Multi-Bild, Kamera & Galerie + Status-Speicherung)

const tracksData = {
    pannoniaring: { name: "Pannoniaring", curves: 18 },
    slovakia: { name: "Slovakiaring", curves: 14 },
    brünn: { name: "Automotodrom Brno / Brünn", curves: 14 },
    most: { name: "Autodrom Most", curves: 21 },
    grobnik: { name: "Automotodrom Grobnik / Rijeka", curves: 18 }
};

const DEFAULT_CUP_URL = "https://www.stardesignracing.com/wp-content/uploads/2026/07/Cup-2026.pdf";

function initApp() {
    try {
        // Letzte Strecke wiederherstellen, falls vorhanden
        const lastTrack = localStorage.getItem('upper_last_track');
        if (lastTrack && tracksData[lastTrack]) {
            const trackEl = document.getElementById('trackSelect');
            if (trackEl) trackEl.value = lastTrack;
        }

        onTrackChange();
        loadCupUrl();

        // Letzte geöffnete Seite wiederherstellen (Standard: setup)
        const lastPage = localStorage.getItem('upper_last_page') || 'setup';
        switchPage(lastPage);
    } catch (e) {
        console.error("Init Error:", e);
    }
}

function getLocalTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function switchPage(pageKey) {
    try {
        if (pageKey === 'app') pageKey = 'setup';

        // Aktuelle Seite im localStorage merken
        localStorage.setItem('upper_last_page', pageKey);

        document.querySelectorAll('.page-content').forEach(el => {
            el.style.display = 'none';
            el.classList.remove('active');
        });

        let target = document.getElementById('page' + pageKey.charAt(0).toUpperCase() + pageKey.slice(1)) ||
                     document.getElementById(pageKey) ||
                     document.getElementById('page' + pageKey);
        
        if (target) {
            target.style.display = 'block';
            target.classList.add('active');
            
            const lowerKey = pageKey.toLowerCase();
            if (lowerKey === 'cup') {
                loadCupUrl();
            } else if (lowerKey === 'pack') {
                if (typeof initPack === 'function') {
                    initPack();
                }
            }
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

        // Strecke im localStorage merken
        localStorage.setItem('upper_last_track', track);

        loadSessionsForTrack(track);
        renderCurves(track);
        loadLapSessionsForTrack(track);
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

    // Letzte ausgewählte Session für diese Strecke wiederherstellen oder die aktuellste nehmen
    const lastSession = localStorage.getItem('upper_last_session_' + track);
    if (lastSession && sessions[lastSession]) {
        sessionSelect.value = lastSession;
        loadSessionData(lastSession);
    } else {
        sessionSelect.value = keys[0];
        loadSessionData(keys[0]);
    }
}

function getEmptySessionData(track) {
    const baseline = JSON.parse(localStorage.getItem(`baseline_${track}`));
    if (baseline) {
        return {
            tireFront: baseline.tireFront || '',
            tireRear: baseline.tireRear || '',
            outsideTemp: '', // Lufttemperatur bewusst leer lassen (nicht im Basis-Setup)
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
            tireImages: []
        };
    }
    return {
        tireFront: '', tireRear: '', outsideTemp: '', gearing: '',
        forkRebound: '', forkCompression: '', forkPreload: '', forkSag: '', forkRemaining: '',
        shockRebound: '', shockCompression: '', shockPreload: '', shockSag: '', shockRemaining: '',
        tireImages: []
    };
}

function onSessionChange() {
    const track = document.getElementById('trackSelect').value;
    const sessionSelect = document.getElementById('sessionSelect');
    if (sessionSelect) {
        localStorage.setItem('upper_last_session_' + track, sessionSelect.value);
        loadSessionData(sessionSelect.value);
    }
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

    let images = data.tireImages || [];
    if (images.length === 0 && data.tireImage) {
        images = [data.tireImage];
    }
    renderTireImages(images);
}

function renderTireImages(imagesArray) {
    const imgCont = document.getElementById('tireImageContainer');
    if (!imgCont) return;

    if (!imagesArray || imagesArray.length === 0) {
        imgCont.style.display = 'none';
        imgCont.innerHTML = '';
        return;
    }

    imgCont.style.display = 'block';
    let html = '<div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-bottom:8px;">';
    imagesArray.forEach((src, idx) => {
        html += `
            <div style="position:relative; display:inline-block;">
                <img src="${src}" alt="Reifenbild ${idx + 1}" style="width:90px; height:90px; object-fit:cover; border-radius:4px; cursor:pointer; border:1px solid #444;" onclick="openModal('${src}')">
                <button type="button" onclick="deleteSingleTireImage(${idx})" style="position:absolute; top:-6px; right:-6px; background:#f44336; color:#fff; border:none; border-radius:50%; width:22px; height:22px; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Bild löschen">&times;</button>
            </div>
        `;
    });
    html += '</div>';
    html += '<button type="button" onclick="deleteAllTireImages()" style="background:#f44336; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem;">Alle Bilder löschen</button>';
    imgCont.innerHTML = html;
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
    try {
        localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
    } catch (e) {
        alert("Speicherlimit erreicht!");
    }

    loadSessionsForTrack(track);
    document.getElementById('sessionSelect').value = newKey;
    localStorage.setItem('upper_last_session_' + track, newKey);
    loadSessionData(newKey);
    showNotice('saveNotice', 'Neuer Eintrag angelegt!');
}

function saveData() {
    const track = document.getElementById('trackSelect').value;
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect) return;
    const sessionKey = sessionSelect.value;
    if (!sessionKey) return;

    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    const existingData = sessions[sessionKey] || {};
    let currentImages = existingData.tireImages || (existingData.tireImage ? [existingData.tireImage] : []);

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
        tireImages: currentImages
    };

    try {
        localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
        showNotice('saveNotice', 'Erfolgreich gespeichert!');
    } catch (e) {
        alert("Speicherlimit überschritten! Zu viele große Bilder.");
    }
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

function saveAsBaseline() { executeSaveBaseline(); }
function saveBaseline() { executeSaveBaseline(); }

function executeSaveBaseline() {
    const track = document.getElementById('trackSelect').value;
    
    if (!confirm("Möchtest du das aktuelle Setup als neues Basis-Setup speichern?")) {
        return;
    }

    const baseline = {
        tireFront: document.getElementById('tireFront')?.value || '',
        tireRear: document.getElementById('tireRear')?.value || '',
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
    showNotice('saveNotice', 'Basis-Setup gespeichert!');
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
    // outsideTemp wird hier bewusst NICHT aus der Baseline geladen
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
                <div><label style="font-size:0.7rem">Linie</label><input type="text" id="curve_line_${i}" value="${cData.line}" placeholder="Apex..."></div>
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
    if (!confirm("Kurven-Daten speichern?")) return;

    const container = document.getElementById('curvesContainer');
    if (!container) return;

    let savedCurves = {};
    const cards = container.querySelectorAll('.curve-card');
    
    cards.forEach(card => {
        const i = card.dataset.curveNum;
        const status = card.dataset.status || 'green';
        savedCurves[i] = {
            status: status,
            gear: document.getElementById(`curve_gear_${i}`)?.value || '',
            line: document.getElementById(`curve_line_${i}`)?.value || '',
            notes: document.getElementById(`curve_notes_${i}`)?.value || ''
        };
    });

    localStorage.setItem(`curves_${track}`, JSON.stringify(savedCurves));
    showNotice('saveNoticeCurves', 'Kurven gespeichert!');
}

function shareCurves() {
    const track = document.getElementById('trackSelect').value;
    const trackName = tracksData[track]?.name || track;
    const container = document.getElementById('curvesContainer');
    
    let text = `🏍️ Kurven-Guide: ${trackName}\n------------------\n`;
    if (container) {
        const cards = container.querySelectorAll('.curve-card');
        cards.forEach(card => {
            const i = card.dataset.curveNum;
            const status = card.dataset.status || 'green';
            const gear = document.getElementById(`curve_gear_${i}`)?.value || '';
            const line = document.getElementById(`curve_line_${i}`)?.value || '';
            const notes = document.getElementById(`curve_notes_${i}`)?.value || '';

            if (gear || line || notes) {
                let statusEmoji = status === 'red' ? '🔴' : (status === 'yellow' ? '🟡' : '🟢');
                text += `Kurve ${i} ${statusEmoji}\n`;
                if (gear) text += ` Gang: ${gear}\n`;
                if (line) text += ` Linie: ${line}\n`;
                if (notes) text += ` Notiz: ${notes}\n`;
                text += `------------------\n`;
            }
        });
    }

    if (navigator.share) {
        navigator.share({ title: `Kurven ${trackName}`, text: text }).catch(() => {});
    } else {
        navigator.clipboard.writeText(text).then(() => {
            showNotice('saveNoticeCurves', 'In Zwischenablage kopiert!');
        });
    }
}

function getLapSessionsKey(track) {
    return 'upper_laps_' + track;
}

function loadLapSessionsForTrack(track) {
    const lapSelect = document.getElementById('lapSessionSelect');
    if (!lapSelect) return;
    lapSelect.innerHTML = '';

    let lapSessions = JSON.parse(localStorage.getItem(getLapSessionsKey(track))) || {};
    let keys = Object.keys(lapSessions).sort((a, b) => new Date(b.replace(' ', 'T')) - new Date(a.replace(' ', 'T')));

    if (keys.length === 0) {
        const defaultKey = getLocalTimestamp();
        lapSessions[defaultKey] = [];
        localStorage.setItem(getLapSessionsKey(track), JSON.stringify(lapSessions));
        keys = [defaultKey];
    }

    keys.forEach(k => {
        let opt = document.createElement('option');
        opt.value = k;
        opt.textContent = k;
        lapSelect.appendChild(opt);
    });

    lapSelect.value = keys[0];
    renderLapList(lapSessions[keys[0]]);
}

function onLapSessionChange() {
    const track = document.getElementById('trackSelect').value;
    const lapSelect = document.getElementById('lapSessionSelect');
    if (!lapSelect) return;
    const lapSessions = JSON.parse(localStorage.getItem(getLapSessionsKey(track))) || {};
    renderLapList(lapSessions[lapSelect.value] || []);
}

function startNewLapSession() {
    const track = document.getElementById('trackSelect').value;
    const newKey = getLocalTimestamp();
    
    let lapSessions = JSON.parse(localStorage.getItem(getLapSessionsKey(track))) || {};
    lapSessions[newKey] = [];
    localStorage.setItem(getLapSessionsKey(track), JSON.stringify(lapSessions));

    loadLapSessionsForTrack(track);
    document.getElementById('lapSessionSelect').value = newKey;
    renderLapList([]);
}

function deleteCurrentLapSession() {
    const track = document.getElementById('trackSelect').value;
    const lapSelect = document.getElementById('lapSessionSelect');
    if (!lapSelect) return;
    const sessionKey = lapSelect.value;

    let lapSessions = JSON.parse(localStorage.getItem(getLapSessionsKey(track))) || {};
    if (Object.keys(lapSessions).length <= 1) {
        alert("Der letzte Stint kann nicht gelöscht werden.");
        return;
    }

    if (confirm(`Stint "${sessionKey}" löschen?`)) {
        delete lapSessions[sessionKey];
        localStorage.setItem(getLapSessionsKey(track), JSON.stringify(lapSessions));
        loadLapSessionsForTrack(track);
    }
}

function addManualLap() {
    const track = document.getElementById('trackSelect').value;
    const lapSelect = document.getElementById('lapSessionSelect');
    if (!lapSelect) return;
    const sessionKey = lapSelect.value;

    const min = document.getElementById('manualMin').value.trim();
    const sec = document.getElementById('manualSec').value.trim();
    const ms = document.getElementById('manualMs').value.trim();
    const lapNumInput = document.getElementById('manualLapNum').value.trim();

    if (!sec && !min) {
        alert("Bitte Zeit eingeben!");
        return;
    }

    const sVal = sec ? String(sec).padStart(2, '0') : '00';
    const mVal = min ? min + ':' : '';
    const msVal = ms ? String(ms).padEnd(3, '0').slice(0, 3) : '000';
    const timeStr = `${mVal}${sVal}.${msVal}`;
    const totalMs = (parseInt(min || 0) * 60 * 1000) + (parseInt(sec || 0) * 1000) + parseInt(ms || 0);

    let lapSessions = JSON.parse(localStorage.getItem(getLapSessionsKey(track))) || {};
    if (!lapSessions[sessionKey]) lapSessions[sessionKey] = [];

    const lapNum = lapNumInput ? parseInt(lapNumInput) : (lapSessions[sessionKey].length + 1);

    lapSessions[sessionKey].push({ lapNum, timeStr, totalMs });
    lapSessions[sessionKey].sort((a, b) => a.lapNum - b.lapNum);

    localStorage.setItem(getLapSessionsKey(track), JSON.stringify(lapSessions));
    renderLapList(lapSessions[sessionKey]);
    checkAndUpdateAllTimeBest(timeStr, totalMs, track);

    document.getElementById('manualMin').value = '';
    document.getElementById('manualSec').value = '';
    document.getElementById('manualMs').value = '';
    document.getElementById('manualLapNum').value = '';
}

function renderLapList(lapsArray) {
    const container = document.getElementById('lapsContainer');
    if (!container) return;

    if (!lapsArray || lapsArray.length === 0) {
        container.innerHTML = `<p style="font-size:0.75rem; color:#888;">Noch keine Runden.</p>`;
        return;
    }

    let html = `<table style="width:100%; border-collapse:collapse; text-align:left;">
        <tr style="border-bottom:1px solid #444; font-size:0.75rem; color:#aaa;">
            <th style="padding:4px;">Runde</th>
            <th style="padding:4px;">Zeit</th>
        </tr>`;

    lapsArray.forEach(lap => {
        html += `<tr style="border-bottom:1px solid #222;">
            <td style="padding:4px;">Runde ${lap.lapNum}</td>
            <td style="padding:4px; font-weight:bold; color:#4CAF50;">${lap.timeStr}</td>
        </tr>`;
    });

    html += `</table>`;
    container.innerHTML = html;
}

function confirmClearLaps() {
    const track = document.getElementById('trackSelect').value;
    const lapSelect = document.getElementById('lapSessionSelect');
    if (!lapSelect) return;
    const sessionKey = lapSelect.value;

    if (confirm("Stint leeren?")) {
        let lapSessions = JSON.parse(localStorage.getItem(getLapSessionsKey(track))) || {};
        lapSessions[sessionKey] = [];
        localStorage.setItem(getLapSessionsKey(track), JSON.stringify(lapSessions));
        renderLapList([]);
    }
}

function checkAndUpdateAllTimeBest(timeStr, totalMs, track) {
    const bestKey = `allTimeBest_${track}`;
    const currentBest = JSON.parse(localStorage.getItem(bestKey));
    if (!currentBest || totalMs < currentBest.totalMs) {
        localStorage.setItem(bestKey, JSON.stringify({ timeStr, totalMs, date: getLocalTimestamp() }));
        loadAllTimeBest();
    }
}

function loadAllTimeBest() {
    const track = document.getElementById('trackSelect').value;
    const best = JSON.parse(localStorage.getItem(`allTimeBest_${track}`));
    const headerValEl = document.getElementById('headerAllTimeValue');
    
    if (best && best.timeStr) {
        if (headerValEl) headerValEl.textContent = best.timeStr;
    } else {
        if (headerValEl) headerValEl.textContent = '--:--.---';
    }
}

function confirmClearAllTimeBest() {
    try {
        const trackEl = document.getElementById('trackSelect');
        if (!trackEl) return;
        const track = trackEl.value;
        
        if (confirm(`Möchtest du die Bestzeit für diese Strecke wirklich löschen?`)) {
            localStorage.removeItem(`allTimeBest_${track}`);
            localStorage.removeItem('allTimeBest_' + encodeURIComponent(track));
            loadAllTimeBest();
            showNotice('saveNotice', 'Bestzeit erfolgreich gelöscht!');
        }
    } catch (e) {
        console.error("Fehler beim Löschen der Bestzeit:", e);
        alert("Fehler beim Löschen. Bitte Browser-Einstellungen prüfen.");
    }
}

function openCupInBrowser() {
    const urlInput = document.getElementById('cupUrlInput');
    let url = urlInput ? urlInput.value.trim() : '';
    if (!url) url = DEFAULT_CUP_URL;
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
    const savedUrl = localStorage.getItem('cupUrl');
    const url = (savedUrl && savedUrl.trim() !== '') ? savedUrl : DEFAULT_CUP_URL;
    if (urlInput) urlInput.value = url;
}

// BILD-UPLOAD (MULTI-BILD & KAMERA / GALERIE)
function handleImageUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const track = document.getElementById('trackSelect').value;
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect) return;
    const sessionKey = sessionSelect.value;
    if (!sessionKey) return;

    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    let existingData = sessions[sessionKey] || getEmptySessionData(track);
    let currentImages = existingData.tireImages || (existingData.tireImage ? [existingData.tireImage] : []);

    let processedCount = 0;
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const rawDataUrl = e.target.result;
            const img = new Image();
            
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxWidth = 800;
                    const maxHeight = 800;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
                    currentImages.push(dataUrl);
                } catch (err) {
                    currentImages.push(rawDataUrl);
                }

                processedCount++;
                if (processedCount === files.length) {
                    saveImagesToSession(track, sessionKey, sessions, existingData, currentImages);
                }
            };

            img.onerror = function() {
                currentImages.push(rawDataUrl);
                processedCount++;
                if (processedCount === files.length) {
                    saveImagesToSession(track, sessionKey, sessions, existingData, currentImages);
                }
            };

            img.src = rawDataUrl;
        };
        reader.readAsDataURL(file);
    });

    event.target.value = '';
}

function saveImagesToSession(track, sessionKey, sessions, existingData, currentImages) {
    existingData.tireImages = currentImages;
    delete existingData.tireImage;
    
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
        tireImages: currentImages
    };

    try {
        localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
        renderTireImages(currentImages);
    } catch (e) {
        alert("Speicherlimit überschritten! Zu viele oder zu große Bilder im Speicher.");
    }
}

function deleteSingleTireImage(index) {
    const track = document.getElementById('trackSelect').value;
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect) return;
    const sessionKey = sessionSelect.value;
    if (!sessionKey) return;

    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    let existingData = sessions[sessionKey] || {};
    let currentImages = existingData.tireImages || (existingData.tireImage ? [existingData.tireImage] : []);

    currentImages.splice(index, 1);
    existingData.tireImages = currentImages;
    delete existingData.tireImage;
    
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
        tireImages: currentImages
    };

    try {
        localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
        renderTireImages(currentImages);
    } catch (e) {
        alert("Fehler beim Speichern nach dem Löschen.");
    }
}

function deleteAllTireImages() {
    if (!confirm("Alle Reifenbilder dieses Eintrags löschen?")) return;
    const track = document.getElementById('trackSelect').value;
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect) return;
    const sessionKey = sessionSelect.value;
    if (!sessionKey) return;

    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    let existingData = sessions[sessionKey] || {};
    existingData.tireImages = [];
    delete existingData.tireImage;
    
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
        tireImages: []
    };

    try {
        localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
        renderTireImages([]);
    } catch (e) {
        alert("Fehler beim Speichern.");
    }
}

function deleteTireImage() {
    deleteAllTireImages();
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
    setTimeout(() => { el.style.display = 'none'; }, 2500);
}
