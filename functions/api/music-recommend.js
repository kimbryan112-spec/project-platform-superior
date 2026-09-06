import { askOpenAI } from "../../lib/openai.js"; // <-- Ayusin ang path at idagdag ang .js extension

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const project = await request.json();

        console.log("[AI MUSIC DIRECTOR REQUEST]", project);

        // Suriin kung naka-set ang OpenAI API key sa Cloudflare Environment Variables
        const apiKey = env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY is not configured in Cloudflare environment variables.");
        }

        // Verified Musicbed Catalog Database
        const musicbedCatalog = [
            { title: "Bloom", artist: "The Light The Heat", mood: "Romantic", url: "https://www.musicbed.com/songs/bloom-the-light-the-heat/28451" },
            { title: "Forever", artist: "Leif Vollebekk", mood: "Emotional", url: "https://www.musicbed.com/songs/forever-leif-vollebekk/15234" },
            { title: "Golden Sky", artist: "Salt Of The Sound", mood: "Cinematic", url: "https://www.musicbed.com/songs/golden-sky-salt-of-the-sound/19821" },
            { title: "Home", artist: "Tony Anderson", mood: "Luxury", url: "https://www.musicbed.com/songs/home-tony-anderson/10492" },
            { title: "Anchor", artist: "Ryan Taubert", mood: "Elegant", url: "https://www.musicbed.com/songs/anchor-ryan-taubert/11203" },
            { title: "Rise", artist: "The Hunts", mood: "Happy", url: "https://www.musicbed.com/songs/rise-the-hunts/14892" },
            { title: "Wildflower", artist: "The Gray Havens", mood: "Romantic", url: "https://www.musicbed.com/songs/wildflower-the-gray-havens/22104" }
        ];

        // Advanced Prompt para sa AI Music Director
        const prompt = `
You are the Head Music Director of KBHFILMS.
Your job is to recommend cinematic Musicbed songs for professional wedding films.

Wedding Information:
- Couple: ${project.coupleName || "Not Specified"}
- Wedding Type: ${project.type || "Not Specified"}
- Current Status: ${project.status || "Planned"}
- Instructions: ${project.instruction || "None"}
- Concerns: ${project.concerns || "None"}
- Drone: ${project.drone || "NO DRONE"}
- Raw Files: ${project.rawFiles || "None"}

Requirements:
Recommend EXACTLY 5 songs.
For each recommendation provide:
- title
- artist
- mood
- energy (Slow, Medium, or Epic)
- scene (e.g., Preparation, Ceremony, Drone, Reception, Outro)
- reason (why it fits)
- confidence (Confidence Score between 1 to 100)

Return ONLY a valid JSON object with this exact structure:
{
  "analysis": {
    "style": "Luxury Emotional",
    "editingStyle": "Slow Cinematic",
    "drone": ${project.drone !== "NO DRONE"},
    "notes": "Custom tailored notes based on instructions."
  },
  "songs": [
    {
      "title": "Bloom",
      "artist": "The Light The Heat",
      "mood": "Romantic",
      "energy": "Medium",
      "scene": "Preparation",
      "reason": "Soft build-up ideal for bridal prep.",
      "confidence": 98
    }
  ],
  "whyText": "Overall explanation of why these songs fit the wedding narrative."
}
`;

        // Tawagin ang askOpenAI helper function
        const aiResult = await askOpenAI(prompt, apiKey) || {};

        const analysisData = aiResult.analysis || {};
        const rawSongs = Array.isArray(aiResult.songs) ? aiResult.songs : [];

        // I-verify at i-attach ang totoong Musicbed URL mula sa Catalog o fallback link
        const verifiedSongs = rawSongs.map((song) => {
            const foundInCatalog = musicbedCatalog.find(
                cat => cat.title.toLowerCase() === (song.title || "").toLowerCase()
            );

            return {
                title: song.title || "Untitled",
                artist: song.artist || "Unknown Artist",
                mood: song.mood || "Cinematic",
                energy: song.energy || "Medium",
                scene: song.scene || "Highlight",
                reason: song.reason || "Matched with wedding production style.",
                confidence: song.confidence || 95,
                url: foundInCatalog ? foundInCatalog.url : "https://www.musicbed.com"
            };
        });

        // Bumuo ng badges para sa UI analysis section
        const analysisBadges = [
            `✔ ${analysisData.style || project.type || "Cinematic Wedding"}`,
            `✔ Editing: ${analysisData.editingStyle || "Professional"}`,
            project.drone !== "NO DRONE" ? `✔ Drone: ${project.drone}` : "✔ Standard Coverage",
            project.instruction ? "✔ Custom Instructions Applied" : "✔ Standard Flow"
        ];

        return new Response(
            JSON.stringify({
                success: true,
                analysis: analysisBadges,
                songs: verifiedSongs,
                whyText: aiResult.whyText || `Curated specifically for ${project.coupleName || "this project"} matching professional wedding standards.`
            }),
            {
                headers: { 
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store"
                }
            }
        );

    } catch (err) {
        console.error("[AI MUSIC ERROR]", err);
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