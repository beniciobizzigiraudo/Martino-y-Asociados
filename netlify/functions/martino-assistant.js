exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing OPENAI_API_KEY" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const message = String(body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Message is required" })
      };
    }

    const sanitizedHistory = history
      .filter((item) => item && (item.role === "user" || item.role === "assistant"))
      .slice(-8)
      .map((item) => ({
        role: item.role,
        content: String(item.text || "").slice(0, 1200)
      }));

    const inventorySummary = [
      "VW Vento 2021, 1.4 TSI 150 CV, automatic, 38,000 km, ARS 17,500,000",
      "Toyota Corolla 2020, 1.8 Hybrid 122 CV, CVT, 52,000 km, ARS 19,800,000",
      "Chevrolet Cruze 2019, 1.4 Turbo 153 CV, manual, 67,000 km, ARS 12,500,000",
      "Ford Ranger 2018, 3.2 TDCi 200 CV, diesel, manual, 88,000 km, ARS 18,200,000",
      "Renault Duster 2022, 1.6 114 CV, manual, 25,000 km, ARS 15,900,000",
      "Peugeot 208 2023, 1.2 PureTech 100 CV, manual, 12,000 km, ARS 14,700,000"
    ].join("; ");

    const systemPrompt =
      "You are the website assistant for Automotores Martino, a trusted car dealership in Cordoba, Argentina. " +
      "Always reply in English. Keep replies concise, practical, and sales-oriented without sounding pushy. " +
      "Only mention inventory, financing, spare parts, and contact details that are provided here. " +
      "If a user asks something you do not know, say so briefly and invite them to contact the dealership. " +
      "Current inventory: " + inventorySummary + ". " +
      "Spare parts available include spark plugs, rims, cylinders, brake discs, shock absorbers, oil filters, air filters, batteries, all-terrain tires, brake pads, rear springs, and timing belts. " +
      "Contact email: automotoresmartino@gmail.com. Instagram: @martinondmotors. Financing is available on all vehicles.";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
        instructions: systemPrompt,
        input: [
          ...sanitizedHistory,
          { role: "user", content: message.slice(0, 2000) }
        ],
        text: { format: { type: "text" } },
        store: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "OpenAI request failed", details: errorText })
      };
    }

    const data = await response.json();
    const reply = data.output_text || "I'm sorry, I couldn't generate a reply right now.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unexpected server error" })
    };
  }
};
