// ==================================
// DYNAMIC RESTORE API (Cloudflare D1)
// POST /api/restore
// ==================================

export async function onRequestPost(context) {
    try {
        console.log("[RESTORE] Starting system restore...");

        const backupData = await context.request.json();

        if (!backupData || typeof backupData !== "object") {
            return new Response(
                JSON.stringify({ success: false, message: "Invalid backup file format." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const db = context.env.DB;

        // 1. Kung ito ay galing sa localStorage backup object map (key-value)
        const keys = Object.keys(backupData);
        
        for (const key of keys) {
            if (key.startsWith("projects_")) {
                const parts = key.replace("projects_", "").split("_");
                const year = parts[0];
                const monthStr = parts[1];
                const monthNum = {
                    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
                    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
                }[monthStr];

                if (year && monthNum) {
                    let rawVal = backupData[key];
                    const projects = typeof rawVal === "string" ? JSON.parse(rawVal) : rawVal;

                    if (Array.isArray(projects)) {
                        for (const proj of projects) {
                            const rowId = proj.rowId || 1;
                            await db.prepare(`
                                INSERT INTO projects (year, month, rowId, data_json) 
                                VALUES (?, ?, ?, ?)
                                ON CONFLICT(year, month, rowId) 
                                DO UPDATE SET data_json = excluded.data_json
                            `).bind(String(year), Number(monthNum), Number(rowId), JSON.stringify(proj)).run();
                        }
                    }
                }
            }
        }

        // 2. Kunin ang updated hasDataMonths para sa kasalukuyang taon (2026) para sa UI sync
        const currentYear = "2026";
        const { results: allRows } = await db.prepare(`
            SELECT month, data_json FROM projects WHERE year = ?
        `).bind(currentYear).all();

        const monthNamesArr = ["", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const hasDataMonths = {};

        if (allRows) {
            allRows.forEach(row => {
                const mStr = monthNamesArr[row.month];
                if (mStr) {
                    try {
                        const parsed = JSON.parse(row.data_json || "[]");
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            hasDataMonths[mStr] = true;
                        }
                    } catch (e) {
                        hasDataMonths[mStr] = true;
                    }
                }
            });
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Database restored successfully!",
                hasDataMonths: hasDataMonths
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("[RESTORE] Error:", err);
        return new Response(
            JSON.stringify({ success: false, message: err.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

export default {
    onRequestPost
};