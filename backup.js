// backup.js - UpperRacing Backup & Restore (Clean Mobile Version)

function initBackup() {
    checkDailyBackupReminder();
    renderCleanBackupUI();
}

// 1. BACKUP ALS DATEI SPEICHERN / TEILEN
function exportBackup() {
    try {
        let data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }

        const dataStr = JSON.stringify(data, null, 2);
        const dateStr = new Date().toISOString().split('T')[0];
        const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const fileName = `UpperRacing_Backup_${dateStr}_${timeStr}.json`;

        // Internes Backup als Sicherheitsnetz speichern
        saveInternalBackup(data);
        localStorage.setItem('upper_last_backup_date', dateStr);
        localStorage.removeItem('upper_has_new_changes');
        
        const banner = document.getElementById('backupReminderBanner');
        if (banner) banner.style.display = 'none';

        // Handy-Share-Menü öffnen (Erlaubt "In Dateien sichern" / direktes Speichern)
        if (navigator.share && navigator.canShare) {
            const file = new File([dataStr], fileName, { type: 'application/json' });
            if (navigator.canShare({ files: [file] })) {
                navigator.share({
                    title: 'UpperRacing Backup',
                    text: 'Backup-Datei für UpperRacing',
                    files: [file]
                }).catch((err) => {
                    if (err.name !== 'AbortError') {
                        fallbackDownload(dataStr, fileName);
                    }
                });
                renderInternalBackups();
                return;
            }
        }

        // Fallback für Desktop / Browser ohne Share-API
        fallbackDownload(dataStr, fileName);
        renderInternalBackups();

    } catch (e) {
        console.error("Backup-Fehler:", e);
        alert("Fehler beim Erstellen des Backups: " + e.message);
    }
}

function fallbackDownload(dataStr, fileName) {
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 2. INTERNE SICHERHEITSKOPIEN (Letzte 5 im Speicher)
function saveInternalBackup(data) {
    let history = [];
    try {
        const saved = localStorage.getItem('upper_internal_backups');
        if (saved) history = JSON.parse(saved);
    } catch(e) {}

    const now = new Date();
    const timestamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    history.unshift({ timestamp: timestamp, data: data });
    if (history.length > 5) history = history.slice(0, 5);

    localStorage.setItem('upper_internal_backups', JSON.stringify(history));
}

function renderInternalBackups() {
    const container = document.getElementById('internalBackupsContainer');
    if (!container) return;

    let history = [];
    try {
        const saved = localStorage.getItem('upper_internal_backups');
        if (saved) history = JSON.parse(saved);
    } catch(e) {}

    if (history.length === 0) {
        container.innerHTML = '<p style="font-size:0.8rem; color:#aaa; margin:0;">Noch keine internen Backups vorhanden.</p>';
        return;
    }

    let html = '<div style="display:flex; flex-direction:column; gap:6px;">';
    history.forEach((item, index) => {
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#181818; padding:6px 8px; border-radius:4px; border:1px solid #333;">
                <span style="font-size:0.8rem; color:#fff;">🕒 ${item.timestamp}</span>
                <button type="button" onclick="restoreInternalBackup(${index})" style="background:#2196F3; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem;">Wiederherstellen</button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function restoreInternalBackup(index) {
    let history = [];
    try {
        const saved = localStorage.getItem('upper_internal_backups');
        if (saved) history = JSON.parse(saved);
    } catch(e) {}

    if (!history[index]) return;

    if (confirm(`Möchtest du das Backup vom "${history[index].timestamp}" wirklich wiederherstellen? Aktuelle Daten werden überschrieben!`)) {
        const data = history[index].data;
        localStorage.clear();
        for (const key in data) {
            localStorage.setItem(key, data[key]);
        }
        alert("Backup erfolgreich wiederhergestellt! Die App wird jetzt neu geladen.");
        location.reload();
    }
}

// 3. SAUBERE UI FÜR EXPORT & TEXT-IMPORT
function renderCleanBackupUI() {
    const container = document.getElementById('internalBackupsContainer');
    if (!container) return;
    
    renderInternalBackups();

    if (document.getElementById('cleanBackupBox')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'cleanBackupBox';
    wrapper.style.marginTop = '15px';
    wrapper.style.borderTop = '1px solid #444';
    wrapper.style.paddingTop = '15px';
    wrapper.innerHTML = `
        <div style="display:flex; gap:8px; margin-bottom:12px;">
            <button type="button" onclick="exportBackup()" style="flex:1; background:#4CAF50; color:#fff; border:none; padding:10px; border-radius:6px; cursor:pointer; font-size:0.85rem; font-weight:bold;">💾 Backup als Datei speichern</button>
            <button type="button" onclick="copyBackupToClipboard()" style="background:#6c757d; color:#fff; border:none; padding:10px; border-radius:6px; cursor:pointer; font-size:0.85rem; font-weight:bold;">📋 Kopieren</button>
        </div>

        <p style="font-size:0.8rem; color:#4da6ff; margin:0 0 6px 0; font-weight:bold;">📥 Backup per Text einfügen:</p>
        <textarea id="backupTextData" placeholder="Backup-Code hier einfügen..." style="width:100%; height:70px; background:#111; color:#fff; border:1px solid #444; border-radius:6px; font-size:0.75rem; padding:8px; box-sizing:border-box;"></textarea>
        
        <button type="button" onclick="importBackupFromText()" style="margin-top:8px; width:100%; background:#ff9800; color:#fff; border:none; padding:8px; border-radius:6px; cursor:pointer; font-size:0.85rem; font-weight:bold;">Wiederherstellen</button>
    `;
    container.parentNode.appendChild(wrapper);
}

function copyBackupToClipboard() {
    let data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
    }
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
        alert("📋 Backup-Code in die Zwischenablage kopiert!");
    }).catch(err => {
        alert("Kopieren fehlgeschlagen: " + err);
    });
}

function importBackupFromText() {
    const textarea = document.getElementById('backupTextData');
    if (!textarea || !textarea.value.trim()) {
        alert("Bitte zuerst den Backup-Text in das Feld einfügen!");
        return;
    }

    try {
        let text = textarea.value.trim();
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

        const data = JSON.parse(text);
        if (typeof data !== 'object' || data === null) {
            throw new Error("Kein gültiges Objekt.");
        }

        if (confirm("Möchtest du dieses Backup wirklich einspielen? Alle aktuellen lokalen Daten werden dabei überschrieben!")) {
            localStorage.clear();
            for (const key in data) {
                localStorage.setItem(key, data[key]);
            }
            alert("Backup erfolgreich wiederhergestellt! Die App wird jetzt neu geladen.");
            location.reload();
        }
    } catch (err) {
        console.error("Import-Fehler:", err);
        alert("Ungültiges Backup-Format.\nFehler: " + err.message);
    }
}

// 4. Tägliche Erinnerung
function checkDailyBackupReminder() {
    const lastBackupDate = localStorage.getItem('upper_last_backup_date');
    const today = new Date().toISOString().split('T')[0];
    const hasNewChanges = localStorage.getItem('upper_has_new_changes');

    const banner = document.getElementById('backupReminderBanner');
    if (!banner) return;

    if (hasNewChanges === 'true' && lastBackupDate !== today) {
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

function markDataAsChanged() {
    localStorage.setItem('upper_has_new_changes', 'true');
}
