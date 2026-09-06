export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
        const month = Number(url.searchParams.get("month")) || (new Date().getMonth() + 1);

        console.log(`[GET] ${year}-${month}`);

        // 1. Kunin ang projects para sa kasalukuyang buwan
        const projectsQuery = context.env.DB.prepare(`
            SELECT *
            FROM projects
            WHERE project_year = ?
              AND project_month = ?
            ORDER BY row_index ASC
        `).bind(year, month);

        // 2. Kunin ang locked months
        const locksQuery = context.env.DB.prepare(`
            SELECT project_year, project_month, locked
            FROM month_locks
            WHERE locked = 1
        `);

        // 3. Optimal check para sa hasDataMonths
        const hasDataQuery = context.env.DB.prepare(`
            SELECT DISTINCT project_month
            FROM projects
            WHERE project_year = ?
              AND (
                    TRIM(COALESCE(couple_name,'')) <> ''
                 OR TRIM(COALESCE(raw_files,'')) <> ''
              )
        `).bind(year);

        // Isagawa nang sabay-sabay (Parallel Execution) para mabawasan ang latency at DB overhead
        const [projectsResult, locksResult, hasDataResult] = await Promise.all([
            projectsQuery.all(),
            locksQuery.all(),
            hasDataQuery.all()
        ]);

        const results = projectsResult.results || [];
        const lockRows = locksResult.results || [];
        const hasDataRows = hasDataResult.results || [];

        const monthLocks = {};
        const monthNames = {
            1: "jan", 2: "feb", 3: "mar", 4: "apr",
            5: "may", 6: "jun", 7: "jul", 8: "aug",
            9: "sep", 10: "oct", 11: "nov", 12: "dec"
        };

        lockRows.forEach(row => {
            const monthName = monthNames[row.project_month];
            if (monthName) {
                monthLocks[`${row.project_year}_${monthName}`] = true;
            }
        });

        const hasDataMonths = {};
        hasDataRows.forEach(row => {
            const monthName = monthNames[row.project_month];
            if (monthName) {
                hasDataMonths[monthName] = true;
            }
        });

        const data = results.map(row => ({
            rowId: row.row_index,
            coupleName: row.couple_name || "",
            status: row.status || "PLANNED",
            progress: row.progress || 0,
            type: row.type || "NOT SET",
            rawFiles: row.raw_files || "",
            drone: row.drone || "",
            instruction: row.instruction || "",
            concerns: row.concerns || "",
            watchLink: row.watch_link || "",
            filesLink: row.files_link || "",

            song1: {
                title: row.song1_title || "",
                link: row.song1_link || "",
                status: row.song1_status || "",
                notes: row.song1_notes || ""
            },
            song2: {
                title: row.song2_title || "",
                link: row.song2_link || "",
                status: row.song2_status || "",
                notes: row.song2_notes || ""
            },
            song3: {
                title: row.song3_title || "",
                link: row.song3_link || "",
                status: row.song3_status || "",
                notes: row.song3_notes || ""
            },
            teaserSong: {
                title: row.teaser_title || "",
                link: row.teaser_link || "",
                status: row.teaser_status || "",
                notes: row.teaser_notes || ""
            },

            monthLocked: monthLocks[`${year}_${monthNames[month]}`] || false
        }));

        return new Response(
            JSON.stringify({
                projects: data,
                lockedMonths: monthLocks,
                hasDataMonths
            }),
            {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "private, max-age=10"
                }
            }
        );

    } catch (err) {
        console.error(err);
        return new Response(
            JSON.stringify({
                success: false,
                message: err.message,
                stack: err.stack
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
}

export async function onRequestPost(context) {
    try {
        const url = new URL(context.request.url);
        const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
        const month = Number(url.searchParams.get("month")) || (new Date().getMonth() + 1);

        const projects = await context.request.json();

        console.log(`[POST] Saving ${projects.length} row(s) for ${year}-${month}`);

        for (const row of projects) {
            await context.env.DB.prepare(`
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
                row.rowId,
                row.coupleName || "",
                row.status || "PLANNED",
                row.progress || 0,
                row.type || "NOT SET",
                row.rawFiles || "",
                row.drone || "",
                row.instruction || "",
                row.concerns || "",
                row.watchLink || "",
                row.filesLink || "",
                row.song1?.title || "",
                row.song1?.link || "",
                row.song1?.status || "",
                row.song1?.notes || "",
                row.song2?.title || "",
                row.song2?.link || "",
                row.song2?.status || "",
                row.song2?.notes || "",
                row.song3?.title || "",
                row.song3?.link || "",
                row.song3?.status || "",
                row.song3?.notes || "",
                row.teaserSong?.title || "",
                row.teaserSong?.link || "",
                row.teaserSong?.status || "",
                row.teaserSong?.notes || ""
            )
            .run();
        }

        return new Response(
            JSON.stringify({ success: true }),
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    } catch (err) {
        console.error("[API-POST ERROR]");
        console.error(err);
        console.error(err.stack);

        return new Response(
            JSON.stringify({
                success: false,
                message: err.message,
                stack: err.stack
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
}

export default {
    onRequestGet,
    onRequestPost
};