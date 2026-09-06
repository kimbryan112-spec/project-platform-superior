export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        
        let body = {};
        try {
            body = await request.json();
        } catch (e) {
            // Kung sakaling hindi valid o walang laman ang JSON body
            body = {};
        }
        
        const { user_name, action, details, browser, os, device } = body;

        if (!env.DB) {
            return new Response(JSON.stringify({ error: "Database not connected" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        await env.DB.prepare(`
            INSERT INTO activity_logs (user_name, action, details, browser, os, device)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            user_name || "Admin/User",
            action || "Unknown Action",
            details || "",
            browser || "Unknown Browser",
            os || "Unknown OS",
            device || "Desktop"
        ).run();

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestGet(context) {
    try {
        const { env } = context;

        if (!env.DB) {
            return new Response(JSON.stringify({ error: "Database not connected" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Kunin ang huling 50 logs nang mabilis at episyente
        const { results } = await env.DB.prepare(`
            SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 50
        `).all();

        return new Response(JSON.stringify({ logs: results || [] }), {
            status: 200,
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-store, no-cache, must-revalidate"
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}