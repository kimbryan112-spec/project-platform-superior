// ==================================
// RESTORE API (Tugma sa iyong Backup JSON Format)
// POST /api/restore
// ==================================

export async function onRequestPost(context) {
    try {
        console.log("[RESTORE] Starting system restore from backup file...");

        const body = await context.request.json();
        let projectsToRestore = [];

        // Saluhin ang iba't ibang posibleng pormat ng backup file nang hindi ito binabago:
        if (Array.isArray(body)) {
            // 1. Kung direktang Array ang backup file mo (puro project objects)
            projectsToRestore = body;
        } else if (body && Array.isArray(body.projects)) {
            // 2. Kung naka-object na may .projects property
            projectsToRestore = body.projects;
        } else if (body && body.data) {
            // 3. Kung full system backup na may .data property
            if (Array.isArray(body.data.projects)) {
                projectsToRestore = body.data.projects;
            } else if (typeof body.data === "object") {
                for (const tableName of Object.keys(body.data)) {
                    const tableRows = body.data[tableName];
                    if (Array.isArray(tableRows)) {
                        const hasProjectFields = tableRows.some(r => r.project_year !== undefined || r.couple_name !== undefined);
                        if (hasProjectFields) {
                            projectsToRestore.push(...tableRows);
                        }
                    }
                }
            }
        } else if (body && typeof body === "object") {
            // 4. Kung naka-localStorage key-value map
            for (const key of Object.keys(body)) {
                if (key.startsWith("projects_")) {
                    try {
                        const parsed = typeof body[key] === "string" ? JSON.parse(body[key]) : body[key];
                        if (Array.isArray(parsed)) {
                            projectsToRestore.push(...parsed);
                        }
                    } catch (e) {}
                }
            }
        }

        if (projectsToRestore.length === 0) {
            return new Response(
                JSON.stringify({ success: false, message: "No valid project records found in the backup file." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const db = context.env.DB;

        // Isulat o i-update sa SQLite database ang bawat row gamit ang tamang column mapping
        for (const row of projectsToRestore) {
            const year = Number(row.project_year || row.year || 2026);
            const month = Number(row.project_month || row.month || 1);
            const rowIndex = Number(row.row_index || row.rowId || 1);

            await db.prepare(`
                INSERT INTO projects (
                    project_year, project_month, row_index,
                    couple_name, status, progress, type,
                    raw_files, drone, instruction, concerns, watch_link, files_link,
                    song1_title, song1_link, song1_status, song1_notes,
                    song2_title, song2_link, song2_status, song2_notes,
                    song3_title, song3_link, song3_status, song3_notes,
                    teaser_title, teaser_link, teaser_status, teaser_notes,
                    updated_at
                )
                VALUES (
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT(project_year, project_month, row_index)
                DO UPDATE SET
                    couple_name = excluded.couple_name,
                    status = excluded.status,
                    progress = excluded.progress,
                    type = excluded.type,
                    raw_files = excluded.raw_files,
                    drone = excluded.drone,
                    instruction = excluded.instruction,
                    concerns = excluded.concerns,
                    watch_link = excluded.watch_link,
                    files_link = excluded.files_link,
                    song1_title = excluded.song1_title,
                    song1_link = excluded.song1_link,
                    song1_status = excluded.song1_status,
                    song1_notes = excluded.song1_notes,
                    song2_title = excluded.song2_title,
                    song2_link = excluded.song2_link,
                    song2_status = excluded.song2_status,
                    song2_notes = excluded.song2_notes,
                    song3_title = excluded.song3_title,
                    song3_link = excluded.song3_link,
                    song3_status = excluded.song3_status,
                    song3_notes = excluded.song3_notes,
                    teaser_title = excluded.teaser_title,
                    teaser_link = excluded.teaser_link,
                    teaser_status = excluded.teaser_status,
                    teaser_notes = excluded.teaser_notes,
                    updated_at = CURRENT_TIMESTAMP
            `)
            .bind(
                year,
                month,
                rowIndex,
                row.couple_name || row.coupleName || "",
                row.status || "PLANNED",
                Number(row.progress || 0),
                row.type || "NOT SET",
                row.raw_files || row.rawFiles || "",
                row.drone || "",
                row.instruction || "",
                row.concerns || "",
                row.watch_link || row.watchLink || "",
                row.files_link || row.filesLink || "",
                
                row.song1_title || row.song1?.title || "",
                row.song1_link || row.song1?.link || "",
                row.song1_status || row.song1?.status || "",
                row.song1_notes || row.song1?.notes || "",
                
                row.song2_title || row.song2?.title || "",
                row.song2_link || row.song2?.link || "",
                row.song2_status || row.song2?.status || "",
                row.song2_notes || row.song2?.notes || "",
                
                row.song3_title || row.song3?.title || "",
                row.song3_link || row.song3?.link || "",
                row.song3_status || row.song3?.status || "",
                row.song3_notes || row.song3?.notes || "",
                
                row.teaser_title || row.teaserSong?.title || "",
                row.teaser_link || row.teaserSong?.link || "",
                row.teaser_status || row.teaserSong?.status || "",
                row.teaser_notes || row.teaserSong?.notes || ""
            )
            .run();
        }

        // Kunin ang updated hasDataMonths para mag-sync agad ang mga berdeng indicator sa UI (hal. sa October)
        const currentYear = 2026;
        const hasDataQuery = await db.prepare(`
            SELECT DISTINCT project_month
            FROM projects
            WHERE project_year = ?
              AND (
                    TRIM(COALESCE(couple_name,'')) <> ''
                 OR TRIM(COALESCE(raw_files,'')) <> ''
              )
        `).bind(currentYear).all();

        const monthNames = ["", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const hasDataMonths = {};
        
        if (hasDataQuery && hasDataQuery.results) {
            hasDataQuery.results.forEach(item => {
                const mName = monthNames[item.project_month];
                if (mName) hasDataMonths[mName] = true;
            });
        }

        console.log(`[RESTORE] Successfully restored ${projectsToRestore.length} records.`);

        return new Response(
            JSON.stringify({
                success: true,
                message: "Database restored successfully!",
                hasDataMonths
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("[RESTORE ERROR]:", err);
        return new Response(
            JSON.stringify({ success: false, message: err.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

export default {
    onRequestPost
};