// backup.js - UpperRacing Clean Backup & Restore System

function initBackup() {
    checkGlobalReminder();
}

// Globaler Check beim Laden jeder Seite
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkGlobalReminder);
} else {
    checkGlobalReminder();
}

// 1. BACKUP EXPORTIEREN (Datei / Teilen)
function exportBackup() {
    try {
        let data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }

        const dataStr = JSON.stringify(data, null, 2);
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const fileName = `UpperRacing_Backup_${dateStr}_${timeStr}.json`;

        localStorage.removeItem('upper_has_new_changes');
        hideGlobalReminder();

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
        showNoticeBackup('Erfolgreich als Datei gespeichert!');
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

// 2. IMPORT FUNKTION (Datei)
function importBackup(event) {
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

// 3. GLOBALE ÄNDERUNGS- & ERINNERUNGS-LOGIK
function markDataAsChanged() {
    localStorage.setItem('upper_has_new_changes', 'true');
    checkGlobalReminder();
}

function checkGlobalReminder() {
    const hasChanges = localStorage.getItem('upper_has_new_changes') === 'true';
    const banner = document.getElementById('backupReminderBanner');

    if (banner) {
        banner.style.display = hasChanges ? 'block' : 'none';
    }
}

function hideGlobalReminder() {
    const banner = document.getElementById('backupReminderBanner');
    if (banner) banner.style.display = 'none';
}

function showNoticeBackup(text) {
    const el = document.getElementById('saveNoticeBackup');
    if(!el) return;
    el.textContent = text;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 2500);
}
