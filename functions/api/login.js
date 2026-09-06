/* ==================================
   LOGIN API (Bulletproof Auto-Provision)
   POST /api/login
================================== */

export async function onRequestPost(context) {
    try {
        let body = {};
        try {
            body = await context.request.json();
        } catch (e) {
            body = {};
        }

        const email = (body.email || "").trim().toLowerCase();
        const password = body.password || "";

        if (!email || !password) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: "Email and password are required."
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        const db = context.env.DB;

        // BULLETPROOF SAFEGUARD: Awtomatikong i-register o i-update ang default accounts kung wala pa
        if (email === "adminyang@kbhfilms.com") {
            const existing = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
            if (!existing) {
                await db.prepare(`
                    INSERT INTO users (fullname, email, password, role, active)
                    VALUES (?, ?, ?, 'admin', 1)
                `).bind("Kim Bryan Hernandez", email, "Yangyang#12").run();
            }
        } else if (email === "yongzhi@kbhfilms.com") {
            const existing = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
            if (!existing) {
                await db.prepare(`
                    INSERT INTO users (fullname, email, password, role, active)
                    VALUES (?, ?, ?, 'Manager', 1)
                `).bind("Yong Zhi Ng", email, "yong2023").run();
            }
        }

        // Hanapin ang user sa database
        const user = await db.prepare(`
            SELECT
                id,
                fullname,
                email,
                password,
                role,
                active
            FROM users
            WHERE email = ?
            LIMIT 1
        `)
        .bind(email)
        .first();

        if (!user) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: "Invalid email or password."
                }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        if (user.active === 0) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: "Account is disabled."
                }),
                {
                    status: 403,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        // Suriin ang password (may fallback para sa default accounts)
        let passwordMatch = (user.password === password);
        if (!passwordMatch) {
            if (email === "adminyang@kbhfilms.com" && password === "Yangyang#12") passwordMatch = true;
            if (email === "yongzhi@kbhfilms.com" && password === "yong2023") passwordMatch = true;
        }

        if (!passwordMatch) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: "Invalid email or password."
                }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        const sessionId = crypto.randomUUID ? crypto.randomUUID() : ('sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36));
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await db.prepare(`
            INSERT INTO sessions (
                id,
                user_id,
                expires_at
            )
            VALUES (?, ?, ?)
        `)
        .bind(
            sessionId,
            user.id,
            expiresAt
        )
        .run();

        const response = new Response(
            JSON.stringify({
                success: true,
                message: "Login successful",
                user: {
                    id: user.id,
                    fullname: user.fullname,
                    email: user.email,
                    role: user.role
                }
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" }
            }
        );

        const isSecure = context.request.url && context.request.url.startsWith("https");
        const secureFlag = isSecure ? "; Secure" : "";

        response.headers.append(
            "Set-Cookie",
            `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax${secureFlag}; Max-Age=604800`
        );

        return response;

    } catch (err) {
        console.error("[LOGIN ERROR]", err);

        return new Response(
            JSON.stringify({
                success: false,
                message: err.message || "Internal Server Error"
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