
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Use POST." })
    };
  }

  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  try {
    const { message, accessCode } = JSON.parse(event.body || "{}");

    if (
      !process.env.OPENROUTER_API_KEY ||
      !process.env.KRYSTAL_ACCESS_CODE
    ) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Krystal's server settings are incomplete."
        })
      };
    }

    if (
      typeof accessCode !== "string" ||
      accessCode !== process.env.KRYSTAL_ACCESS_CODE
    ) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Incorrect access code." })
      };
    }

    if (typeof message !== "string" || !message.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Enter a message." })
      };
    }

    if (message.length > 4000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Message is too long." })
      };
    }

    const result = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "X-Title": "Krystal AI"
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3.5-super-vl:free",
          messages: [
            {
              role: "system",
              content: "You are Krystal, a personal AI assistant. "
                + "Be helpful, natural, warm, clear, and conversational. "
                + "Your personality will be customized by your creator. "
                + "Never claim to have memories or abilities you do not have."
            },
            { role: "user", content: message.trim() }
          ],
          max_tokens: 700
        })
      }
    );

    const data = await result.json();

    if (!result.ok) {
      console.error("OpenRouter error:", result.status);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: result.status === 429
            ? "The model is busy or its free limit was reached."
            : "The AI provider returned an error. Check the model and API settings."
        })
      };
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "The AI returned no reply." })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    console.error("Krystal function error:", error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Something went wrong on the server." })
    };
  }
};
