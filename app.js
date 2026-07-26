// UpperRacing App Logic

const tracksConfig = {
    pannoniaring: { name: "Pannoniaring", curves: 12 },
    slovakia: { name: "Slovakiaring", curves: 14 },
    brünn: { name: "Brünn", curves: 14 },
    most: { name: "Autodrom Most", curves: 21 },
    grobnik: { name: "Grobnik / Rijeka", curves: 15 }
};

function initApp() {
    onTrackChange();
    initCurves();
    initLaps();
    loadCupUrl();
}

function switchPage(pageId) {
    document.querySelectorAll('.page-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetPage = document.getElementById('page' + pageId.charAt(0).toUpperCase() + pageId.slice(1));
    if (targetPage) targetPage.style.display = 'block';
    
    event.currentTarget.classList.add('active');
}

function getSessionsKey(track) {
    return 'upper_racing_sessions_' + track;
}

function getEmptySessionData(track) {
    return {
        tireFront: '',
        tireRear: '',
        outsideTemp: '',
        gearing: '',
        forkRebound: '',
        forkCompression: '',
        forkPreload: '',
        forkSag: '',
        forkRemaining: '',
        shockRebound: '',
        shockCompression: '',
        shockPreload: '',
        shockSag: '',
        shockRemaining: '',
        tireImages: []
    };
}

function onTrackChange() {
    updateSessionSelects();
    loadTrackData();
    updateAllTimeBestDisplay();
}

function updateSessionSelects() {
    const track = document.getElementById('trackSelect').value;
    const sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || { "Session 1": getEmptySessionData(track) };
    
    const sessionSelect = document.getElementById('sessionSelect');
    const lapSessionSelect = document.getElementById('lapSessionSelect');
    
    const currentSession = sessionSelect ? sessionSelect.value : "Session 1";
    const currentLapSession = lapSessionSelect ? lapSessionSelect.value : "Session 1";
    
    let html = '';
    Object.keys(sessions).forEach(sKey => {
        html += `<option value="${sKey}">${sKey}</option>`;
    });
    
    if (sessionSelect) {
        sessionSelect.innerHTML = html;
        if (sessions[currentSession]) sessionSelect.value = currentSession;
    }
    if (lapSessionSelect) {
        lapSessionSelect.innerHTML = html;
        if (sessions[currentLapSession]) lapSessionSelect.value = currentLapSession;
    }
    
    loadSessionData();
    renderLaps();
}

function loadTrackData() {
    loadSessionData();
}

function onSessionChange() {
    loadSessionData();
}

function loadSessionData() {
    const track = document.getElementById('trackSelect').value;
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect) return;
    const sessionKey = sessionSelect.value;
    
    const sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    const data = sessions[sessionKey] || getEmptySessionData(track);
    
    document.getElementById('tireFront').value = data.tireFront || '';
    document.getElementById('tireRear').value = data.tireRear || '';
    document.getElementById('outsideTemp').value = data.outsideTemp || '';
    document.getElementById('gearing').value = data.gearing || '';
    document.getElementById('forkRebound').value = data.forkRebound || '';
    document.getElementById('forkCompression').value = data.forkCompression || '';
    document.getElementById('forkPreload').value = data.forkPreload || '';
    document.getElementById('forkSag').value = data.forkSag || '';
    document.getElementById('forkRemaining').value = data.forkRemaining || '';
    document.getElementById('shockRebound').value = data.shockRebound || '';
    document.getElementById('shockCompression').value = data.shockCompression || '';
    document.getElementById('shockPreload').value = data.shockPreload || '';
    document.getElementById('shockSag').value = data.shockSag || '';
    document.getElementById('shockRemaining').value = data.shockRemaining || '';
    
    const images = data.tireImages || (data.tireImage ? [data.tireImage] : []);
    renderTireImages(images);
}

function saveData() {
    const track = document.getElementById('trackSelect').value;
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect) return;
    const sessionKey = sessionSelect.value;
    
    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    const existingImages = sessions[sessionKey]?.tireImages || [];
    
    sessions[sessionKey] = {
        tireFront: document.getElementById('tireFront').value,
        tireRear: document.getElementById('tireRear').value,
        outsideTemp: document.getElementById('outsideTemp').value,
        gearing: document.getElementById('gearing').value,
        forkRebound: document.getElementById('forkRebound').value,
        forkCompression: document.getElementById('forkCompression').value,
        forkPreload: document.getElementById('forkPreload').value,
        forkSag: document.getElementById('forkSag').value,
        forkRemaining: document.getElementById('forkRemaining').value,
        shockRebound: document.getElementById('shockRebound').value,
        shockCompression: document.getElementById('shockCompression').value,
        shockPreload: document.getElementById('shockPreload').value,
        shockSag: document.getElementById('shockSag').value,
        shockRemaining: document.getElementById('shockRemaining').value,
        tireImages: existingImages
    };
    
    localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
    showNotice('saveNotice', 'Gespeichert!');
}

function newSession() {
    const track = document.getElementById('trackSelect').value;
    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    
    const newName = prompt("Name für neue Session:", "Session " + (Object.keys(sessions).length + 1));
    if (!newName) return;
    
    if (sessions[newName]) {
        alert("Session existiert bereits!");
        return;
    }
    
    sessions[newName] = getEmptySessionData(track);
    localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
    updateSessionSelects();
    document.getElementById('sessionSelect').value = newName;
    onSessionChange();
}

function deleteCurrentSession() {
    const track = document.getElementById('trackSelect').value;
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect) return;
    const sessionKey = sessionSelect.value;
    
    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    if (Object.keys(sessions).length <= 1) {
        alert("Die letzte Session kann nicht gelöscht werden.");
        return;
    }
    
    if (confirm(`Session "${sessionKey}" wirklich löschen?`)) {
        delete sessions[sessionKey];
        localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
        updateSessionSelects();
    }
}

function saveAsBaseline() {
    const track = document.getElementById('trackSelect').value;
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect) return;
    const sessionKey = sessionSelect.value;
    
    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    if (!sessions[sessionKey]) return;
    
    localStorage.setItem('baseline_' + track, JSON.stringify(sessions[sessionKey]));
    showNotice('saveNotice', 'Als Basis-Setup gespeichert!');
}

function loadBaseline() {
    const track = document.getElementById('trackSelect').value;
    const baseline = localStorage.getItem('baseline_' + track);
    if (!baseline) {
        alert("Kein Basis-Setup für diese Strecke gespeichert.");
        return;
    }
    
    if (confirm("Aktuelles Setup mit Basis-Setup überschreiben?")) {
        const data = JSON.parse(baseline);
        document.getElementById('tireFront').value = data.tireFront || '';
        document.getElementById('tireRear').value = data.tireRear || '';
        document.getElementById('outsideTemp').value = data.outsideTemp || '';
        document.getElementById('gearing').value = data.gearing || '';
        document.getElementById('forkRebound').value = data.forkRebound || '';
        document.getElementById('forkCompression').value = data.forkCompression || '';
        document.getElementById('forkPreload').value = data.forkPreload || '';
        document.getElementById('forkSag').value = data.forkSag || '';
        document.getElementById('forkRemaining').value = data.forkRemaining || '';
        document.getElementById('shockRebound').value = data.shockRebound || '';
        document.getElementById('shockCompression').value = data.shockCompression || '';
        document.getElementById('shockPreload').value = data.shockPreload || '';
        document.getElementById('shockSag').value = data.shockSag || '';
        document.getElementById('shockRemaining').value = data.shockRemaining || '';
        saveData();
        showNotice('saveNotice', 'Basis-Setup geladen!');
    }
}

// --- BILD-UPLOAD ---
function handleImageUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const track = document.getElementById('trackSelect')?.value;
    const sessionSelect = document.getElementById('sessionSelect');
    if (!track || !sessionSelect) return;
    const sessionKey = sessionSelect.value;
    if (!sessionKey) return;

    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    let existingData = sessions[sessionKey] || getEmptySessionData(track);
    let currentImages = existingData.tireImages || (existingData.tireImage ? [existingData.tireImage] : []);

    let processedCount = 0;
    const fileArray = Array.from(files);

    fileArray.forEach(file => {
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
                        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                    } else {
                        if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
                    currentImages.push(compressedDataUrl);
                } catch (err) {
                    currentImages.push(rawDataUrl);
                }
                checkDone();
            };

            img.onerror = function() {
                currentImages.push(rawDataUrl);
                checkDone();
            };

            img.src = rawDataUrl;
        };

        reader.onerror = function() {
            checkDone();
        };

        reader.readAsDataURL(file);
    });

    function checkDone() {
        processedCount++;
        if (processedCount === fileArray.length) {
            saveImagesToSession(track, sessionKey, sessions, existingData, currentImages);
        }
    }

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
        showNotice('saveNotice', 'Reifenbild(er) erfolgreich hinzugefügt!');
    } catch (e) {
        alert("Speicherlimit überschritten! Zu viele oder zu große Bilder im localStorage.");
    }
}

function renderTireImages(images) {
    const container = document.getElementById('tireImageContainer');
    if (!container) return;
    
    if (!images || images.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    
    container.style.display = 'block';
    let html = '<div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-bottom:8px;">';
    
    images.forEach((imgSrc, index) => {
        html += `
            <div style="position:relative; width:80px; height:80px; border:1px solid #444; border-radius:4px; overflow:hidden; background:#111;">
                <img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="openModal('${imgSrc}')">
                <button type="button" onclick="deleteTireImage(${index})" style="position:absolute; top:2px; right:2px; background:rgba(244,67,54,0.8); color:#fff; border:none; border-radius:50%; width:20px; height:20px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">&times;</button>
            </div>
        `;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
}

function deleteTireImage(index) {
    if (!confirm("Dieses Reifenbild wirklich löschen?")) return;
    
    const track = document.getElementById('trackSelect').value;
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect) return;
    const sessionKey = sessionSelect.value;
    
    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    if (!sessions[sessionKey] || !sessions[sessionKey].tireImages) return;
    
    sessions[sessionKey].tireImages.splice(index, 1);
    localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
    renderTireImages(sessions[sessionKey].tireImages);
}

function openModal(src) {
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

// --- CURVES & LAPS & CUP HELPERS ---
function initCurves() {
    renderCurves();
}

function renderCurves() {
    const container = document.getElementById('curvesContainer');
    if (!container) return;
    const track = document.getElementById('trackSelect').value;
    const count = tracksConfig[track]?.curves || 10;
    const saved = JSON.parse(localStorage.getItem('curves_' + track)) || {};
    
    let html = '';
    for (let i = 1; i <= count; i++) {
        const val = saved['curve_' + i] || '';
        html += `
            <div class="setup-box" style="margin-bottom:8px; padding:10px;">
                <label style="font-weight:bold; color:#FFD700; margin-bottom:4px; display:block;">Kurve ${i}</label>
                <textarea id="curveText_${i}" placeholder="Gang, Linie, Bremspunkt..." style="width:100%; height:50px; background:#111; color:#fff; border:1px solid #444; border-radius:4px; padding:6px; font-size:0.85rem;">${val}</textarea>
            </div>
        `;
    }
    container.innerHTML = html;
}

function saveCurvesData() {
    const track = document.getElementById('trackSelect').value;
    const count = tracksConfig[track]?.curves || 10;
    let data = {};
    for (let i = 1; i <= count; i++) {
        const el = document.getElementById('curveText_' + i);
        if (el) data['curve_' + i] = el.value;
    }
    localStorage.setItem('curves_' + track, JSON.stringify(data));
    showNotice('saveNoticeCurves', 'Kurven-Guide gespeichert!');
}

function shareCurves() {
    const track = document.getElementById('trackSelect').value;
    const count = tracksConfig[track]?.curves || 10;
    let text = `Kurven-Guide ${tracksConfig[track]?.name}:\n`;
    for (let i = 1; i <= count; i++) {
        const el = document.getElementById('curveText_' + i);
        if (el && el.value) {
            text += `Kurve ${i}: ${el.value}\n`;
        }
    }
    if (navigator.share) {
        navigator.share({ title: 'UpperRacing Kurven', text: text }).catch(() => {});
    } else {
        navigator.clipboard.writeText(text);
        alert("In die Zwischenablage kopiert!");
    }
}

function initLaps() {
    updateSessionSelects();
}

function onLapSessionChange() {
    renderLaps();
}

function startNewLapSession() {
    newSession();
}

function deleteCurrentLapSession() {
    deleteCurrentSession();
}

function addManualLap() {
    const min = parseInt(document.getElementById('manualMin').value) || 0;
    const sec = parseInt(document.getElementById('manualSec').value) || 0;
    const ms = parseInt(document.getElementById('manualMs').value) || 0;
    const lapNumInput = document.getElementById('manualLapNum');
    
    if (sec === 0 && min === 0 && ms === 0) {
        alert("Bitte eine gültige Rundenzeit eingeben!");
        return;
    }

    const track = document.getElementById('trackSelect').value;
    const lapSessionSelect = document.getElementById('lapSessionSelect');
    if (!lapSessionSelect) return;
    const sessionKey = lapSessionSelect.value;

    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    if (!sessions[sessionKey]) sessions[sessionKey] = getEmptySessionData(track);
    if (!sessions[sessionKey].laps) sessions[sessionKey].laps = [];

    const totalMs = (min * 60 * 1000) + (sec * 1000) + ms;
    const lapNum = lapNumInput.value ? parseInt(lapNumInput.value) : (sessions[sessionKey].laps.length + 1);

    sessions[sessionKey].laps.push({ num: lapNum, time: totalMs, formatted: formatTime(totalMs) });
    localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));

    document.getElementById('manualMin').value = '';
    document.getElementById('manualSec').value = '';
    document.getElementById('manualMs').value = '';
    lapNumInput.value = '';

    renderLaps();
    updateAllTimeBestDisplay();
}

function renderLaps() {
    const container = document.getElementById('lapsContainer');
    if (!container) return;
    const track = document.getElementById('trackSelect').value;
    const lapSessionSelect = document.getElementById('lapSessionSelect');
    if (!lapSessionSelect) return;
    const sessionKey = lapSessionSelect.value;

    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    const laps = sessions[sessionKey]?.laps || [];

    if (laps.length === 0) {
        container.innerHTML = '<p style="font-size:0.85rem; color:#aaa; text-align:center;">Noch keine Runden eingetragen.</p>';
        return;
    }

    let bestTime = Math.min(...laps.map(l => l.time));

    let html = '<div style="display:flex; flex-direction:column; gap:4px;">';
    laps.forEach((lap, idx) => {
        const isBest = lap.time === bestTime;
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:${isBest ? '#1b331b' : '#222'}; padding:8px 10px; border-radius:4px; border:${isBest ? '1px solid #4CAF50' : '1px solid #444'};">
                <span style="font-size:0.85rem; color:#aaa;">Runde ${lap.num}</span>
                <span style="font-size:0.95rem; font-weight:bold; color:${isBest ? '#4CAF50' : '#fff'};">${lap.formatted} ${isBest ? '🏆' : ''}</span>
                <button type="button" onclick="deleteLap(${idx})" style="background:none; border:none; color:#f44336; cursor:pointer; font-size:0.8rem;">🗑️</button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function deleteLap(index) {
    const track = document.getElementById('trackSelect').value;
    const lapSessionSelect = document.getElementById('lapSessionSelect');
    if (!lapSessionSelect) return;
    const sessionKey = lapSessionSelect.value;

    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    if (sessions[sessionKey]?.laps) {
        sessions[sessionKey].laps.splice(index, 1);
        localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
        renderLaps();
        updateAllTimeBestDisplay();
    }
}

function confirmClearLaps() {
    if (!confirm("Alle Runden dieses Stints löschen?")) return;
    const track = document.getElementById('trackSelect').value;
    const lapSessionSelect = document.getElementById('lapSessionSelect');
    if (!lapSessionSelect) return;
    const sessionKey = lapSessionSelect.value;

    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    if (sessions[sessionKey]) {
        sessions[sessionKey].laps = [];
        localStorage.setItem(getSessionsKey(track), JSON.stringify(sessions));
        renderLaps();
        updateAllTimeBestDisplay();
    }
}

function formatTime(ms) {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}.${millis < 10 ? '00' : (millis < 100 ? '0' : '')}${millis}`;
}

function updateAllTimeBestDisplay() {
    const track = document.getElementById('trackSelect').value;
    let sessions = JSON.parse(localStorage.getItem(getSessionsKey(track))) || {};
    let allLaps = [];
    Object.values(sessions).forEach(s => {
        if (s.laps) allLaps = allLaps.concat(s.laps);
    });

    const el = document.getElementById('headerAllTimeValue');
    if (!el) return;

    if (allLaps.length === 0) {
        el.innerText = '--:--.---';
        return;
    }

    let best = Math.min(...allLaps.map(l => l.time));
    el.innerText = formatTime(best);
}

function confirmClearAllTimeBest() {
    alert("Die Bestzeit ermittelt sich automatisch aus der schnellsten aller eingetragenen Runden über alle Sessions hinweg.");
}

function loadCupUrl() {
    const track = document.getElementById('trackSelect').value;
    const url = localStorage.getItem('cup_url_' + track) || '';
    const input = document.getElementById('cupUrlInput');
    if (input) input.value = url;
}

function saveCupUrl() {
    const track = document.getElementById('trackSelect').value;
    const input = document.getElementById('cupUrlInput');
    if (input) {
        localStorage.setItem('cup_url_' + track, input.value);
        alert("Cup-Link gespeichert!");
    }
}

function openCupInBrowser() {
    const input = document.getElementById('cupUrlInput');
    if (input && input.value) {
        window.open(input.value, '_blank');
    } else {
        alert("Bitte zuerst eine URL eintragen.");
    }
}

function showNotice(elementId, text) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerText = text;
    el.style.display = 'block';
    setTimeout(() => {
        el.style.display = 'none';
    }, 3000);
}
