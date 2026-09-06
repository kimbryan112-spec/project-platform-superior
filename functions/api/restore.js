// ==================================
// DYNAMIC RESTORE API (All Tables)
// POST /api/restore
// ==================================

export async function onRequestPost(context) {
    try {
        console.log("[RESTORE] Starting full system restore...");

        const backup = await context.request.json();

        // 1. Tanggapin kahit anong valid backup format (mapa-table data man o localStorage backup)
        const tablesData = backup.data || backup;

        if (!tablesData || typeof tablesData !== "object") {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: "Invalid backup file format."
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        const tableNames = Object.keys(tablesData);

        // 2. I-off muna ang foreign key checks para maiwasan ang conflict
        await context.env.DB.prepare(`PRAGMA foreign_keys = OFF;`).run();

        // 3. Linisin ang mga lumang laman ng bawat table kung ito ay database tables
        for (const tableName of tableNames) {
            if (!tableName.startsWith("projects_") && !tableName.startsWith("kb_")) {
                try {
                    await context.env.DB.prepare(`DELETE FROM "${tableName}";`).run();
                } catch (e) {
                    // Ignore kung sakaling localStorage key format ang nasa JSON
                }
            }
        }

        // 4. I-insert pabalik ang mga records
        for (const tableName of tableNames) {
            const rows = tablesData[tableName];
            
            // Kung ito ay database table na may array ng rows
            if (Array.isArray(rows) && rows.length > 0) {
                for (const row of rows) {
                    const columns = Object.keys(row);
                    const values = Object.values(row);
                    
                    const placeholders = columns.map(() => "?").join(", ");
                    const quotedColumns = columns.map(col => `"${col}"`).join(", ");

                    const query = `INSERT INTO "${tableName}" (${quotedColumns}) VALUES (${placeholders})`;
                    
                    await context.env.DB.prepare(query).bind(...values).run();
                }
                console.log(`[RESTORE] Restored ${rows.length} record(s) to table: ${tableName}`);
            }
        }

        // 5. I-on ulit ang foreign keys
        await context.env.DB.prepare(`PRAGMA foreign_keys = ON;`).run();

        // 6. Kunin ang updated hasDataMonths para sa kasalukuyang taon para sa UI sync
        const currentYear = new Date().getFullYear();
        const projectsQuery = await context.env.DB.prepare(`
            SELECT DISTINCT project_month FROM projects WHERE project_year = ?
        `).bind(Number(currentYear)).all();

        const monthNamesArr = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const hasDataMonths = {};
        if (projectsQuery && projectsQuery.results) {
            projectsQuery.results.forEach(row => {
                const mStr = monthNamesArr[row.project_month - 1];
                if (mStr) {
                    hasDataMonths[mStr] = true;
                }
            });
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Full system restored successfully.",
                hasDataMonths: hasDataMonths // <--- Ipinapasa pabalik para mag-update agad ang mga kulay!
            }),
            {
                headers: { "Content-Type": "application/json" }
            }
        );

    }
    catch (err) {
        console.error("[RESTORE] Error:", err);

        try {
            await context.env.DB.prepare(`PRAGMA foreign_keys = ON;`).run();
        } catch (e) {}

        return new Response(
            JSON.stringify({
                success: false,
                message: err.message
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
}

export default {
    onRequestPost
};