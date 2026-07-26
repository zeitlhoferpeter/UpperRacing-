// backup.js - UpperRacing Clean Backup (Ohne internen Speicher)

function initBackup() {
    checkDailyBackupReminder();
    renderCleanBackupUI();
}

// 1. BACKUP EXPORTIEREN & SPEICHERN
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

        localStorage.setItem('upper_last_backup_date', dateStr);
        localStorage.removeItem('upper_has_new_changes');
        
        const banner = document.getElementById('backupReminderBanner');
        if (banner) banner.style.display = 'none';

        if (navigator.share && navigator.canShare) {
            const file = new File([dataStr], fileName, { type: 'application/json' });
            if (navigator.canShare({ files: [file] })) {
                navigator.share({
                    title: 'UpperRacing Backup',
                    text: 'Backup-Datei',
                    files: [file]
                }).catch(() => {
                    fallbackDownload(dataStr, fileName);
                });
                return;
            }
        }

        fallbackDownload(dataStr, fileName);
    } catch (e) {
        console.error("Backup-Fehler:", e);
        alert("Fehler beim Erstellen des Backups.");
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

// 2. CODE IN DIE ZWISCHENABLAGE KOPIEREN
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

// 3. BENUTZEROBERFLÄCHE (Nur Export, Kopieren & Text-Import)
function renderCleanBackupUI() {
    const container = document.getElementById('internalBackupsContainer');
    if (!container) return;

    if (document.getElementById('cleanBackupBox')) return;

    container.innerHTML = `
        <div id="cleanBackupBox">
            <div style="display:flex; gap:8px; margin-bottom:12px;">
                <button type="button" onclick="exportBackup()" style="flex:1; background:#4CAF50; color:#fff; border:none; padding:10px; border-radius:6px; cursor:pointer; font-size:0.85rem; font-weight:bold;">💾 Backup exportieren</button>
                <button type="button" onclick="copyBackupToClipboard()" style="background:#6c757d; color:#fff; border:none; padding:10px; border-radius:6px; cursor:pointer; font-size:0.85rem; font-weight:bold;">📋 Kopieren</button>
            </div>

            <p style="font-size:0.80rem; color:#4da6ff; margin:0 0 6px 0; font-weight:bold;">📥 Backup per Text einfügen (Wiederherstellen):</p>
            <textarea id="backupTextData" placeholder="Backup-Code hier einfügen..." style="width:100%; height:80px; background:#111; color:#fff; border:1px solid #444; border-radius:6px; font-size:0.75rem; padding:8px; box-sizing:border-box;"></textarea>
            
            <button type="button" onclick="importBackupFromText()" style="margin-top:8px; width:100%; background:#ff9800; color:#fff; border:none; padding:8px; border-radius:6px; cursor:pointer; font-size:0.85rem; font-weight:bold;">Aus Text wiederherstellen</button>
        </div>
    `;
}

// 4. TEXT-IMPORT FUNKTION
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
