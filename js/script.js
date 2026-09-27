// =================================-
// STORAGE MODE
// true = localStorage
// false = Cloudflare API
// =========================
const LOCAL_MODE =
    location.hostname === "127.0.0.1" ||
    location.hostname === "localhost";

console.log("================================");
console.log("Host:", location.hostname);
console.log("LOCAL_MODE:", LOCAL_MODE);
console.log("================================");

// =========================
// MONTH MAP & NAMES
// =========================
const monthMap = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12
};

const monthNames = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec"
];

// =========================================
// URL & LOCALSTORAGE STATE RESTORATION (ADMIN ROLE SYNC)
// =========================================
const urlParams = new URLSearchParams(window.location.search);
const paramYear = urlParams.get("year");
const paramMonth = urlParams.get("month");

let currentYear = paramYear || localStorage.getItem("kb_selected_year") || new Date().getFullYear().toString();
let currentMonth = paramMonth || localStorage.getItem("kb_selected_month") || monthNames[new Date().getMonth()];

let currentMonthLocked = false;
let cachedHasDataMonths = {};
let monthLocks = {};

// ===========================
// LIVE CALENDAR
// ===========================
function updateLiveCalendar() {
    const now = new Date();

    const month = now.toLocaleString("en-US", {
        month: "short"
    }).toUpperCase();

    const day = now.getDate();

    const monthEl = document.getElementById("calendarMonth");
    const dayEl = document.getElementById("calendarDay");

    if (monthEl) {
        monthEl.textContent = month;
    }

    if (dayEl) {
        dayEl.textContent = day;
    }
}

// ==================================
// ACTIVITY CENTER & AUDIT LOG HELPER
// ==================================
async function getClientDeviceInfo() {
    let device = "Desktop";
    let os = "Unknown OS";
    let browser = "Unknown Browser";

    const ua = navigator.userAgent || navigator.vendor || window.opera;

    if (navigator.userAgentData) {
        try {
            const hints = await navigator.userAgentData.getHighEntropyValues([
                "platform", 
                "platformVersion", 
                "model", 
                "mobile"
            ]);
            
            if (hints.mobile || hints.platform === "Android" || hints.platform === "iOS") {
                if (hints.model && hints.model !== "") {
                    device = hints.model;
                } else {
                    device = hints.platform === "iOS" ? "iPhone" : "Android Phone";
                }
                os = hints.platform;
            }
        } catch (e) {}
    }

    if (device === "Desktop" || device === "Unknown OS") {
        if (/iphone|ipod/i.test(ua)) {
            device = "iPhone";
            os = "iOS";
        } else if (/ipad/i.test(ua)) {
            device = "iPad";
            os = "iOS";
        } else if (/android/i.test(ua) || (/linux/i.test(ua) && /armv|mobile|mobi/i.test(ua))) {
            device = "Android Phone";
            os = "Android";
        } else if (/mobile|mobi|blackberry|opera mini|iemobile/i.test(ua)) {
            device = "Mobile Phone";
            os = "Mobile OS";
        } else {
            if (/macintosh|mac os x/i.test(ua)) {
                device = "Mac";
                os = "macOS";
            } else if (/windows/i.test(ua)) {
                device = "Windows PC";
                os = "Windows";
            } else if (/linux/i.test(ua)) {
                device = "Linux PC";
                os = "Linux";
            }
        }
    }

    if (/chrome|crios/i.test(ua) && !/edge|opr/i.test(ua)) browser = "Chrome";
    else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = "Safari";
    else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
    else if (/edge/i.test(ua)) browser = "Edge";
    else if (/opr|opera/i.test(ua)) browser = "Opera";

    return { device, os, browser };
}

async function recordActivity(action, details = "") {
    try {
        const currentUser = JSON.parse(localStorage.getItem("currentUser")) || {};
        const userName = currentUser.name || currentUser.username || currentUser.full_name || "Kim Bryan Hernandez";
        
        const clientInfo = await getClientDeviceInfo();

        await fetch("/api/logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_name: userName,
                action: action,
                details: details,
                browser: clientInfo.browser,
                os: clientInfo.os,
                device: clientInfo.device
            })
        });
    } catch (err) {
        console.error("Error recording activity:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {

    // --- REAL-TIME LOGIN / PAGE OPEN LOG ---
    const currentUserForLog = JSON.parse(localStorage.getItem("currentUser")) || {};
    const roleText = currentUserForLog.role ? ` (${currentUserForLog.role.toUpperCase()})` : "";
    recordActivity("Opened Dashboard", `User active on page${roleText}`);
    // ----------------------------------------

    updateLiveCalendar();
    setInterval(updateLiveCalendar, 60000);

    const settingsBtn = document.getElementById("settingsMenu");

    if (settingsBtn) {
        settingsBtn.style.display = (typeof IS_ADMIN !== "undefined" && IS_ADMIN) ? "" : "none";
    }

    const dashboardMenu = document.getElementById("dashboardMenu");

    if (dashboardMenu && typeof IS_ADMIN !== "undefined" && !IS_ADMIN) {
        dashboardMenu.removeAttribute("href");
        dashboardMenu.style.pointerEvents = "none";
        dashboardMenu.style.cursor = "default";
    }

    console.log('[INIT] Page loaded, starting data load...');

    // ==========================================
    // ADMIN SIDEBAR NAVIGATION LINK INTERCEPTION
    // ==========================================
    if (typeof IS_ADMIN !== "undefined" && IS_ADMIN) {
        const adminSidebarLinks = document.querySelectorAll('.sidebar nav a');
        adminSidebarLinks.forEach(link => {
            const rawHref = link.getAttribute('href');
            if (rawHref && !rawHref.startsWith('http') && !rawHref.startsWith('#')) {
                const basePage = rawHref.split('?')[0];
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.setItem('kb_selected_year', currentYear);
                    localStorage.setItem('kb_selected_month', currentMonth);
                    window.location.href = `${basePage}?year=${currentYear}&month=${currentMonth}`;
                });
            }
        });
    }

    localStorage.setItem("kb_selected_year", currentYear);
    localStorage.setItem("kb_selected_month", currentMonth);

    document.querySelectorAll(".month-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    document.querySelector(`.month-btn[data-month="${currentMonth}"]`)
        ?.classList.add("active");

    // ==========================
    // YEAR DROPDOWN
    // ==========================
    const yearSelect = document.getElementById("yearSelect");

    if (yearSelect) {
        const current = new Date().getFullYear();

        yearSelect.innerHTML = "";

        for (let y = 2023; y <= current + 5; y++) {
            const option = document.createElement("option");
            option.value = y;
            option.textContent = y;

            if (String(y) === currentYear) {
                option.selected = true;
            }

            yearSelect.appendChild(option);
        }

        yearSelect.value = currentYear;
        const yearTitleEl = document.getElementById("currentYearTitle");
        if (yearTitleEl) yearTitleEl.textContent = currentYear;

        yearSelect.addEventListener("change", async () => {
            currentYear = yearSelect.value;
            const yearTitleEl = document.getElementById("currentYearTitle");
            if (yearTitleEl) yearTitleEl.textContent = currentYear;

            localStorage.setItem("kb_selected_year", currentYear);

            currentMonth = "jan"; 
            localStorage.setItem("kb_selected_month", currentMonth);
            
            document.querySelectorAll(".month-btn").forEach(btn => {
                btn.classList.toggle("active", btn.dataset.month === currentMonth);
            });

            cachedHasDataMonths = {};
            await updateMonthHasDataUI({});

            clearProjectTable();
            await loadProjects();
            recordActivity("Changed Year", `Selected Year: ${currentYear}`);
        });
    }

    loadProjects();
    updateTimelineProgress();

    const nextYearBtn = document.querySelector(".next-year-btn");

    if (nextYearBtn) {
        nextYearBtn.addEventListener("click", () => {
            const nextYear = String(Number(currentYear) + 1);

            const exists = [...yearSelect.options].some(
                option => option.value === nextYear
            );

            if (!exists && yearSelect) {
                const option = document.createElement("option");
                option.value = nextYear;
                option.textContent = nextYear;
                yearSelect.appendChild(option);
            }

            currentYear = nextYear;
            if (yearSelect) yearSelect.value = currentYear;
            localStorage.setItem("kb_selected_year", currentYear);
            
            const yearTitleEl = document.getElementById("currentYearTitle");
            if (yearTitleEl) yearTitleEl.textContent = currentYear;

            loadProjects();
            recordActivity("Added/Selected Next Year", `Year: ${currentYear}`);
        });
    }

    const tableBody = document.querySelector('.project-table tbody');

    if (tableBody) {
        tableBody.addEventListener('input', () => {
            saveProjects();
            updateCurrentMonthHasData(); 
        });

        tableBody.addEventListener('change', (e) => {
            saveProjects();
            updateCurrentMonthHasData(); 

            if (e.target.classList.contains('status-select')) {
                updateStatusColor(e.target);
                updateTimelineProgress();
                recordActivity("Changed Status", `Status -> ${e.target.value}`);
            }

            if (e.target.classList.contains('type-select')) {
                updateTypeColor(e.target);
                recordActivity("Changed Type", `Type -> ${e.target.value}`);
            }

            if (e.target.classList.contains('dashboard-song-status')) {
                updateSongStatusColor(e.target);
                recordActivity("Changed Song Status", `Song Status -> ${e.target.value}`);
            }

            if (e.target.classList.contains('drone-select')) {
                e.target.classList.toggle(
                    "selected",
                    e.target.value !== "NO DRONE"
                );
                recordActivity("Changed Drone", `Drone -> ${e.target.value}`);
            }

            document.querySelectorAll('.dashboard-song-status')
                .forEach(updateSongStatusColor);
        });
    }

    const savedPlayer = JSON.parse(
        localStorage.getItem("watchPlayerState")
    );

    const watchModal = document.getElementById("watchModal");
    const watchFrame = document.getElementById("watchFrame");
    const watchPlayer = document.getElementById("watchBox");
    const minimizeWatch = document.getElementById("minimizeWatchBtn");
    const maximizeWatch = document.getElementById("maximizeWatchBtn");

    if (savedPlayer?.open && watchModal && watchFrame && watchPlayer) {
        watchFrame.src = savedPlayer.link;
        watchModal.classList.add("show");

        if (savedPlayer.minimized) {
            watchPlayer.classList.add("mini-player");
            watchPlayer.style.left = "auto";
            watchPlayer.style.top = "auto";
            watchPlayer.style.right = "30px";
            watchPlayer.style.bottom = "30px";
            watchPlayer.style.transform = "none";

            watchModal.style.background = "transparent";
            watchModal.style.pointerEvents = "none";
            watchPlayer.style.pointerEvents = "auto";

            if (minimizeWatch) minimizeWatch.style.display = "none";
            if (maximizeWatch) maximizeWatch.style.display = "inline-flex";
        }
    }

    document.querySelectorAll(".type-select").forEach(select => {
        updateTypeColor(select);
    });
});

/* ==================================
   CORE LOGIC: SAVE & LOAD (REST API)
================================== */

function collectRowData(row) {
    try {
        const cells = row.querySelectorAll('td');
        if (!cells || cells.length === 0) return null;

        const rowId = row.getAttribute('data-row-id');
        if (!rowId) {
            console.warn("Row missing data-row-id:", row);
            return null;
        }

        const getSongData = (cellIndex) => {
            const cell = cells[cellIndex];

            if (!cell) {
                return {
                    title: "",
                    link: "",
                    status: "",
                    notes: ""
                };
            }

            const titleInput = cell.querySelector(".song-link");

            return {
                title: titleInput?.value || "",
                link: titleInput?.dataset.songLink || "",
                status: cell.querySelector(".dashboard-song-status")?.value || "",
                notes: cell.querySelector(".comments-btn")?.dataset.notes || ""
            };
        };

        return {
            rowId: parseInt(rowId, 10),
            coupleName: cells[0]?.querySelector(".couple-name")?.textContent.trim() || "",
            status: cells[1]?.querySelector(".status-select")?.value || "PLANNED",
            type: cells[2]?.querySelector(".type-select")?.value || "",
            rawFiles: cells[3]?.querySelector(".dashboard-raw-input")?.value || "",
            drone: cells[4]?.querySelector(".drone-select")?.value || "NO DRONE",
            instruction: cells[0]?.querySelector(".instruction-btn")?.dataset.notes || "",
            concerns: cells[1]?.querySelector(".concerns-btn")?.dataset.notes || "",
            song1: getSongData(5),
            song2: getSongData(6),
            song3: getSongData(7),
            teaserSong: getSongData(8),
            watchLink: cells[0]?.querySelector(".watch-btn")?.dataset.watchLink || "",
            filesLink: cells[1]?.querySelector(".get-files-btn")?.dataset.filesLink || "",
            progress: parseInt(row.querySelector(".progress-slider")?.value || 0, 10)
        };
    } catch (err) {
        console.error("Error collecting row data for row:", row, err);
        return null;
    }
}

function populateRow(row, data) {
    const cells = row.querySelectorAll('td');

    if (cells[0]) {
        const coupleName = cells[0].querySelector(".couple-name");
        if (coupleName) {
            coupleName.textContent = data.coupleName || "";
        }

        const instructionBtn = cells[0].querySelector(".instruction-btn");
        if (instructionBtn) {
            instructionBtn.dataset.notes = data.instruction || "";
            // Kung mayaman sa HTML/text o may data, berde; kundi orange
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = data.instruction || "";
            instructionBtn.style.background = tempDiv.textContent.trim() ? "#22c55e" : "#ff7a1a";
        }
    }

    if (cells[1]) {
        const statusSelect = cells[1].querySelector(".status-select");
        if (statusSelect) {
            statusSelect.value = (data.status || "").trim();
            updateStatusColor(statusSelect);
        }

        const concernsBtn = cells[1].querySelector(".concerns-btn");
        if (concernsBtn) {
            concernsBtn.dataset.notes = data.concerns || "";
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = data.concerns || "";
            concernsBtn.classList.toggle("has-comments", tempDiv.textContent.trim() !== "");
        }

        const slider = cells[1].querySelector(".progress-slider");
        if (slider) {
            slider.value = data.progress || 0;
            updateRowProgress(slider.closest("tr"));
        }
    }

    if (cells[2]) {
        const typeSelect = cells[2].querySelector(".type-select");
        if (typeSelect) {
            typeSelect.value = data.type || "NOT SET";
            updateTypeColor(typeSelect);
        }
    }

    if (cells[3] && cells[3].querySelector('.dashboard-raw-input')) {
        cells[3].querySelector('.dashboard-raw-input').value = data.rawFiles || "";
    }

    if (cells[4]) {
        const droneSelect = cells[4].querySelector(".drone-select");
        if (droneSelect) {
            droneSelect.value = data.drone || "NO DRONE";
            droneSelect.classList.toggle("selected", droneSelect.value !== "NO DRONE");
        }
    }

    const setSongData = (cellIndex, songData = {}) => {
        const cell = cells[cellIndex];
        if (!cell) return;

        const titleInput = cell.querySelector(".song-link");
        const status = cell.querySelector(".dashboard-song-status");
        const commentsBtn = cell.querySelector(".comments-btn");

        if (titleInput) {
            titleInput.value = songData.title || "";
            titleInput.dataset.songLink = songData.link || "";
            updateSongLinkStyle(titleInput);
        }

        if (status) {
            status.value = songData.status || "";
            updateSongStatusColor(status);
        }

        if (commentsBtn) {
            commentsBtn.dataset.notes = songData.notes || "";
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = songData.notes || "";
            commentsBtn.classList.toggle("has-comments", tempDiv.textContent.trim() !== "");
        }
    };

    setSongData(5, data.song1);
    setSongData(6, data.song2);
    setSongData(7, data.song3);
    setSongData(8, data.teaserSong);

    const watchBtn = cells[0]?.querySelector(".watch-btn");
    if (watchBtn) {
        watchBtn.dataset.watchLink = data.watchLink || "";
        watchBtn.querySelector(".play-icon")?.classList.toggle("has-link", (data.watchLink || "").trim() !== "");
    }

    const getFilesBtn = cells[1]?.querySelector(".get-files-btn");
    if (getFilesBtn) {
        getFilesBtn.dataset.filesLink = data.filesLink || "";
        getFilesBtn.classList.toggle("has-link", !!data.filesLink);
    }

    updateRowProgress(row);
    updateStatusColor(cells[1]?.querySelector('.status-select'));
    updateTypeColor(cells[2]?.querySelector('.type-select'));
    document.querySelectorAll('.dashboard-song-status').forEach(updateSongStatusColor);
}

/* ==================================
   CLEAR TABLE (MONTH SWITCH)
================================== */
function clearProjectTable() {
    document.querySelectorAll(".project-table tbody tr").forEach(row => {
        const cells = row.querySelectorAll("td");

        const coupleName = cells[0]?.querySelector(".couple-name");
        if (coupleName) coupleName.textContent = "";

        const instructionBtn = cells[0]?.querySelector(".instruction-btn");
        if (instructionBtn) {
            instructionBtn.dataset.notes = "";
            instructionBtn.style.background = "#ff7a1a";
        }

        const watchBtn = cells[0]?.querySelector(".watch-btn");
        if (watchBtn) {
            watchBtn.dataset.watchLink = "";
            watchBtn.querySelector(".play-icon")?.classList.remove("has-link");
        }

        const getFilesBtn = cells[1]?.querySelector(".get-files-btn");
        if (getFilesBtn) {
            getFilesBtn.dataset.filesLink = "";
            getFilesBtn.classList.remove("has-link");
        }

        const status = cells[1]?.querySelector(".status-select");
        if (status) {
            status.value = "PLANNED";
            updateStatusColor(status);
        }

        const type = cells[2]?.querySelector(".type-select");
        if (type) {
            type.value = "NOT SET";
            updateTypeColor(type);
        }

        const raw = cells[3]?.querySelector(".dashboard-raw-input");
        if (raw) raw.value = "";

        if (cells[4]) {
            const droneSelect = cells[4].querySelector(".drone-select");
            if (droneSelect) droneSelect.value = "NO DRONE";
        }

        [5, 6, 7, 8].forEach(index => {
            const cell = cells[index];
            if (!cell) return;

            const titleInput = cell.querySelector(".song-link");
            if (titleInput) {
                titleInput.value = "";
                titleInput.dataset.songLink = "";
                updateSongLinkStyle(titleInput);
            }

            const attachBtn = cell.querySelector(".attach-song-btn");
            if (attachBtn) {
                attachBtn.dataset.songLink = "";
                attachBtn.classList.remove("has-link");
            }

            const songStatus = cell.querySelector(".dashboard-song-status");
            if (songStatus) {
                songStatus.value = "";
                updateSongStatusColor(songStatus);
            }

            const commentsBtn = cell.querySelector(".comments-btn");
            if (commentsBtn) {
                commentsBtn.dataset.notes = "";
                commentsBtn.classList.remove("has-comments");
            }
        });
    });
}

function loadProjectsLocal() {
    clearProjectTable();

    let savedData = localStorage.getItem(`projects_${currentYear}_${currentMonth}`);

    if (!savedData && currentYear === "2026") {
        savedData = localStorage.getItem(`projects_${currentMonth}`);
        if (!savedData && currentMonth === "sep") {
            savedData = localStorage.getItem("projects");
        }
    }

    let projectsData = savedData ? JSON.parse(savedData) : [];
    const rows = document.querySelectorAll(".project-table tbody tr");

    document.querySelectorAll(".month-btn").forEach(btn => btn.classList.remove("locked"));

    rows.forEach((row) => {
        const rowId = parseInt(row.dataset.rowId);
        const data = projectsData.find(item => Number(item.rowId) === Number(rowId));

        if (data) {
            populateRow(row, data);
        }
    });

    document.querySelectorAll(".status-select").forEach(updateStatusColor);
    document.querySelectorAll(".type-select").forEach(updateTypeColor);
    document.querySelectorAll(".dashboard-song-status").forEach(updateSongStatusColor);
    document.querySelectorAll(".drone-select").forEach(updateDroneColor);

    updateMonthLockUI();
    updateMonthHasDataUI();
}

// ==================================
// ONLINE LOAD FUNCTION
// ==================================
async function loadProjects() {
    console.log("========== LOAD START ==========");
    console.log("currentYear :", currentYear);
    console.log("currentMonth:", currentMonth);

    if (LOCAL_MODE) {
        const restored = restoreProjectsLocal(currentYear, currentMonth);
        if (!restored) {
            clearProjectTable();
        }
        await updateMonthHasDataUI();
        updateMonthLockUI();
        return;
    }

    try {
        const response = await fetch(
            `/api/projects?year=${currentYear}&month=${monthMap[currentMonth]}&t=${Date.now()}`,
            {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache" }
            }
        );

        if (!response.ok) {
            console.error("[LOAD] API returned error:", response.status);
            return;
        }

        const responseData = await response.json();
        const projectsData = responseData.projects || [];

        monthLocks = responseData.lockedMonths || {};
        cachedHasDataMonths = responseData.hasDataMonths || {};

        await updateMonthHasDataUI(cachedHasDataMonths);

        if (!projectsData.length) {
            clearProjectTable();
        }

        const rows = document.querySelectorAll(".project-table tbody tr");

        if (Array.isArray(projectsData) && projectsData.length > 0) {
            let matchedCount = 0;

            rows.forEach((row) => {
                const rowId = parseInt(row.getAttribute("data-row-id"), 10);
                const data = projectsData.find(p => p.rowId === rowId);

                if (data) {
                    populateRow(row, data);
                    matchedCount++;
                }
            });

            updateMonthLockUI();
            await updateMonthHasDataUI(cachedHasDataMonths);
            console.log(`[LOAD] Successfully matched ${matchedCount} rows`);
        }

        document.querySelectorAll(".month-btn").forEach(btn => {
            const key = getMonthKey(currentYear, btn.dataset.month);
            const locked = !!monthLocks[key];
            if (typeof IS_ADMIN !== "undefined" && IS_ADMIN) {
                btn.classList.toggle("locked", locked);
            } else {
                btn.classList.remove("locked");
            }
        });

        updateMonthLockUI();

    } catch (e) {
        console.error("[LOAD] Error loading projects:", e);
    }

    document.querySelectorAll(".status-select").forEach(updateStatusColor);
    document.querySelectorAll(".type-select").forEach(updateTypeColor);
    document.querySelectorAll(".dashboard-song-status").forEach(updateSongStatusColor);
    document.querySelectorAll(".drone-select").forEach(updateDroneColor);
    updateMonthHasDataUI();
}

// ==================================
// ONLINE & LOCAL SAVE FUNCTIONS (Optimized Debounce)
// ==================================
let localSaveTimeout;
let apiSaveTimeout;

function saveProjects() {
    saveProjectsLocal();

    if (LOCAL_MODE) {
        return;
    }

    const saveYear = currentYear;
    const saveMonth = currentMonth;

    clearTimeout(apiSaveTimeout);

    apiSaveTimeout = setTimeout(async () => {
        const rows = document.querySelectorAll(".project-table tbody tr");
        const projectsData = [];

        rows.forEach(row => {
            const rowData = collectRowData(row);
            if (rowData) {
                rowData.monthLocked = !!monthLocks[getMonthKey(saveYear, saveMonth)];
                projectsData.push(rowData);
            }
        });

        try {
            const response = await fetch(
                `/api/projects?year=${saveYear}&month=${monthMap[saveMonth]}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(projectsData)
                }
            );

            if (response.ok) {
                const resData = await response.json();
                if (resData.hasDataMonths) {
                    cachedHasDataMonths = resData.hasDataMonths;
                    await updateMonthHasDataUI(cachedHasDataMonths);
                }

                localStorage.setItem(
                    `projects_${saveYear}_${saveMonth}`,
                    JSON.stringify(projectsData)
                );
                recordActivity("Saved Projects", `Year: ${saveYear}, Month: ${saveMonth.toUpperCase()}`);
            } else {
                console.error("[SAVE] API error:", response.status);
            }
        } catch (e) {
            console.error("[SAVE] Error saving projects to Cloudflare backend:", e);
        }
    }, 1000);
}

function saveProjectsLocal() {
    clearTimeout(localSaveTimeout);

    localSaveTimeout = setTimeout(() => {
        const rows = document.querySelectorAll(".project-table tbody tr");
        const projectsData = [];

        rows.forEach(row => {
            const rowData = collectRowData(row);
            if (rowData) {
                rowData.monthLocked = !!monthLocks[getMonthKey(currentYear, currentMonth)];
                projectsData.push(rowData);
            }
        });

        localStorage.setItem(
            `projects_${currentYear}_${currentMonth}`,
            JSON.stringify(projectsData)
        );

        updateCurrentMonthHasData();

    }, 400);
}

// ==================================
// MONTH HELPERS
// ==================================
function getMonthLocks() {
    return monthLocks;
}

function saveMonthLocks(locks) {
    monthLocks = locks;
}

function getMonthKey(year = currentYear, month = currentMonth) {
    return `${year}_${month}`;
}

function monthHasData() {
    const rows = document.querySelectorAll(".project-table tbody tr");

    return [...rows].some(row => {
        const data = collectRowData(row);
        if (!data) return false;

        return (
            (data.coupleName && data.coupleName.trim() !== "") ||
            (data.status && data.status !== "PLANNED") ||
            (data.type && data.type !== "NOT SET" && data.type !== "") ||
            (data.rawFiles && data.rawFiles.trim() !== "") ||
            (data.drone && data.drone !== "NO DRONE") ||
            (data.instruction && data.instruction.trim() !== "") ||
            (data.concerns && data.concerns.trim() !== "") ||
            (data.watchLink && data.watchLink.trim() !== "") ||
            (data.filesLink && data.filesLink.trim() !== "") ||
            (data.song1 && (data.song1.title.trim() || data.song1.link.trim() || data.song1.status || data.song1.notes.trim())) ||
            (data.song2 && (data.song2.title.trim() || data.song2.link.trim() || data.song2.status || data.song2.notes.trim())) ||
            (data.song3 && (data.song3.title.trim() || data.song3.link.trim() || data.song3.status || data.song3.notes.trim())) ||
            (data.teaserSong && (data.teaserSong.title.trim() || data.teaserSong.link.trim() || data.teaserSong.status || data.teaserSong.notes.trim())) ||
            (data.progress && data.progress > 0)
        );
    });
}

function updateCurrentMonthHasData() {
    const activeBtn = document.querySelector(`.month-btn[data-month="${currentMonth}"]`);
    if (!activeBtn) return;

    const hasData = monthHasData();
    activeBtn.classList.toggle("has-data", hasData);

    if (!LOCAL_MODE) {
        cachedHasDataMonths[currentMonth] = hasData;
    }
}

// 🛠️ INAYOS NA UPDATE MONTH HAS DATA UI (HINDI NA NAKADEPENDE SA STALE LOCALSTORAGE SA CLOUD MODE)
async function updateMonthHasDataUI(hasDataMonths = null) {
    const months = hasDataMonths ?? cachedHasDataMonths ?? {};

    document.querySelectorAll(".month-btn").forEach(btn => {
        const monthName = btn.dataset.month;
        let hasData = false;

        if (LOCAL_MODE) {
            // Local mode: Check localStorage
            const key = `projects_${currentYear}_${monthName}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                try {
                    const projects = JSON.parse(saved);
                    hasData = projects.some(data => 
                        (data.coupleName && data.coupleName.trim() !== "") ||
                        (data.status && data.status !== "PLANNED") ||
                        (data.type && data.type !== "NOT SET" && data.type !== "") ||
                        (data.rawFiles && data.rawFiles.trim() !== "") ||
                        (data.drone && data.drone !== "NO DRONE") ||
                        (data.instruction && data.instruction.trim() !== "") ||
                        (data.concerns && data.concerns.trim() !== "") ||
                        (data.watchLink && data.watchLink.trim() !== "") ||
                        (data.filesLink && data.filesLink.trim() !== "") ||
                        (data.song1 && (data.song1.title.trim() || data.song1.link.trim() || data.song1.status || data.song1.notes.trim())) ||
                        (data.song2 && (data.song2.title.trim() || data.song2.link.trim() || data.song2.status || data.song2.notes.trim())) ||
                        (data.song3 && (data.song3.title.trim() || data.song3.link.trim() || data.song3.status || data.song3.notes.trim())) ||
                        (data.teaserSong && (data.teaserSong.title.trim() || data.teaserSong.link.trim() || data.teaserSong.status || data.teaserSong.notes.trim())) ||
                        (data.progress && data.progress > 0)
                    );
                } catch (err) {
                    console.error(err);
                }
            }
        } else {
            // Cloud Mode: Strictly galing sa server database response (hasDataMonths)
            hasData = !!months[monthName];
        }

        if (monthName === currentMonth && monthHasData()) {
            hasData = true;
        }

        btn.classList.toggle("has-data", hasData);
    });
}

function isMonthLocked() {
    return !!monthLocks[getMonthKey()];
}

function setMonthEditable(editable) {
    document.querySelectorAll(`
        .status-select,
        .type-select,
        .dashboard-raw-input,
        .song-link,
        .dashboard-song-status,
        .song-notes,
        .drone-search,
        .drone-select
    `).forEach(input => {
        input.disabled = !editable;
        input.style.pointerEvents = editable ? "auto" : "none";
        input.style.opacity = "1";
        input.style.filter = "none";
    });

    document.querySelectorAll(".progress-slider").forEach(slider => {
        slider.disabled = !editable;
        slider.style.opacity = "1";
    });

    document.querySelectorAll(".couple-name").forEach(el => {
        el.contentEditable = editable;
    });

    document.querySelectorAll("td[contenteditable]").forEach(el => {
        el.contentEditable = editable;
    });

    document.querySelectorAll(`
        .instruction-btn,
        .watch-btn,
        .comments-btn,
        .dashboard-raw-check-btn,
        .raw-check-btn,
        .generate-btn,
        .get-files-btn
    `).forEach(btn => {
        if (btn.classList.contains("watch-btn")) {
            btn.disabled = false;
            btn.style.pointerEvents = "auto";
            btn.style.opacity = "1";
            return;
        }

        btn.disabled = !editable;
        btn.style.pointerEvents = editable ? "auto" : "none";
        btn.style.opacity = "1";
        btn.style.filter = "none";
    });
}

function updateMonthLockUI() {
    document.querySelectorAll(".month-btn").forEach(btn => {
        const key = getMonthKey(currentYear, btn.dataset.month);
        const locked = !!monthLocks[key];

        if (typeof IS_ADMIN !== "undefined" && IS_ADMIN) {
            btn.classList.toggle("locked", locked);
        } else {
            btn.classList.remove("locked");
        }
    });

    if (typeof IS_ADMIN === "undefined") {
        return;
    }

    if (IS_ADMIN) {
        setMonthEditable(true);
        return;
    }

    setMonthEditable(!isMonthLocked());
}

/* ==========================================
   SETTINGS & DATABASE MANAGEMENT HELPERS
================================== */
window.refreshMonthIndicators = async function(year = currentYear) {
    if (!LOCAL_MODE) {
        try {
            const res = await fetch(`/api/projects?year=${year}&t=${Date.now()}`, { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                cachedHasDataMonths = data.hasDataMonths || {};
            }
        } catch (e) {
            console.error("Error refreshing month indicators:", e);
        }
    }
    await updateMonthHasDataUI(cachedHasDataMonths);
};

window.handleResetMonthAction = async function(year, monthName) {
    const key = `projects_${year}_${monthName}`;
    localStorage.removeItem(key);
    
    if (cachedHasDataMonths) {
        cachedHasDataMonths[monthName] = false;
    }

    if (!LOCAL_MODE) {
        try {
            const res = await fetch(`/api/reset-month`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ year: Number(year), month: monthMap[monthName] })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.hasDataMonths) {
                    cachedHasDataMonths = data.hasDataMonths;
                }
            }
        } catch (e) {
            console.error("API Reset Month error:", e);
        }
    }

    if (String(year) === String(currentYear)) {
        if (monthName === currentMonth) {
            clearProjectTable();
        }
        await window.refreshMonthIndicators(year);
    }
    updateCurrentMonthHasData();
};

window.handleResetYearAction = async function(year) {
    monthNames.forEach(m => {
        localStorage.removeItem(`projects_${year}_${m}`);
    });
    cachedHasDataMonths = {};

    if (!LOCAL_MODE) {
        try {
            const res = await fetch(`/api/reset-year`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ year: Number(year) })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.hasDataMonths) {
                    cachedHasDataMonths = data.hasDataMonths;
                }
            }
        } catch (e) {
            console.error("API Reset Year error:", e);
        }
    }

    if (String(year) === String(currentYear)) {
        clearProjectTable();
        await window.refreshMonthIndicators(year);
    }
    updateCurrentMonthHasData();
};

window.handleDeleteEverythingAction = async function() {
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith("projects_") || k === "projects") {
            localStorage.removeItem(k);
        }
    });
    cachedHasDataMonths = {};
    monthLocks = {};

    if (!LOCAL_MODE) {
        try {
            const res = await fetch(`/api/delete-all`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.hasDataMonths) {
                    cachedHasDataMonths = data.hasDataMonths;
                }
            }
        } catch (e) {
            console.error("API Delete Everything error:", e);
        }
    }

    clearProjectTable();
    await window.refreshMonthIndicators(currentYear);
    updateCurrentMonthHasData();
};

window.handleBackupDatabase = function() {
    const backupData = {};
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith("projects_") || k.startsWith("kb_")) {
            backupData[k] = localStorage.getItem(k);
        }
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `KBHFILMS_Backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
};

window.handleRestoreDatabase = async function(jsonData) {
    try {
        const parsed = JSON.parse(jsonData);
        Object.keys(parsed).forEach(k => {
            localStorage.setItem(k, parsed[k]);
        });

        if (!LOCAL_MODE) {
            for (const key of Object.keys(parsed)) {
                if (key.startsWith("projects_")) {
                    const parts = key.replace("projects_", "").split("_");
                    const y = parts[0];
                    const mName = parts[1];
                    const mNum = monthMap[mName];
                    const projects = JSON.parse(parsed[key]);

                    if (y && mNum) {
                        await fetch(`/api/projects?year=${y}&month=${mNum}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(projects)
                        });
                    }
                }
            }
        }

        await loadProjects();
        alert("Database restored successfully!");
    } catch (err) {
        console.error("Restore failed:", err);
        alert("Invalid backup file format.");
    }
};

/* ==================================
   UI HELPERS
================================== */
function updateStatusColor(select) {
    if (!select) return;

    select.style.fontWeight = "700";

    select.classList.remove(
        "status-planned",
        "status-progress",
        "status-concerns",
        "status-review",
        "status-delivered",
        "status-ratings"
    );

    switch (select.value) {
        case "PLANNED": select.classList.add("status-planned"); break;
        case "IN PROGRESS": select.classList.add("status-progress"); break;
        case "PROJECT CONCERNS": select.classList.add("status-concerns"); break;
        case "FOR REVIEW": select.classList.add("status-review"); break;
        case "DELIVERED": select.classList.add("status-delivered"); break;
        case "YONG'S RATINGS": select.classList.add("status-ratings"); break;
    }

    const row = select.closest("tr");
    if (row) {
        updateRowProgress(row);
    }

    const concernsBtn = row?.querySelector(".concerns-btn");
    if (concernsBtn) {
        concernsBtn.style.display = select.value === "PROJECT CONCERNS" ? "block" : "none";
    }

    updateTimelineProgress();
}

function updateTypeColor(select) {
    if (!select) return;

    select.classList.remove(
        "type-basic", "type-romantic", "type-upbeat",
        "type-slow", "type-normal", "type-fast", "type-not-set",
        "type-proposal", "type-montage", "type-pre-wedding", "type-pre_wedding"
    );

    select.style.backgroundColor = "";
    select.style.color = "";

    const val = (select.value || "").trim().toUpperCase();

    if (val === "PROPOSAL") {
        select.classList.add("type-proposal");
        select.style.backgroundColor = "#e0f2fe";
        select.style.color = "#0369a1";
    } else if (val === "MONTAGE") {
        select.classList.add("type-montage");
        select.style.backgroundColor = "#fae8ff";
        select.style.color = "#a21caf";
    } else if (val === "PRE WEDDING" || val === "PRE_WEDDING" || val === "PRE-WEDDING") {
        select.classList.add("type-pre-wedding");
        select.style.backgroundColor = "#ffe4e6";
        select.style.color = "#9f1239";
    } else if (val === "BASIC HIGHLIGHTS") {
        select.classList.add("type-basic");
        select.style.backgroundColor = "#dbeafe";
        select.style.color = "#1d4ed8";
    } else if (val === "ROMANTIC CINEMATIC") {
        select.classList.add("type-romantic");
        select.style.backgroundColor = "#ffe4e6";
        select.style.color = "#be123c";
    } else if (val === "UPBEAT CINEMATIC") {
        select.classList.add("type-upbeat");
        select.style.backgroundColor = "#dcfce7";
        select.style.color = "#15803d";
    } else if (val === "SLOW CLASSICAL") {
        select.classList.add("type-slow");
        select.style.backgroundColor = "#ede9fe";
        select.style.color = "#6d28d9";
    } else if (val === "NORMAL CLASSICAL") {
        select.classList.add("type-normal");
        select.style.backgroundColor = "#fef3c7";
        select.style.color = "#92400e";
    } else if (val === "FAST CLASSICAL") {
        select.classList.add("type-fast");
        select.style.backgroundColor = "#fee2e2";
        select.style.color = "#b91c1c";
    } else {
        select.classList.add("type-not-set");
        select.style.backgroundColor = "#f3f4f6";
        select.style.color = "#374151";
    }
    
    select.style.fontWeight = "700";
}

function updateSongStatusColor(select) {
    if (!select) return;

    const value = select.value;
    select.style.fontWeight = "700";

    if (value === "APPROVED") {
        select.style.backgroundColor = "#dcfce7";
        select.style.color = "#15803d";
    } else if (value === "REJECT") {
        select.style.backgroundColor = "#fee2e2";
        select.style.color = "#b91c1c";
    } else if (value === "RESERVED") {
        select.style.backgroundColor = "#fef3c7";
        select.style.color = "#b45309";
    } else if (value === "REQUESTED") {
        select.style.backgroundColor = "#fdba74";
        select.style.color = "#7c2d12";
    } else if (value === "NEW") {
        select.style.backgroundColor = "#e0f2fe"; 
        select.style.color = "#0369a1"; 
    } else {
        select.style.backgroundColor = "#ffffff";
        select.style.color = "#374151";
    }
}

/* ==================================
   MONTH RIGHT-CLICK MENU (ADMIN)
================================== */
const monthContextMenu = document.getElementById("monthContextMenu");

async function saveMonthLock(year, monthName, locked) {
    if (LOCAL_MODE) return;

    const monthNumber = monthMap[monthName];

    try {
        await fetch("/api/month-lock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year: year, month: monthNumber, locked: locked })
        });
    } catch (err) {
        console.error("[MONTH LOCK ERROR]", err);
    }
}

document.querySelectorAll(".month-btn").forEach(button => {
    button.addEventListener("click", async () => {
        document.querySelectorAll(".month-btn").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        currentMonth = button.dataset.month;
        localStorage.setItem("kb_selected_month", currentMonth);

        await loadProjects();
        recordActivity("Switched Month", `Month: ${currentMonth.toUpperCase()}`);
    });

    button.addEventListener("contextmenu", (e) => {
        if (typeof IS_ADMIN === "undefined" || !IS_ADMIN) return;
        e.preventDefault();
        const selectedMonth = button.dataset.month;

        const lockBtn = document.getElementById("lockMonthBtn");
        const unlockBtn = document.getElementById("unlockMonthBtn");
        const key = getMonthKey(currentYear, selectedMonth);
        const locked = !!getMonthLocks()[key];

        if (locked) {
            if (lockBtn) lockBtn.style.display = "none";
            if (unlockBtn) unlockBtn.style.display = "flex";
        } else {
            if (lockBtn) lockBtn.style.display = "flex";
            if (unlockBtn) unlockBtn.style.display = "none";
        }

        if (monthContextMenu) {
            monthContextMenu.dataset.month = selectedMonth;
            monthContextMenu.style.display = "block";
            monthContextMenu.style.left = `${e.pageX}px`;
            monthContextMenu.style.top = `${e.pageY}px`;
        }
    });
});

document.addEventListener("click", () => {
    if (monthContextMenu) {
        monthContextMenu.style.display = "none";
    }
});

document.getElementById("lockMonthBtn")?.addEventListener("click", async () => {
    const month = monthContextMenu.dataset.month;
    const button = document.querySelector(`.month-btn[data-month="${month}"]`);
    if (!button) return;

    const locks = getMonthLocks();
    locks[getMonthKey(currentYear, month)] = true;
    saveMonthLocks(locks);

    await saveMonthLock(currentYear, month, true);
    button.classList.add("locked");
    updateMonthLockUI();
    monthContextMenu.style.display = "none";
    recordActivity("Locked Month", `Month: ${month.toUpperCase()} (${currentYear})`);
});

document.getElementById("unlockMonthBtn")?.addEventListener("click", async () => {
    const month = monthContextMenu.dataset.month;
    const button = document.querySelector(`.month-btn[data-month="${month}"]`);
    if (!button) return;

    const locks = getMonthLocks();
    delete locks[getMonthKey(currentYear, month)];
    saveMonthLocks(locks);

    await saveMonthLock(currentYear, month, false);
    button.classList.remove("locked");
    updateMonthLockUI();
    monthContextMenu.style.display = "none";
    recordActivity("Unlocked Month", `Month: ${month.toUpperCase()} (${currentYear})`);
});

/* ==================================
   WATCH & MODALS EVENTS
================================== */
let activeWatchButton = null;
let activeFilesButton = null;
let activeSongInput = null;

const songContextMenu = document.getElementById("songContextMenu");

document.addEventListener("contextmenu", (e) => {
    const input = e.target.closest(".song-link");
    if (!input) return;

    e.preventDefault();
    e.stopPropagation();

    activeSongInput = input;
    const rect = input.getBoundingClientRect();

    if (songContextMenu) {
        songContextMenu.style.display = "block";
        songContextMenu.style.left = `${window.scrollX + rect.left}px`;
        songContextMenu.style.top = `${window.scrollY + rect.top - songContextMenu.offsetHeight - 8}px`;
    }
});

const songLinkModal = document.getElementById("songLinkModal");
const songLinkInput = document.getElementById("songLinkInput");
const songTitleInput = document.getElementById("songTitleInput");
const closeSongLinkModal = document.getElementById("closeSongLinkModal");

const watchModal = document.getElementById("watchModal");
const watchFrame = document.getElementById("watchFrame");
const watchContextMenu = document.getElementById("watchContextMenu");
const watchLinkModal = document.getElementById("watchLinkModal");
const watchLinkInput = document.getElementById("watchLinkInput");
const closeWatchLinkModal = document.getElementById("closeWatchLinkModal");

const filesContextMenu = document.getElementById("filesContextMenu");
const filesLinkModal = document.getElementById("filesLinkModal");
const filesLinkInput = document.getElementById("filesLinkInput");
const closeFilesLinkModal = document.getElementById("closeFilesLinkModal");

document.querySelectorAll(".watch-btn").forEach(button => {
    button.addEventListener("click", () => {
        let link = button.dataset.watchLink;

        if (!link) {
            alert("📂 Project Files Coming Soon!\n\nPlease wait while the administrator attaches the project folder.");
            return;
        }

        if (link.includes("youtube.com/watch?v=")) {
            const videoId = new URL(link).searchParams.get("v");
            link = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        } else if (link.includes("youtu.be/")) {
            const videoId = link.split("youtu.be/")[1].split("?")[0];
            link = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        } else if (link.includes("drive.google.com/file/d/")) {
            const match = link.match(/\/d\/([^/]+)/);
            if (match) {
                link = `https://drive.google.com/file/d/${match[1]}/preview`;
            }
        } else if (link.includes("vimeo.com/")) {
            const videoId = link.split("/").pop().split("?")[0];
            link = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
        } else {
            window.open(link, "_blank");
            return;
        }

        if (watchFrame) watchFrame.src = link;
        if (watchModal) watchModal.classList.add("show");

        localStorage.setItem("watchPlayerState", JSON.stringify({
            open: true,
            minimized: false,
            link: link
        }));
        recordActivity("Watched Project", "Opened preview window");
    });

    button.addEventListener("contextmenu", (e) => {
        if (typeof IS_ADMIN === "undefined" || !IS_ADMIN) return;
        e.preventDefault();
        e.stopPropagation();

        activeWatchButton = button;
        if (watchContextMenu) {
            watchContextMenu.style.display = "block";
            watchContextMenu.style.position = "fixed";
            watchContextMenu.style.left = `${e.clientX}px`;
            watchContextMenu.style.top = `${e.clientY}px`;
        }
    });
});

document.querySelectorAll(".get-files-btn").forEach(button => {
    button.addEventListener("click", () => {
        const link = button.dataset.filesLink;
        if (!link) {
            alert("📂 Project Files Coming Soon!\n\nPlease wait while the administrator attaches the project folder.");
            return;
        }
        window.open(link, "_blank");
        recordActivity("Opened Raw Files", "Checked project files link");
    });

    button.addEventListener("contextmenu", (e) => {
        if (typeof IS_ADMIN === "undefined" || !IS_ADMIN) return;
        e.preventDefault();
        e.stopPropagation();

        activeFilesButton = button;
        if (filesContextMenu) {
            filesContextMenu.style.display = "block";
            filesContextMenu.style.position = "fixed";
            filesContextMenu.style.left = `${e.clientX}px`;
            filesContextMenu.style.top = `${e.clientY}px`;
        }
    });
});

document.addEventListener("click", (e) => {
    if (songContextMenu && !e.target.closest("#songContextMenu")) {
        songContextMenu.style.display = "none";
    }
    if (watchContextMenu && !e.target.closest("#watchContextMenu")) {
        watchContextMenu.style.display = "none";
    }
    if (filesContextMenu && !e.target.closest("#filesContextMenu")) {
        filesContextMenu.style.display = "none";
    }
});

document.getElementById("closeWatchModal")?.addEventListener("click", () => {
    if (watchModal) watchModal.classList.remove("show");
    const watchPlayer = document.getElementById("watchBox");
    const minimizeWatch = document.getElementById("minimizeWatchBtn");
    const maximizeWatch = document.getElementById("maximizeWatchBtn");

    if (watchPlayer) {
        watchPlayer.classList.remove("mini-player");
        watchPlayer.style.left = "50%";
        watchPlayer.style.top = "50%";
        watchPlayer.style.right = "auto";
        watchPlayer.style.bottom = "auto";
        watchPlayer.style.transform = "translate(-50%, -50%)";
    }

    if (minimizeWatch) minimizeWatch.style.display = "inline-flex";
    if (maximizeWatch) maximizeWatch.style.display = "none";
    if (watchFrame) watchFrame.src = "";
    localStorage.removeItem("watchPlayerState");
});

document.getElementById("attachWatchLinkBtn")?.addEventListener("click", () => {
    if (!activeWatchButton) return;

    if (watchContextMenu) watchContextMenu.style.display = "none";
    if (watchLinkInput) watchLinkInput.value = activeWatchButton.dataset.watchLink || "";
    if (watchLinkModal) watchLinkModal.classList.add("show");
    if (watchLinkInput) watchLinkInput.focus();
});

watchLinkInput?.addEventListener("input", () => {
    if (!activeWatchButton) return;

    activeWatchButton.dataset.watchLink = watchLinkInput.value.trim();
    activeWatchButton.querySelector(".play-icon")?.classList.toggle("has-link", watchLinkInput.value.trim() !== "");
    saveProjects();
    updateCurrentMonthHasData(); 
    recordActivity("Attached Watch Link", "Updated video link");
});

closeWatchLinkModal?.addEventListener("click", () => {
    watchLinkModal?.classList.remove("show");
});

watchLinkModal?.addEventListener("click", (e) => {
    if (e.target === watchLinkModal) {
        watchLinkModal.classList.remove("show");
    }
});

document.getElementById("attachFilesLinkBtn")?.addEventListener("click", () => {
    if (!activeFilesButton) return;

    if (filesContextMenu) filesContextMenu.style.display = "none";
    if (filesLinkInput) filesLinkInput.value = activeFilesButton.dataset.filesLink || "";
    if (filesLinkModal) filesLinkModal.classList.add("show");
    if (filesLinkInput) filesLinkInput.focus();
});

filesLinkInput?.addEventListener("input", () => {
    if (!activeFilesButton) return;

    activeFilesButton.dataset.filesLink = filesLinkInput.value.trim();
    activeFilesButton.classList.toggle("has-link", filesLinkInput.value.trim() !== "");
    saveProjects();
    updateCurrentMonthHasData(); 
    recordActivity("Attached Files Link", "Updated raw files link");
});

closeFilesLinkModal?.addEventListener("click", () => {
    filesLinkModal?.classList.remove("show");
});

filesLinkModal?.addEventListener("click", (e) => {
    if (e.target === filesLinkModal) {
        filesLinkModal.classList.remove("show");
    }
});

document.getElementById("attachSongLinkBtn")?.addEventListener("click", () => {
    if (!activeSongInput) return;

    if (songContextMenu) songContextMenu.style.display = "none";
    if (songTitleInput) songTitleInput.value = activeSongInput.value || "";
    if (songLinkInput) songLinkInput.value = activeSongInput.dataset.songLink || "";
    if (songLinkModal) songLinkModal.classList.add("show");
    if (songTitleInput) songTitleInput.focus();
});

songLinkInput?.addEventListener("input", () => {
    if (!activeSongInput) return;

    activeSongInput.dataset.songLink = songLinkInput.value.trim();
    updateSongLinkStyle(activeSongInput);
    saveProjects();
    updateCurrentMonthHasData(); 
    recordActivity("Attached Song Link", "Updated song link");
});

songTitleInput?.addEventListener("input", () => {
    if (!activeSongInput) return;

    activeSongInput.value = songTitleInput.value;
    saveProjects();
    updateCurrentMonthHasData();
    recordActivity("Updated Song Title", `Song: ${songTitleInput.value}`);
});

closeSongLinkModal?.addEventListener("click", () => {
    songLinkModal?.classList.remove("show");
});

songLinkModal?.addEventListener("click", (e) => {
    if (e.target === songLinkModal) {
        songLinkModal.classList.remove("show");
    }
});

// ===============================
// SPECIAL INSTRUCTIONS & COMMENTS MODALS
// ===============================

// Generic URL Parser / Converter (Nilagyan ng contenteditable="false" para lumitaw ang hand pointer cursor)
function convertUrlsToLinks(text) {
    if (!text) return "";
    
    // Kung may existing <a> tags na sa lumang save, siguraduhing may contenteditable="false" rin sila
    if (text.includes("<a ")) {
        return text.replace(/<a\s+([^>]+)>/gi, (match, attrs) => {
            if (!attrs.includes('contenteditable')) {
                return `<a ${attrs} contenteditable="false" style="color: #2563eb !important; text-decoration: underline !important; cursor: pointer !important;">`;
            }
            return match;
        });
    }

    const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
    return text.replace(urlRegex, (url) => {
        let href = url;
        if (!href.startsWith("http://") && !href.startsWith("https://")) {
            href = "https://" + href;
        }
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" contenteditable="false" style="color: #2563eb !important; text-decoration: underline !important; cursor: pointer !important;">${url}</a>`;
    });
}

function getEditorContent(element) {
    if (!element) return "";
    return element.innerHTML;
}

// 🛠️ Dito natin sinisigurado na pati ang mga lumang plain text ay mada-convert sa totoong link pag-open ng modal
function setEditorContent(element, htmlContent) {
    if (!element) return;
    const processed = convertUrlsToLinks(htmlContent);
    element.innerHTML = processed || "";
}

// 🛠️ Tamang paste handler para manatili sa cursor position at maging clickable link
function handleEditorPaste(e, textareaElement) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    const processedHtml = convertUrlsToLinks(text);

    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (textareaElement.contains(range.commonAncestorContainer)) {
            range.deleteContents();
            const div = document.createElement("div");
            div.innerHTML = processedHtml;
            const frag = document.createDocumentFragment();
            let node, lastNode;
            while ((node = div.firstChild)) {
                lastNode = frag.appendChild(node);
            }
            range.insertNode(frag);
            
            if (lastNode) {
                range.setStartAfter(lastNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        } else {
            textareaElement.innerHTML += processedHtml;
        }
    } else {
        textareaElement.innerHTML += processedHtml;
    }

    textareaElement.dispatchEvent(new Event("input", { bubbles: true }));
}

// 🛠️ Click handler para bumukas agad ang link sa bagong tab kapag na-click
function handleEditorClick(e) {
    const target = e.target.closest("a");
    if (target && target.href) {
        e.preventDefault();
        window.open(target.href, "_blank", "noopener,noreferrer");
    }
}

// --- SPECIAL INSTRUCTIONS LOGIC ---
document.querySelectorAll(".instruction-btn").forEach((button) => {
    button.addEventListener("click", () => {
        activeCoupleRow = button.closest("tr");
        const instructionBtn = activeCoupleRow.querySelector(".instruction-btn");

        if (instructionTextarea) {
            setEditorContent(instructionTextarea, instructionBtn.dataset.notes || "");
        }
        if (instructionModal) instructionModal.classList.add("show");
        if (instructionTextarea) instructionTextarea.focus();
    });
});

closeInstructionModal?.addEventListener("click", () => {
    instructionModal?.classList.remove("show");
});

instructionModal?.addEventListener("click", (e) => {
    if (e.target === instructionModal) {
        instructionModal.classList.remove("show");
    }
});

instructionTextarea?.addEventListener("input", () => {
    if (!activeCoupleRow) return;

    const instructionBtn = activeCoupleRow.querySelector(".instruction-btn");
    const content = getEditorContent(instructionTextarea);
    
    instructionBtn.dataset.notes = content;
    instructionBtn.style.background = instructionTextarea.textContent.trim() ? "#22c55e" : "#ff7a1a";
    saveProjects();
    updateCurrentMonthHasData();
    recordActivity("Updated Special Instructions", "Edited instruction notes");
});

instructionTextarea?.addEventListener("paste", (e) => {
    handleEditorPaste(e, instructionTextarea);
});

instructionTextarea?.addEventListener("click", handleEditorClick);


// --- COMMENTS / CONCERNS LOGIC ---
document.addEventListener("click", (e) => {
    const button = e.target.closest(".comments-btn, .concerns-btn");
    if (!button) return;

    activeNotesButton = button;
    if (commentsTextarea) {
        setEditorContent(commentsTextarea, button.dataset.notes || "");
    }

    if (commentsModal) {
        if (button.classList.contains("concerns-btn")) {
            commentsModal.classList.add("concerns-mode");
        } else {
            commentsModal.classList.remove("concerns-mode");
        }
        commentsModal.classList.add("show");
    }
    if (commentsTextarea) commentsTextarea.focus();
});

closeCommentsModal?.addEventListener("click", () => {
    if (commentsModal) {
        commentsModal.classList.remove("show");
        commentsModal.classList.remove("concerns-mode");
    }
});

commentsModal?.addEventListener("click", (e) => {
    if (e.target === commentsModal) {
        commentsModal.classList.remove("show");
        commentsModal.classList.remove("concerns-mode");
    }
});

commentsTextarea?.addEventListener("input", () => {
    if (!activeNotesButton) return;

    const content = getEditorContent(commentsTextarea);
    activeNotesButton.dataset.notes = content;
    activeNotesButton.classList.toggle("has-comments", commentsTextarea.textContent.trim() !== "");
    saveProjects();
    updateCurrentMonthHasData();
    recordActivity("Updated Comments / Concerns", "Edited notes");
});

// Ginamit na rin ang handleEditorPaste at handleEditorClick para sa comments
commentsTextarea?.addEventListener("paste", (e) => {
    handleEditorPaste(e, commentsTextarea);
});

commentsTextarea?.addEventListener("click", handleEditorClick);

/* ==================================
   WATCH PLAYER WINDOW DRAG & CONTROLS
================================== */
const watchPlayer = document.getElementById("watchBox");
const watchHeader = document.getElementById("watchHeader");
const minimizeWatch = document.getElementById("minimizeWatchBtn");
const maximizeWatch = document.getElementById("maximizeWatchBtn");

if (watchPlayer && watchHeader && watchFrame && minimizeWatch && maximizeWatch) {
    watchPlayer.style.position = "fixed";
    watchPlayer.style.left = "50%";
    watchPlayer.style.top = "50%";
    watchPlayer.style.transform = "translate(-50%, -50%)";

    let watchDragging = false;
    let watchOffsetX = 0;
    let watchOffsetY = 0;
    let dragRAF = null;
    let dragX = 0;
    let dragY = 0;

    watchHeader.addEventListener("mousedown", (e) => {
        e.preventDefault();
        watchDragging = true;
        watchPlayer.classList.add("dragging");
        document.body.style.userSelect = "none";

        const rect = watchPlayer.getBoundingClientRect();
        watchPlayer.style.left = rect.left + "px";
        watchPlayer.style.top = rect.top + "px";
        watchPlayer.style.right = "auto";
        watchPlayer.style.bottom = "auto";
        watchPlayer.style.transform = "none";

        watchOffsetX = e.clientX - rect.left;
        watchOffsetY = e.clientY - rect.top;
    });

    document.addEventListener("mousemove", (e) => {
        if (!watchDragging) return;

        dragX = e.clientX - watchOffsetX;
        dragY = e.clientY - watchOffsetY;

        if (dragRAF) return;

        dragRAF = requestAnimationFrame(() => {
            watchPlayer.style.left = dragX + "px";
            watchPlayer.style.top = dragY + "px";
            dragRAF = null;
        });
    });

    document.addEventListener("mouseup", () => {
        watchDragging = false;
        watchPlayer.classList.remove("dragging");
        document.body.style.userSelect = "";
    });

    minimizeWatch.addEventListener("click", () => {
        if (watchPlayer.classList.contains("mini-player")) return;

        watchPlayer.classList.add("mini-player");
        watchPlayer.style.left = "auto";
        watchPlayer.style.top = "auto";
        watchPlayer.style.right = "30px";
        watchPlayer.style.bottom = "30px";
        watchPlayer.style.transform = "none";

        if (watchModal) {
            watchModal.style.background = "transparent";
            watchModal.style.pointerEvents = "none";
        }
        watchPlayer.style.pointerEvents = "auto";

        minimizeWatch.style.display = "none";
        maximizeWatch.style.display = "inline-flex";
    });

    maximizeWatch.addEventListener("click", () => {
        watchPlayer.classList.remove("mini-player");
        watchPlayer.style.width = "";
        watchPlayer.style.height = "";
        watchPlayer.style.left = "50%";
        watchPlayer.style.top = "50%";
        watchPlayer.style.right = "auto";
        watchPlayer.style.bottom = "auto";
        watchPlayer.style.transform = "translate(-50%, -50%)";

        if (watchModal) {
            watchModal.style.background = "";
            watchModal.style.pointerEvents = "";
        }

        maximizeWatch.style.display = "none";
        minimizeWatch.style.display = "inline-flex";

        const playerState = JSON.parse(localStorage.getItem("watchPlayerState"));
        if (playerState) {
            playerState.minimized = false;
            localStorage.setItem("watchPlayerState", JSON.stringify(playerState));
        }
    });

    maximizeWatch.style.display = "none";
}

/* ===============================
// LOGOUT
// =============================== */
const logoutBtn = document.getElementById("logoutBtn");
const logoutConfirm = document.getElementById("logoutConfirm");
const confirmLogout = document.getElementById("confirmLogout");
const cancelLogout = document.getElementById("cancelLogout");

if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        logoutConfirm?.classList.toggle("show");
    });
}

if (cancelLogout) {
    cancelLogout.addEventListener("click", (e) => {
        e.stopPropagation();
        logoutConfirm?.classList.remove("show");
    });
}

if (confirmLogout) {
    confirmLogout.addEventListener("click", () => {
        recordActivity("Logged Out", "User signed out");
        localStorage.removeItem("currentUser");
        window.location.href = "../login.html";
    });
}

document.addEventListener("click", (e) => {
    if (logoutConfirm && !logoutConfirm.contains(e.target) && !logoutBtn?.contains(e.target)) {
        logoutConfirm.classList.remove("show");
    }
});

/* ==================================
   SOUNDS & MUSIC
================================== */
const clickSound = new Audio("../assets/sounds/click.mp3");
clickSound.volume = 0.2;

document.querySelectorAll(`
    button,
    input[type="button"],
    input[type="submit"],
    input[type="reset"]
`).forEach(button => {
    button.addEventListener("click", () => {
        clickSound.currentTime = 0;
        clickSound.play().catch(() => {});
    });
});

const typingSound = new Audio("../assets/sounds/typing.mp3");
typingSound.volume = 0.30;
let lastTypingTime = 0;

document.addEventListener("keydown", (e) => {
    const target = e.target;
    if (!target.matches(`input, textarea, [contenteditable="true"]`)) return;

    if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Escape"].includes(e.key)) return;

    const now = Date.now();
    if (now - lastTypingTime > 40) {
        typingSound.currentTime = 0;
        typingSound.play().catch(() => {});
        lastTypingTime = now;
    }
});

let musicPlaylist = [];

async function loadPlaylist() {
    try {
        const response = await fetch("../assets/Music/playlist.json");
        musicPlaylist = await response.json();
        musicPlaylist = musicPlaylist.map(file => `../assets/Music/${file}`);
        playRandomMusic();
    } catch (err) {
        console.error("Unable to load playlist.", err);
    }
}

const bgMusic = new Audio();
bgMusic.volume = 0.25;
let lastSongIndex = -1;

function playRandomMusic() {
    if (!musicPlaylist.length) return;
    let randomIndex;

    do {
        randomIndex = Math.floor(Math.random() * musicPlaylist.length);
    } while (musicPlaylist.length > 1 && randomIndex === lastSongIndex);

    lastSongIndex = randomIndex;
    bgMusic.src = musicPlaylist[randomIndex];
    bgMusic.play().catch(() => {
        document.addEventListener("click", () => {
            bgMusic.play();
        }, { once: true });
    });
}

bgMusic.addEventListener("ended", () => {
    playRandomMusic();
});

loadPlaylist();

const playBtn = document.getElementById("musicPlay");
const prevBtn = document.getElementById("musicPrev");
const nextBtn = document.getElementById("musicNext");
const volumeSlider = document.getElementById("musicVolume");
const volumeValue = document.getElementById("volumeValue");
const volumeIcon = document.getElementById("volumeIcon");

playBtn?.addEventListener("click", () => {
    if (bgMusic.paused) {
        bgMusic.play();
    } else {
        bgMusic.pause();
    }
});

nextBtn?.addEventListener("click", () => {
    playRandomMusic();
});

prevBtn?.addEventListener("click", () => {
    if (musicPlaylist.length <= 1) return;
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * musicPlaylist.length);
    } while (randomIndex === lastSongIndex);

    lastSongIndex = randomIndex;
    bgMusic.src = musicPlaylist[randomIndex];
    bgMusic.play();
});

volumeSlider?.addEventListener("input", () => {
    bgMusic.volume = volumeSlider.value / 100;
    volumeValue.textContent = volumeSlider.value + "%";
    volumeIcon.textContent = bgMusic.volume === 0 ? "🔇" : "🔊";
});

const initialVolume = Math.round(bgMusic.volume * 100);
if (volumeSlider) volumeSlider.value = initialVolume;
if (volumeValue) volumeValue.textContent = initialVolume + "%";

bgMusic.addEventListener("play", () => {
    if (playBtn) playBtn.textContent = "⏸";
});

bgMusic.addEventListener("pause", () => {
    if (playBtn) playBtn.textContent = "▶";
});

let lastVolume = bgMusic.volume;
volumeIcon?.addEventListener("click", () => {
    if (bgMusic.volume > 0) {
        lastVolume = bgMusic.volume;
        bgMusic.volume = 0;
        volumeSlider.value = 0;
        volumeValue.textContent = "0%";
        volumeIcon.textContent = "🔇";
    } else {
        bgMusic.volume = lastVolume || 0.15;
        volumeSlider.value = Math.round(bgMusic.volume * 100);
        volumeValue.textContent = volumeSlider.value + "%";
        volumeIcon.textContent = "🔊";
    }
});

/* ==================================
   SONG LINK STYLE & DRONE AUTOCOMPLETE
================================== */
function updateSongLinkStyle(input) {
    if (!input) return;
    input.classList.toggle("has-link", !!input.dataset.songLink?.trim());
}

document.addEventListener("input", (e) => {
    if (
        e.target.closest(".couple-name") ||
        e.target.closest(".dashboard-raw-input") ||
        e.target.closest(".song-link")
    ) {
        updateCurrentMonthHasData();
    }
});

function updateDroneColor(select) {
    if (!select) return;
    select.classList.remove("selected", "client-drone");

    if (select.value === "CLIENT'S DRONE") {
        select.classList.add("client-drone");
    } else if (select.value !== "NO DRONE") {
        select.classList.add("selected");
    }
}

document.querySelectorAll(".drone-cell").forEach(cell => {
    const search = cell.querySelector(".drone-search");
    const select = cell.querySelector(".drone-select");
    const suggestions = cell.querySelector(".drone-suggestions");

    if (!search || !select || !suggestions) return;

    updateDroneColor(select);

    search.addEventListener("input", () => {
        const keyword = search.value.trim().toUpperCase();
        suggestions.innerHTML = "";

        if (!keyword) {
            suggestions.classList.remove("show");
            return;
        }

        [...select.options].forEach(option => {
            if (option.value === "NO DRONE" || !option.text.toUpperCase().includes(keyword)) return;

            const item = document.createElement("div");
            item.className = "drone-suggestion";
            item.innerHTML = option.text.replace(new RegExp(keyword, "ig"), match => `<b>${match}</b>`);

            item.addEventListener("click", () => {
                select.value = option.value;
                updateDroneColor(select);
                search.value = "";
                suggestions.innerHTML = "";
                suggestions.classList.remove("show");
                saveProjects();
                updateCurrentMonthHasData();
                recordActivity("Selected Drone via Search", `Drone -> ${option.value}`);
            });

            suggestions.appendChild(item);
        });

        suggestions.classList.toggle("show", suggestions.children.length > 0);
    });

    select.addEventListener("change", () => {
        updateDroneColor(select);
        updateCurrentMonthHasData();
    });

    document.addEventListener("click", (e) => {
        if (!cell.contains(e.target)) {
            suggestions.classList.remove("show");
        }
    });
});

document.addEventListener("dblclick", (e) => {
    const input = e.target.closest(".song-link");
    if (!input) return;

    const link = input.dataset.songLink?.trim();
    if (!link) return;

    window.open(link, "_blank");
});

/* ==================================
   TIMELINE & PROGRESS SLIDER
================================== */
function updateTimelineProgress() {
    document.querySelectorAll(".project-table tbody tr").forEach(row => {
        updateRowProgress(row);
    });
}

function updateRowProgress(row) {
    if (!row) return;

    const status = row.querySelector(".status-select");
    const slider = row.querySelector(".progress-slider");
    const label = row.querySelector(".timeline-percent");

    if (!status || !slider || !label) return;

    const getFilesBtn = row.querySelector(".get-files-btn");
    const inProgress = status.value === "IN PROGRESS";
    const delivered = status.value === "DELIVERED";

    slider.style.display = inProgress ? "block" : "none";
    label.style.display = inProgress ? "block" : "none";

    if (getFilesBtn) {
        getFilesBtn.style.display = delivered ? "block" : "none";
    }

    if (typeof IS_ADMIN !== "undefined" && !IS_ADMIN) {
        slider.style.pointerEvents = "none"; 
    }

    label.textContent = slider.value + "%";

    const value = Number(slider.value);
    const hue = value * 1.2;
    const color = `hsl(${hue}, 90%, 50%)`;

    slider.style.accentColor = color;
    slider.style.background = `linear-gradient(to right, ${color} ${value}%, #e2e8f0 ${value}%)`;
}

document.querySelectorAll(".progress-slider").forEach(slider => {
    updateRowProgress(slider.closest("tr"));

    slider.addEventListener("input", () => {
        updateRowProgress(slider.closest("tr"));
        saveProjects();
        updateCurrentMonthHasData();
    });
});

// ==================================
// RESTORE PROJECTS (LOCAL CACHE - Smooth No Flicker)
// ==================================
function restoreProjectsLocal(year = currentYear, month = currentMonth) {
    const key = `projects_${year}_${month}`;
    const saved = localStorage.getItem(key);

    const tbody = document.querySelector(".project-table tbody");
    if (tbody) {
        tbody.style.opacity = "0"; 
    }

    if (!saved) {
        console.log(`[LOCAL RESTORE] No cache found for ${key}`);
        const rows = document.querySelectorAll(".project-table tbody tr");
        rows.forEach(row => {
            const emptyData = {}; 
            populateRow(row, emptyData);
        });
        if (tbody) {
            setTimeout(() => { tbody.style.opacity = "1"; }, 50);
        }
        updateCurrentMonthHasData();
        return false;
    }

    try {
        const projects = JSON.parse(saved);
        const rows = document.querySelectorAll(".project-table tbody tr");

        rows.forEach(row => {
            const rowId = Number(row.dataset.rowId || row.getAttribute("data-row-id"));
            const data = projects.find(p => Number(p.rowId) === rowId);

            if (data) {
                populateRow(row, data);
            }
        });

        console.log(`[LOCAL RESTORE] Restored ${projects.length} project(s) from ${key}`);
        
        if (tbody) {
            requestAnimationFrame(() => {
                tbody.style.transition = "opacity 0.15s ease-in-out";
                tbody.style.opacity = "1";
            });
        }
        updateCurrentMonthHasData();
        return true;
    } catch (e) {
        console.error("[LOCAL RESTORE]", e);
        if (tbody) {
            tbody.style.opacity = "1";
        }
        updateCurrentMonthHasData();
        return false;
    }
}

// ==================================
// QUICK DEPLOYMENT MODAL FEATURE
// ==================================
const quickDeployBtn = document.getElementById("quickDeployBtn");
const deployModal = document.getElementById("deployModal");

if (quickDeployBtn && deployModal) {
    quickDeployBtn.addEventListener("click", () => {
        deployModal.classList.add("show");

        const percent = document.getElementById("deployPercent");
        const bar = document.getElementById("deployProgressBar");
        const message = document.getElementById("deployMessage");

        const steps = [
            {
                percent: 10,
                message: "Preparing package...",
                id: "stepPrepare"
            },
            {
                percent: 25,
                message: "Building package...",
                id: "stepPackage"
            },
            {
                percent: 45,
                message: "Uploading package...",
                id: "stepUpload"
            },
            {
                percent: 70,
                message: "Deploying files...",
                id: "stepDeploy"
            },
            {
                percent: 90,
                message: "Restarting server...",
                id: "stepRestart"
            },
            {
                percent: 100,
                message: "Deployment completed successfully.",
                id: "stepHealth"
            }
        ];

        document
            .querySelectorAll(".deploy-steps div")
            .forEach(step => {
                step.innerHTML = "⬜ " + step.textContent.replace(/^.*?\s/, "");
            });

        if (percent) percent.textContent = "0%";
        if (bar) bar.style.width = "0%";
        if (message) message.textContent = "Waiting...";

        let index = 0;

        function nextStep() {
            if (index >= steps.length) {
                return;
            }

            const step = steps[index];

            if (percent) percent.textContent = step.percent + "%";
            if (bar) bar.style.width = step.percent + "%";
            if (message) message.textContent = step.message;

            const targetStep = document.getElementById(step.id);
            if (targetStep) {
                targetStep.innerHTML = "✅ " + targetStep.textContent.replace(/^.*?\s/, "");
            }

            index++;

            setTimeout(nextStep, 1000);
        }

        setTimeout(nextStep, 800);
    });
}