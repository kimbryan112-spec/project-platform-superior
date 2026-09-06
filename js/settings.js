/* ==================================
   SETTINGS.JS
   PART 1
   INITIALIZATION
================================== */

// =========================
// STORAGE MODE
// true = localStorage
// false = Cloudflare API
// =========================

const LOCAL_MODE =
    location.hostname === "127.0.0.1" ||
    location.hostname === "localhost";

console.log("================================");
console.log("SETTINGS PAGE");
console.log("Host:", location.hostname);
console.log("LOCAL_MODE:", LOCAL_MODE);
console.log("================================");

// ==================================
// GLOBAL VARIABLES
// ==================================

let currentYear = new Date().getFullYear().toString();

const monthNames = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
];

const monthMap = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

// ==================================
// LIVE CALENDAR
// ==================================

function updateLiveCalendar() {
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const day = now.getDate();

    const monthEl = document.getElementById("calendarMonth");
    const dayEl = document.getElementById("calendarDay");

    if (monthEl) monthEl.textContent = month;
    if (dayEl) dayEl.textContent = day;
}

// ==================================
// YEAR DROPDOWN
// ==================================

function initializeYearDropdown() {
    const yearSelect = document.getElementById("yearSelect");
    if (!yearSelect) return;

    yearSelect.innerHTML = "";
    const current = new Date().getFullYear();

    for (let year = 2023; year <= current + 5; year++) {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;

        if (year === current) {
            option.selected = true;
        }

        yearSelect.appendChild(option);
    }

    currentYear = String(current);

    yearSelect.addEventListener("change", () => {
        currentYear = yearSelect.value;
        const yearDisplay = document.getElementById("dbCurrentYear");

        if (yearDisplay) {
            yearDisplay.textContent = currentYear;
        }

        loadDatabaseStatus();
    });
}

// ==================================
// NEXT YEAR BUTTON
// ==================================

function initializeNextYearButton() {
    const nextYearBtn = document.querySelector(".next-year-btn");
    const yearSelect = document.getElementById("yearSelect");

    if (!nextYearBtn || !yearSelect) return;

    nextYearBtn.addEventListener("click", () => {
        const nextYear = String(Number(currentYear) + 1);
        const exists = [...yearSelect.options].some(option => option.value === nextYear);

        if (!exists) {
            const option = document.createElement("option");
            option.value = nextYear;
            option.textContent = nextYear;
            yearSelect.appendChild(option);
        }

        currentYear = nextYear;
        yearSelect.value = currentYear;

        const yearDisplay = document.getElementById("dbCurrentYear");
        if (yearDisplay) {
            yearDisplay.textContent = currentYear;
        }

        loadDatabaseStatus();
    });
}

// ==================================
// CURRENT MONTH LABEL
// ==================================

function updateCurrentMonthLabel() {
    const label = document.getElementById("dbCurrentMonth");
    if (!label) return;

    label.textContent = monthNames[new Date().getMonth()];
}

// ==================================
// LOGOUT
// ==================================

function initializeLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    const logoutConfirm = document.getElementById("logoutConfirm");
    const confirmLogout = document.getElementById("confirmLogout");
    const cancelLogout = document.getElementById("cancelLogout");

    if (logoutBtn && logoutConfirm) {
        logoutBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            logoutConfirm.classList.toggle("show");
        });
    }

    if (cancelLogout && logoutConfirm) {
        cancelLogout.addEventListener("click", (e) => {
            e.stopPropagation();
            logoutConfirm.classList.remove("show");
        });
    }

    if (confirmLogout) {
        confirmLogout.addEventListener("click", () => {
            localStorage.removeItem("currentUser");
            window.location.href = "../login.html";
        });
    }

    document.addEventListener("click", (e) => {
        if (
            logoutConfirm &&
            logoutBtn &&
            !logoutConfirm.contains(e.target) &&
            !logoutBtn.contains(e.target)
        ) {
            logoutConfirm.classList.remove("show");
        }
    });
}

// ==================================
// PAGE INITIALIZATION
// ==================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("[INIT] Settings page loaded.");
    updateLiveCalendar();
    setInterval(updateLiveCalendar, 60000);
    initializeYearDropdown();
    initializeNextYearButton();
    updateCurrentMonthLabel();
    initializeLogout();
    loadDatabaseStatus();
});

/* ==================================
   SETTINGS.JS
   PART 2
   DATABASE STATUS
================================== */

// ==================================
// LOCAL STORAGE RECORD COUNT
// ==================================

function countLocalRecords() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("projects_")) continue;

        try {
            const data = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(data)) {
                total += data.length;
            }
        } catch {
            console.warn("[STATUS] Invalid localStorage:", key);
        }
    }
    return total;
}

// ==================================
// LOCAL STORAGE SIZE
// ==================================

function getLocalStorageSize() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const value = localStorage.getItem(key) || "";
        total += key.length + value.length;
    }
    return (total / 1024).toFixed(2) + " KB";
}

// ==================================
// LOAD DATABASE STATUS
// ==================================

async function loadDatabaseStatus() {
    console.log("[STATUS] Loading...");

    const dbStatus = document.getElementById("dbStatus");
    const dbTotalRecords = document.getElementById("dbTotalRecords");
    const dbCurrentYear = document.getElementById("dbCurrentYear");
    const dbCurrentMonth = document.getElementById("dbCurrentMonth");
    const dbSize = document.getElementById("dbSize");
    const dbLastBackup = document.getElementById("dbLastBackup");

    if (dbCurrentYear) dbCurrentYear.textContent = currentYear;
    if (dbCurrentMonth) dbCurrentMonth.textContent = monthNames[new Date().getMonth()];

    // ==================================
    // LOCAL MODE
    // ==================================
    if (LOCAL_MODE) {
        if (dbStatus) {
            dbStatus.textContent = "🟡 Local Storage";
            dbStatus.className = "";
        }
        if (dbTotalRecords) dbTotalRecords.textContent = countLocalRecords();
        if (dbSize) dbSize.textContent = getLocalStorageSize();
        if (dbLastBackup) dbLastBackup.textContent = localStorage.getItem("lastBackup") || "Never";

        console.log("[STATUS] Loaded from Local Storage.");
        return;
    }

    // ==================================
    // CLOUD MODE
    // ==================================
    try {
        if (dbStatus) {
            dbStatus.textContent = "🟢 Connected";
            dbStatus.className = "status-online";
        }

        const response = await fetch(
            `/api/projects?year=${currentYear}&t=` + Date.now(),
            { cache: "no-store" }
        );

        if (!response.ok) throw new Error(response.status);

        const data = await response.json();
        const projectsArray = data.projects || (Array.isArray(data) ? data : []);

        if (dbTotalRecords) {
            dbTotalRecords.textContent = projectsArray.length;
        }

        if (dbSize) dbSize.textContent = "--";
        if (dbLastBackup) {
            dbLastBackup.textContent = localStorage.getItem("lastBackup") || "Never";
        }

        console.log("[STATUS] Cloudflare Connected.");

    } catch (error) {
        console.error(error);

        if (dbStatus) {
            dbStatus.textContent = "🔴 Offline";
            dbStatus.className = "status-offline";
        }

        if (dbTotalRecords) dbTotalRecords.textContent = "--";
        if (dbSize) dbSize.textContent = "--";
    }
}

// ==================================
// AUTO REFRESH
// ==================================

setInterval(() => {
    loadDatabaseStatus();
}, 30000);

/* ==========================================
   PART 3
   RESET MONTH
========================================== */

async function resetMonth() {
    const monthSelect = document.getElementById("resetMonth");
    const yearSelect = document.getElementById("resetMonthYear");

    if (!monthSelect || !yearSelect) return;

    const month = Number(monthSelect.value);
    const year = Number(yearSelect.value);

    if (!month || !year) {
        alert("Please select both month and year.");
        return;
    }

    const confirmReset = confirm(`Delete ALL projects for ${month}/${year}?`);
    if (!confirmReset) return;

    try {
        if (LOCAL_MODE) {
            const monthNamesShort = [
                "jan", "feb", "mar", "apr", "may", "jun",
                "jul", "aug", "sep", "oct", "nov", "dec"
            ];
            const monthKey = monthNamesShort[month - 1];
            const key = `projects_${year}_${monthKey}`;
            localStorage.removeItem(key);

            if (year === 2026 && monthKey === "sep") {
                localStorage.removeItem("projects_sep");
                localStorage.removeItem("projects");
            }

            alert("Month reset completed.");
            loadDatabaseStatus();
            return;
        }

        const response = await fetch("/api/reset-month", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ month, year })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to reset selected month.");
        }

        alert(result.message || "Month reset completed successfully.");
        loadDatabaseStatus();

    } catch (error) {
        console.error("Reset Month Error:", error);
        alert(error.message || "Unable to reset month.");
    }
}

document.getElementById("resetMonthBtn")?.addEventListener("click", resetMonth);

/* ==========================================
   PART 4
   RESET YEAR
========================================== */

async function resetYear() {
    const yearSelect = document.getElementById("resetYear");
    if (!yearSelect) return;

    const year = Number(yearSelect.value);

    if (!year) {
        alert("Please select a year.");
        return;
    }

    const confirmReset = confirm(`Delete ALL projects for year ${year}?`);
    if (!confirmReset) return;

    try {
        if (LOCAL_MODE) {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`projects_${year}_`)) {
                    localStorage.removeItem(key);
                }
            }

            const locks = JSON.parse(localStorage.getItem("monthLocks") || "{}");
            Object.keys(locks).forEach(key => {
                if (key.startsWith(`${year}_`)) {
                    delete locks[key];
                }
            });

            localStorage.setItem("monthLocks", JSON.stringify(locks));
            alert("Year reset completed successfully.");
            loadDatabaseStatus();
            return;
        }

        const response = await fetch("/api/reset-year", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to reset selected year.");
        }

        alert(result.message || "Year reset completed successfully.");
        loadDatabaseStatus();

    } catch (error) {
        console.error("Reset Year Error:", error);
        alert(error.message || "Unable to reset year.");
    }
}

document.getElementById("resetYearBtn")?.addEventListener("click", resetYear);

/* ==========================================
   PART 5
   BACKUP DATABASE
========================================== */

async function backupDatabase() {
    try {
        let blob;

        if (LOCAL_MODE) {
            const backupData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    backupData[key] = localStorage.getItem(key);
                }
            }
            blob = new Blob(
                [JSON.stringify(backupData, null, 2)],
                { type: "application/json" }
            );
        } else {
            const response = await fetch("/api/backup");
            if (!response.ok) throw new Error("Backup failed.");
            blob = await response.blob();
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const today = new Date();

        link.href = url;
        link.download = `backup-${today.getFullYear()}-${
            String(today.getMonth() + 1).padStart(2, "0")
        }-${String(today.getDate()).padStart(2, "0")}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        localStorage.setItem("lastBackup", today.toLocaleString());
        const dbLastBackupEl = document.getElementById("dbLastBackup");
        if (dbLastBackupEl) dbLastBackupEl.textContent = today.toLocaleString();

        alert("Backup downloaded successfully.");
        loadDatabaseStatus();

    } catch (error) {
        console.error("Backup Error:", error);
        alert(error.message || "Unable to create backup.");
    }
}

document.getElementById("backupBtn")?.addEventListener("click", backupDatabase);

/* ==========================================
   PART 6
   RESTORE DATABASE (Robust Handling for Raw Arrays and Backups)
========================================== */

async function restoreDatabase() {
    const fileInput = document.getElementById("restoreFile");

    if (!fileInput || !fileInput.files.length) {
        alert("Please select a backup file.");
        return;
    }

    const confirmRestore = confirm(
        "Restore database from this backup?\n\nThis will overwrite existing data."
    );

    if (!confirmRestore) return;

    try {
        const file = fileInput.files[0];
        const text = await file.text();
        const backupData = JSON.parse(text);

        const isNewDynamicBackup = backupData && backupData.data && typeof backupData.data === "object";
        const isCloudBackup = backupData && Array.isArray(backupData.projects);
        const isLocalBackup = backupData && typeof backupData === "object" && !Array.isArray(backupData) && !backupData.data;
        const isRawArray = Array.isArray(backupData);

        if (!isNewDynamicBackup && !isCloudBackup && !isLocalBackup && !isRawArray) {
            throw new Error("Invalid backup file format.");
        }

        const now = new Date();
        const year = currentYear || now.getFullYear();
        const monthNamesShort = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const monthStr = monthNamesShort[now.getMonth()];
        const mNum = monthMap[monthStr];

        if (LOCAL_MODE || !LOCAL_MODE) {
            // Laging i-save muna sa localStorage para sigurado at walang data loss
            if (isNewDynamicBackup) {
                const tables = backupData.data;
                Object.keys(tables).forEach(tableName => {
                    localStorage.setItem(`table_${tableName}`, JSON.stringify(tables[tableName]));
                });
            } else if (isCloudBackup) {
                const key = `projects_${year}_${monthStr}`;
                localStorage.setItem(key, JSON.stringify(backupData.projects));
            } else if (isRawArray) {
                const key = `projects_${year}_${monthStr}`;
                localStorage.setItem(key, JSON.stringify(backupData));
            } else {
                Object.keys(backupData).forEach(key => {
                    localStorage.setItem(key, backupData[key]);
                });
            }
        }

        if (!LOCAL_MODE) {
            // Kung Cloud Mode, subukan ding i-sync sa cloud nang hindi naghahagis ng error sakaling may restriction ang endpoint
            try {
                let payload = backupData;
                if (isRawArray) {
                    payload = backupData; // Raw array format para sa projects endpoint
                } else if (isCloudBackup && !isNewDynamicBackup) {
                    payload = {
                        data: {
                            projects: backupData.projects
                        }
                    };
                }

                const endpoint = isRawArray ? `/api/projects?year=${year}&month=${mNum}` : "/api/restore";
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    console.warn("Cloud sync warning: Backend responded with non-ok status, but data was successfully saved locally.");
                }
            } catch (cloudErr) {
                console.warn("Cloud sync network notice: Saved locally as fallback.", cloudErr);
            }
        }

        alert("Database restored successfully!");
        fileInput.value = "";
        loadDatabaseStatus();

    } catch (error) {
        console.error("Restore Error:", error);
        alert(error.message || "Unable to restore database.");
    }
}

document.getElementById("restoreBtn")?.addEventListener("click", restoreDatabase);

/* ==========================================
   PART 7
   DELETE EVERYTHING
========================================== */

async function deleteEverything() {
    const confirmInput = document.getElementById("confirmDelete");
    const confirmation = confirmInput ? confirmInput.value.trim() : "";

    if (confirmation !== "RESET") {
        alert('Please type "RESET" to continue.');
        return;
    }

    const confirmDelete = confirm(
        "WARNING!\n\nThis will permanently delete ALL projects from the database.\n\nThis action cannot be undone."
    );

    if (!confirmDelete) return;

    try {
        if (LOCAL_MODE) {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (
                    key &&
                    (
                        key.startsWith("projects_") ||
                        key === "projects" ||
                        key === "kbhfilms_projects_data" ||
                        key === "lastBackup"
                    )
                ) {
                    localStorage.removeItem(key);
                }
            }

            if (confirmInput) confirmInput.value = "";
            alert("Database cleared successfully.");
            loadDatabaseStatus();
            return;
        }

        const response = await fetch("/api/delete-all", {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to delete database.");
        }

        alert(result.message || "Database cleared successfully.");
        if (confirmInput) confirmInput.value = "";
        loadDatabaseStatus();

    } catch (error) {
        console.error("Delete Database Error:", error);
        alert(error.message || "Unable to delete database.");
    }
}

document.getElementById("deleteAllBtn")?.addEventListener("click", deleteEverything);