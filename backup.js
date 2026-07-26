// backup.js - UpperRacing Backup & Restore

function initBackup() {
    checkDailyBackupReminder();
}

// 1. Alle localStorage-Daten als JSON-Datei exportieren (Backup)
function exportBackup() {
    try {
        let data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchor = document.createElement('a');
        
        const dateStr = new Date().toISOString().split('T')[0];
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `UpperRacing_Backup_${dateStr}.json`);
        
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        // Nach erfolgreichem Export: Letztes Backup-Datum setzen und Änderungssperre aufheben
        localStorage.setItem('upper_last_backup_date', dateStr);
        localStorage.removeItem('upper_has_new_changes');
        
        const banner = document.getElementById('backupReminderBanner');
        if (banner) banner.style.display = 'none';

        showNotice('saveNoticeBackup', 'Backup erfolgreich erstellt & heruntergeladen!');
    } catch (e) {
        console.error("Backup-Fehler:", e);
        alert("Fehler beim Erstellen des Backups.");
    }
}

// 2. Backup-Datei wieder einlesen und in den localStorage schreiben (Restore)
function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm("Möchtest du dieses Backup wirklich einspielen? Alle aktuellen lokalen Daten werden dabei durch das Backup überschrieben!")) {
                localStorage.clear();
                for (const key in data) {
                    localStorage.setItem(key, data[key]);
                }
                alert("Backup erfolgreich wiederhergestellt! Die App wird jetzt neu geladen.");
                location.reload();
            }
        } catch (err) {
            console.error("Import-Fehler:", err);
            alert("Fehler beim Lesen der Datei. Ungültiges Backup-Format.");
        }
    };
    reader.readAsText(file);
}

// 3. Nur dann erinnern, wenn heute neue Einträge gemacht wurden
function checkDailyBackupReminder() {
    const lastBackupDate = localStorage.getItem('upper_last_backup_date');
    const today = new Date().toISOString().split('T')[0];
    const hasNewChanges = localStorage.getItem('upper_has_new_changes');

    const banner = document.getElementById('backupReminderBanner');
    if (!banner) return;

    // Zeige Banner nur, wenn heute Änderungen gemacht wurden UND heute noch kein Backup lief
    if (hasNewChanges === 'true' && lastBackupDate !== today) {
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

// Hilfsfunktion: Bei jeder wichtigen Speicherung in app.js aufrufen (z.B. saveData(), newSession() etc.)
function markDataAsChanged() {
    localStorage.setItem('upper_has_new_changes', 'true');
}
