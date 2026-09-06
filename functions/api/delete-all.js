/* ==================================
    DELETE ALL API
    POST /api/delete-all (Suportado rin ang DELETE method kung kailangan)
================================== */

async function handleDeletion(context) {
    try {
        console.log("[DELETE ALL] Clearing database...");

        // 1. Burahin ang lahat ng projects
        const resultProjects = await context.env.DB.prepare(`
            DELETE FROM projects
        `).run();

        // 2. Burahin din ang lahat ng month locks para total reset
        try {
            await context.env.DB.prepare(`
                DELETE FROM month_locks
            `).run();
        } catch (e) {
            // Ignored kung walang month_locks table pa
        }

        // 3. Walang matitirang buwan na may data dahil binura lahat
        const hasDataMonths = {};

        return new Response(
            JSON.stringify({
                success: true,
                message: "Database cleared successfully.",
                deleted: resultProjects.meta?.changes || 0,
                hasDataMonths: hasDataMonths // <--- Ipinapasa pabalik para ma-clear agad ang mga kulay sa UI!
            }),
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
    catch (err) {
        console.error("[DELETE ALL]", err);

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

export async function onRequestPost(context) {
    return handleDeletion(context);
}

export async function onRequestDelete(context) {
    return handleDeletion(context);
}

export default {
    onRequestPost,
    onRequestDelete
};