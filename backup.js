// backup.js - UpperRacing Clean Backup & Restore System

function initBackup() {
    checkGlobalReminder();
    renderCleanBackupUI();
}

// Globaler Check beim Laden jeder Seite
document.addEventListener('DOMContentLoaded', () => {
    checkGlobalReminder();
});

// 1. BACKUP EXPORTIEREN (Datei / Teilen)
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

        // Änderungen als gesichert markieren
        localStorage.removeItem('upper_has_new_changes');
        hideGlobalReminder();

        // Mobil-Share-Menü oder Fallback-Download
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
    
    localStorage.removeItem('upper_has_new_changes');
    hideGlobalReminder();

    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
        alert("📋 Backup-Code in die Zwischenablage kopiert!");
    }).catch(err => {
        alert("Kopieren fehlgeschlagen: " + err);
    });
}

// 3. UI FÜR EXPORT & IMPORT (Auf der Backup-Seite)
function renderCleanBackupUI() {
    const container = document.getElementById('internalBackupsContainer');
    if (!container) return;

    if (document.getElementById('cleanBackupBox')) return;

    container.innerHTML = `
        <div id="cleanBackupBox" style="display:flex; flex-direction:column; gap:14px;">
            <div style="display:flex; gap:8px;">
                <button type="button" onclick="exportBackup()" style="flex:1; background:#4CAF50; color:#fff; border:none; padding:10px; border-radius:6px; cursor:pointer; font-size:0.85rem; font-weight:bold;">💾 Als Datei speichern</button>
                <button type="button" onclick="copyBackupToClipboard()" style="background:#6c757d; color:#fff; border:none; padding:10px; border-radius:6px; cursor:pointer; font-size:0.85rem; font-weight:bold;">📋 Kopieren</button>
            </div>

            <div style="border-top:1px solid #444; padding-top:10px;">
                <p style="font-size:0.80rem; color:#4da6ff; margin:0 0 6px 0; font-weight:bold;">📥 1. Wiederherstellen von Datei:</p>
                <input type="file" id="backupFileInput" accept=".json" onchange="importBackupFromFile(event)" style="width:100%; color:#fff; background:#111; padding:8px; border:1px solid #444; border-radius:6px; font-size:0.8rem; box-sizing:border-box;">
            </div>

            <div style="border-top:1px solid #444; padding-top:10px;">
                <p style="font-size:0.80rem; color:#4da6ff; margin:0 0 6px 0; font-weight:bold;">📥 2. Wiederherstellen per Text-Einfügen:</p>
                <textarea id="backupTextData" placeholder="Backup-Code hier einfügen..." style="width:100%; height:75px; background:#111; color:#fff; border:1px solid #444; border-radius:6px; font-size:0.75rem; padding:8px; box-sizing:border-box;"></textarea>
                <button type="button" onclick="importBackupFromText()" style="margin-top:8px; width:100%; background:#ff9800; color:#fff; border:none; padding:8px; border-radius:6px; cursor:pointer; font-size:0.85rem; font-weight:bold;">Aus Text wiederherstellen</button>
            </div>
        </div>
    `;
}

// 4. IMPORT FUNKTIONEN (Datei & Text)
function importBackupFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let text = e.target.result;
            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

            const data = JSON.parse(text);
            if (typeof data !== 'object' || data === null) {
                throw new Error("Kein gültiges JSON-Objekt.");
            }

            if (confirm("Möchtest du dieses Backup wirklich aus der Datei wiederherstellen? Alle aktuellen lokalen Daten werden überschrieben!")) {
                localStorage.clear();
                for (const key in data) {
                    localStorage.setItem(key, data[key]);
                }
                alert("Backup erfolgreich wiederhergestellt! Die App wird jetzt neu geladen.");
                location.reload();
            }
        } catch (err) {
            console.error("Datei-Import-Fehler:", err);
            alert("Ungültige Backup-Datei.\nFehler: " + err.message);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
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

// 5. GLOBALE ÄNDERUNGS- & ERINNERUNGS-LOGIK
function markDataAsChanged() {
    localStorage.setItem('upper_has_new_changes', 'true');
    checkGlobalReminder();
}

function checkGlobalReminder() {
    const hasChanges = localStorage.getItem('upper_has_new_changes') === 'true';
    let banner = document.getElementById('globalBackupReminderBanner');

    if (hasChanges) {
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'globalBackupReminderBanner';
            banner.style.cssText = 'position:fixed; top:0; left:0; width:100%; background:#d9534f; color:#fff; text-align:center; padding:8px; font-size:0.8rem; font-weight:bold; z-index:99999; box-shadow:0 2px 5px rgba(0,0,0,0.3);';
            banner.innerHTML = '⚠️ Achtung: Ungespeicherte Änderungen (Setup/Zeiten)! Bitte erstelle ein Backup.';
            document.body.prepend(banner);
        } else {
            banner.style.display = 'block';
        }
    } else {
        if (banner) {
            banner.style.display = 'none';
        }
    }
}

function hideGlobalReminder() {
    const banner = document.getElementById('globalBackupReminderBanner');
    if (banner) banner.style.display = 'none';
}
