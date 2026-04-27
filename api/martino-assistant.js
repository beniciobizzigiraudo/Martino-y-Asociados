function getFallbackReply(message) {
  const t = String(message || "").toLowerCase();

  if (t.includes("car") || t.includes("stock") || t.includes("available") || t.includes("vehicle")) {
    return "We currently have six vehicles available: VW Vento 2021, Toyota Corolla 2020, Chevrolet Cruze 2019, Ford Ranger 2018, Renault Duster 2022, and Peugeot 208 2023. If you want, ask me for details about any specific model.";
  }

  if (t.includes("finance") || t.includes("payment") || t.includes("credit")) {
    return "Yes, financing is available on all vehicles. For a tailored quote, please contact Automotores Martino at automotoresmartino@gmail.com or Instagram @martinondmotors.";
  }

  if (t.includes("part") || t.includes("spare") || t.includes("filter") || t.includes("brake") || t.includes("battery")) {
    return "We also handle spare parts, including filters, brake parts, batteries, tires, shocks, timing belts, and more. Tell me which part or model you need and I can guide you.";
  }

  if (t.includes("contact") || t.includes("email") || t.includes("instagram") || t.includes("phone")) {
    return "You can contact Automotores Martino by email at automotoresmartino@gmail.com or on Instagram at @martinondmotors.";
  }

  return "I can help with vehicle availability, financing, spare parts, and contact details. Ask me about a model, a budget range, or the kind of vehicle you need.";
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  const parsedBody =
    typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};

  const message = String(parsedBody.message || "").trim();
  const history = Array.isArray(parsedBody.history) ? parsedBody.history : [];

  if (!message) {
    return response.status(400).json({ error: "Message is required" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(200).json({ reply: getFallbackReply(message), source: "fallback" });
  }

  const sanitizedHistory = history
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: String(item.text || "").slice(0, 1200)
    }));

  const systemPrompt =
    "You are the website assistant for Automotores Martino, a trusted car dealership in Cordoba, Argentina. " +
    "Always reply in English. Keep replies concise, practical, and sales-oriented without sounding pushy. " +
    "Only mention inventory, financing, spare parts, and contact details provided here. " +
    "Current inventory: VW Vento 2021 1.4 TSI 150 CV automatic 38,000 km ARS 17,500,000; Toyota Corolla 2020 1.8 Hybrid 122 CV CVT 52,000 km ARS 19,800,000; Chevrolet Cruze 2019 1.4 Turbo 153 CV manual 67,000 km ARS 12,500,000; Ford Ranger 2018 3.2 TDCi 200 CV diesel manual 88,000 km ARS 18,200,000; Renault Duster 2022 1.6 114 CV manual 25,000 km ARS 15,900,000; Peugeot 208 2023 1.2 PureTech 100 CV manual 12,000 km ARS 14,700,000. " +
    "Spare parts available include spark plugs, rims, cylinders, brake discs, shock absorbers, oil filters, air filters, batteries, all-terrain tires, brake pads, rear springs, and timing belts. " +
    "Contact email: automotoresmartino@gmail.com. Instagram: @martinondmotors. Financing is available on all vehicles. " +
    "If something is unknown, say so briefly and invite the user to contact the dealership.";

  try {
    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
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

    if (!apiResponse.ok) {
      return response.status(200).json({ reply: getFallbackReply(message), source: "fallback" });
    }

    const data = await apiResponse.json();
    return response.status(200).json({
      reply: data.output_text || getFallbackReply(message),
      source: "openai"
    });
  } catch (error) {
    return response.status(200).json({ reply: getFallbackReply(message), source: "fallback" });
  }
};
