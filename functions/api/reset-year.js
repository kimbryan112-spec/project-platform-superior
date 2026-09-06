/* ==================================
    RESET YEAR API
    POST /api/reset-year
================================== */

export async function onRequestPost(context) {
    try {
        const { year } = await context.request.json();

        console.log(`[RESET YEAR] ${year}`);

        const result = await context.env.DB.prepare(`
            DELETE FROM projects
            WHERE project_year = ?
        `)
        .bind(
            Number(year)
        )
        .run();

        // Para ma-clear din ang lahat ng buwan na naka-lock sa taon na ito:
        await context.env.DB.prepare(`
            DELETE FROM month_locks
            WHERE project_year = ?
        `)
        .bind(
            Number(year)
        )
        .run();

        // Dahil ni-reset ang buong taon, walang natirang buwan na may data
        const hasDataMonths = {};

        return new Response(
            JSON.stringify({
                success: true,
                message: `Year ${year} reset successfully.`,
                deleted: result.meta?.changes || 0,
                hasDataMonths: hasDataMonths // <--- Ipinapasa pabalik para ma-clear agad ang green indicators sa frontend
            }),
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    }
    catch (err) {
        console.error("[RESET YEAR]", err);

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