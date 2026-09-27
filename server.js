const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const multer = require("multer");
const AdmZip = require("adm-zip");
const fs = require("fs");
const { exec } = require("child_process"); // <--- Idinagdag para mapagana ang PowerShell execution

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// QUICK DEPLOY (API Endpoint para patakbuhin ang deploy.ps1)
// ==========================================

// Idinagdag ang totoong backend API para sa Quick Deploy button
app.post("/api/deploy", (req, res) => {
    const deployScriptPath = path.join(__dirname, "deploy.ps1");

    // Pinapalakad ang PowerShell script nang direkta sa iyong system
    exec(`powershell.exe -ExecutionPolicy Bypass -File "${deployScriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Deployment error: ${error.message}`);
            return res.status(500).json({ success: false, message: error.message });
        }
        if (stderr) {
            console.warn(`Deployment stderr: ${stderr}`);
        }
        console.log("Deployment output:", stdout);
        res.json({ success: true, message: "Deployment completed successfully!", output: stdout });
    });
});

// ==========================================
// SERVER ENVIRONMENT API (Para malaman kung Laptop o Phone Server)
// ==========================================
app.get("/api/server-env", (req, res) => {
    // Sinusuri kung ang process ay tumatakbo sa Termux (Android) o iba pang server environment
    const isTermux = (process.env.PREFIX && process.env.PREFIX.includes("termux")) || process.platform === "android";
    res.json({
        server: isTermux ? "phone" : "laptop"
    });
});

const upload = multer({
    dest: path.join(__dirname, "tmp")
});

app.post("/quick-deploy", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded."
      });
    }

    const zip = new AdmZip(req.file.path);

    zip.extractAllTo(__dirname, true);

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: "Deployment complete."
    });

    console.log("Quick Deploy completed.");

    setTimeout(() => process.exit(0), 1000);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ==========================================
// SQLITE DATABASE INITIALIZATION & SCHEMA
// ==========================================
const dbPath = path.join(__dirname, "database.sqlite");
const sqliteDb = new Database(dbPath);

sqliteDb.pragma("journal_mode = WAL");
sqliteDb.pragma("foreign_keys = ON");

// Direktang gagawin ang lahat ng kailangang tables sa database
sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'dashboard',
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
        project_year INTEGER NOT NULL,
        project_month INTEGER NOT NULL,
        row_index INTEGER NOT NULL,

        couple_name TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'PLANNED',
        progress INTEGER NOT NULL DEFAULT 0,
        type TEXT NOT NULL DEFAULT 'NOT SET',

        raw_files TEXT NOT NULL DEFAULT '',
        drone TEXT NOT NULL DEFAULT '',
        instruction TEXT NOT NULL DEFAULT '',
        concerns TEXT NOT NULL DEFAULT '',

        watch_link TEXT NOT NULL DEFAULT '',
        files_link TEXT NOT NULL DEFAULT '',

        song1_title TEXT NOT NULL DEFAULT '',
        song1_link TEXT NOT NULL DEFAULT '',
        song1_status TEXT NOT NULL DEFAULT '',
        song1_notes TEXT NOT NULL DEFAULT '',

        song2_title TEXT NOT NULL DEFAULT '',
        song2_link TEXT NOT NULL DEFAULT '',
        song2_status TEXT NOT NULL DEFAULT '',
        song2_notes TEXT NOT NULL DEFAULT '',

        song3_title TEXT NOT NULL DEFAULT '',
        song3_link TEXT NOT NULL DEFAULT '',
        song3_status TEXT NOT NULL DEFAULT '',
        song3_notes TEXT NOT NULL DEFAULT '',

        teaser_title TEXT NOT NULL DEFAULT '',
        teaser_link TEXT NOT NULL DEFAULT '',
        teaser_status TEXT NOT NULL DEFAULT '',
        teaser_notes TEXT NOT NULL DEFAULT '',

        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (
            project_year,
            project_month,
            row_index
        )
    );

    CREATE TABLE IF NOT EXISTS month_locks (
        project_year INTEGER NOT NULL,
        project_month INTEGER NOT NULL,
        locked INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

        PRIMARY KEY (
            project_year,
            project_month
        )
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT DEFAULT '',
        browser TEXT DEFAULT '',
        os TEXT DEFAULT '',
        device TEXT DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
`);

console.log("✔ Database tables (users, projects, month_locks, sessions, activity_logs) successfully verified/created.");

// ==========================================
// AUTO-SEED DEFAULT ACCOUNTS (Admin & Manager)
// ==========================================
try {
    const defaultAccounts = [
        { email: "adminyang@kbhfilms.com", password: "Yangyang#12", fullname: "Kim Bryan Hernandez", role: "admin" },
        { email: "yongzhi@kbhfilms.com", password: "yong2023", fullname: "Yong Zhi Ng", role: "Manager" }
    ];

    for (const acc of defaultAccounts) {
        const existingUser = sqliteDb.prepare("SELECT * FROM users WHERE email = ?").get(acc.email);
        
        if (!existingUser) {
            sqliteDb.prepare(`
                INSERT INTO users (fullname, email, password, role, active)
                VALUES (?, ?, ?, ?, 1)
            `).run(acc.fullname, acc.email, acc.password, acc.role);
            console.log(`✔ Created account for: ${acc.email}`);
        } else {
            sqliteDb.prepare(`
                UPDATE users 
                SET password = ?, fullname = ?, role = ?, active = 1 
                WHERE email = ?
            `).run(acc.password, acc.fullname, acc.role, acc.email);
            console.log(`✔ Verified/Updated account for: ${acc.email}`);
        }
    }
} catch (err) {
    console.error("⚠ Failed to seed default accounts:", err.message);
}

// ==========================================
// AUTO-BACKUP SYSTEM (Every 6 Hours)
// ==========================================
function runAutoBackup() {
    const backupDir = path.join(__dirname, 'BACKUP');
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const now = new Date();
    // Gamitin ang PH timezone offset kung kinakailangan o standard ISO date string
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupFileName = `backup-${dateStr}_${timeStr.substring(0, 5)}.json`;
    const backupFilePath = path.join(backupDir, backupFileName);

    try {
        const users = sqliteDb.prepare("SELECT * FROM users").all();
        const projects = sqliteDb.prepare("SELECT * FROM projects").all();

        const backupData = {
            version: "2.0",
            exportedAt: now.toISOString(),
            data: {
                users: users || [],
                projects: projects || []
            }
        };

        fs.writeFile(backupFilePath, JSON.stringify(backupData, null, 2), (writeErr) => {
            if (writeErr) {
                console.error("Failed to save auto-backup:", writeErr);
            } else {
                console.log(`[Auto-Backup] Successfully saved: ${backupFileName}`);
            }
        });
    } catch (err) {
        console.error("Auto-backup query error:", err.message);
    }
}

// Mag-run kada 6 na oras (6 hours * 60 minutes * 60 seconds * 1000 ms)
const SIX_HOURS = 6 * 60 * 60 * 1000;
setInterval(runAutoBackup, SIX_HOURS);

// Mag-run din 5 segundo pagka-start ng server para may agad na bagong backup
setTimeout(runAutoBackup, 5000);


// ==========================================
// CLOUDFLARE D1 COMPATIBILITY WRAPPER
// ==========================================
const createD1Context = (req, res) => ({
    request: {
        url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
        json: async () => req.body,
        headers: req.headers
    },
    env: {
        DB: {
            prepare: (sql) => {
                const stmt = sqliteDb.prepare(sql);
                return {
                    bind: (...params) => ({
                        all: async () => ({ results: stmt.all(...params) }),
                        run: async () => {
                            const info = stmt.run(...params);
                            return { meta: { changes: info.changes, lastInsertRowid: info.lastInsertRowid } };
                        },
                        first: async () => stmt.get(...params)
                    }),
                    all: async () => ({ results: stmt.all() }),
                    run: async () => {
                        const info = sqliteDb.prepare(sql).run();
                        return { meta: { changes: info.changes, lastInsertRowid: info.lastInsertRowid } };
                    },
                    first: async () => sqliteDb.prepare(sql).get()
                };
            },
            transaction: async (fn) => {
                const tx = sqliteDb.transaction(fn);
                return tx();
            }
        },
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || ""
    }
});

// ==========================================
// EXPRESS TO CLOUDFLARE RESPONSE BRIDGE
// ==========================================
const handleApiResponse = async (apiHandler, req, res) => {
    try {
        const context = createD1Context(req, res);
        const response = await apiHandler(context);
        
        res.status(response.status || 200);
        
        if (response.headers && typeof response.headers.forEach === 'function') {
            response.headers.forEach((value, key) => {
                res.setHeader(key, value);
            });
        }

        const contentType = response.headers?.get("Content-Type") || "";
        if (contentType.includes("application/json")) {
            const jsonText = await response.text();
            res.send(jsonText);
        } else {
            const arrayBuf = await response.arrayBuffer();
            res.send(Buffer.from(arrayBuf));
        }
    } catch (err) {
        console.error("[API BRIDGE ERROR]", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// LOAD ALL API MODULES
// ==========================================
const loginApi = require("./functions/api/login.js");
const projectsApi = require("./functions/api/projects.js");
const monthLockApi = require("./functions/api/month-lock.js");
const logsApi = require("./functions/api/logs.js");
const musicRecommendApi = require("./functions/api/music-recommend.js");
const backupApi = require("./functions/api/backup.js");
const restoreApi = require("./functions/api/restore.js");
const deleteAllApi = require("./functions/api/delete-all.js");
const resetMonthApi = require("./functions/api/reset-month.js");
const resetYearApi = require("./functions/api/reset-year.js");

// ==========================================
// API ROUTES MAPPING
// ==========================================
app.post("/api/login", (req, res) => handleApiResponse(loginApi.onRequestPost, req, res));

app.get("/api/projects", (req, res) => handleApiResponse(projectsApi.onRequestGet, req, res));
app.post("/api/projects", (req, res) => handleApiResponse(projectsApi.onRequestPost, req, res));

app.post("/api/month-lock", (req, res) => handleApiResponse(monthLockApi.onRequestPost, req, res));

app.get("/api/logs", (req, res) => handleApiResponse(logsApi.onRequestGet, req, res));
app.post("/api/logs", (req, res) => handleApiResponse(logsApi.onRequestPost, req, res));

app.post("/api/music-recommend", (req, res) => handleApiResponse(musicRecommendApi.onRequestPost, req, res));

app.get("/api/backup", (req, res) => handleApiResponse(backupApi.onRequestGet, req, res));
app.post("/api/restore", (req, res) => handleApiResponse(restoreApi.onRequestPost, req, res));
app.delete("/api/delete-all", (req, res) => handleApiResponse(deleteAllApi.onRequestDelete, req, res));

app.post("/api/reset-month", (req, res) => handleApiResponse(resetMonthApi.onRequestPost, req, res));
app.post("/api/reset-year", (req, res) => handleApiResponse(resetYearApi.onRequestPost, req, res));

// ==========================================
// HEALTH CHECK ENDPOINT
// ==========================================
app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        environment: "Node.js + Express + SQLite",
        timestamp: new Date().toISOString()
    });
});

// ==========================================
// SPA ROUTING FALLBACK
// ==========================================
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`✔ KBHFILMS Project Platform Server running at http://localhost:${PORT}`);
});