/* ==================================
    RESET MONTH API
    POST /api/reset-month
================================== */

export async function onRequestPost(context) {
    try {
        const { month, year } = await context.request.json();

        console.log(`[RESET MONTH] ${month}/${year}`);

        // Tanggapin ang month kahit number o string man yan (hal: "jan" o 1)
        let monthNum = month;
        const monthNamesArr = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        
        if (isNaN(month)) {
            monthNum = monthNamesArr.indexOf(month.toLowerCase()) + 1;
        }

        const result = await context.env.DB.prepare(`
            DELETE FROM projects
            WHERE project_year = ?
              AND project_month = ?
        `)
        .bind(
            Number(year),
            Number(monthNum)
        )
        .run();

        // Linisin din ang lock status ng buwang ito
        await context.env.DB.prepare(`
            DELETE FROM month_locks
            WHERE project_year = ?
              AND project_month = ?
        `)
        .bind(
            Number(year),
            Number(monthNum)
        )
        .run();

        // KUHAIN ANG BAGONG HAS-DATA MONTHS PARA SA TAON NA ITO
        const projectsQuery = await context.env.DB.prepare(`
            SELECT DISTINCT project_month FROM projects WHERE project_year = ?
        `).bind(Number(year)).all();

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
                message: `Month ${month}/${year} reset successfully.`,
                deleted: result.meta?.changes || 0,
                hasDataMonths: hasDataMonths // <--- Ipinapasa na natin pabalik sa frontend ang updated status!
            }),
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    }
    catch (err) {
        console.error("[RESET MONTH]", err);

        return new Response(
            JSON.stringify({
                success: false,
                message: err.message
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
    onRequestPost
};