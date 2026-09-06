const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('database.sqlite');

try {
    console.log("📂 Binabasa ang projects_export.json...");
    const rawData = fs.readFileSync('projects_export.json', 'utf8');
    const projects = JSON.parse(rawData);

    if (!Array.isArray(projects) || projects.length === 0) {
        console.log("⚠️ Walang nakitang data o hindi array ang laman ng JSON.");
        return;
    }

    let totalImported = 0;
    db.pragma('foreign_keys = OFF');

    const insertStmt = db.prepare(`
        INSERT INTO projects (
            project_year, project_month, row_index, couple_name, status, progress, type,
            raw_files, drone, instruction, concerns, watch_link, files_link,
            song1_title, song1_link, song1_status, song1_notes,
            song2_title, song2_link, song2_status, song2_notes,
            song3_title, song3_link, song3_status, song3_notes,
            teaser_title, teaser_link, teaser_status, teaser_notes
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?
        )
    `);

    // Linisin muna o i-insert gamit ang transaction para mabilis at safe
    const insertMany = db.transaction((rows) => {
        for (const proj of rows) {
            insertStmt.run(
                Number(proj.project_year || 2026),
                Number(proj.project_month || 1),
                Number(proj.row_index || 1),
                proj.couple_name || "",
                proj.status || "PLANNED",
                Number(proj.progress || 0),
                proj.type || "NOT SET",
                proj.raw_files || "",
                proj.drone || "NO DRONE",
                proj.instruction || "",
                proj.concerns || "",
                proj.watch_link || "",
                proj.files_link || "",
                proj.song1_title || "",
                proj.song1_link || "",
                proj.song1_status || "",
                proj.song1_notes || "",
                proj.song2_title || "",
                proj.song2_link || "",
                proj.song2_status || "",
                proj.song2_notes || "",
                proj.song3_title || "",
                proj.song3_link || "",
                proj.song3_status || "",
                proj.song3_notes || "",
                proj.teaser_title || "",
                proj.teaser_link || "",
                proj.teaser_status || "",
                proj.teaser_notes || ""
            );
            totalImported++;
        }
    });

    insertMany(projects);

    db.pragma('foreign_keys = ON');
    console.log(`\n🎉 Tagumpay! Naipasok ang kabuuang ${totalImported} projects sa database.sqlite.`);

} catch (err) {
    console.error("❌ May error sa pag-import:", err.message);
} finally {
    db.close();
}