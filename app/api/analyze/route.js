export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: { message: "ANTHROPIC_API_KEY não configurada no servidor." } },
      { status: 500 }
    );
  }

  const body = await req.json();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: body.messages,
    }),
  });

  const data = await response.json();
  return Response.json(data, { status: response.status });
}
