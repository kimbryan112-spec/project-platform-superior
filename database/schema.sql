-- =========================
-- USERS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'dashboard',
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- PROJECTS TABLE
-- =========================
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

-- =========================
-- MONTH LOCKS TABLE
-- =========================
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

-- =========================
-- SESSIONS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);