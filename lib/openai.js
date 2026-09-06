export async function askOpenAI(prompt, apiKey) {
    const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // O ang tamang production model na gagamitin mo
                messages: [
                    {
                        role: "system",
                        content: "You are the AI Music Director of KBHFILMS. Return ONLY valid JSON."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7
            })
        }
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
}