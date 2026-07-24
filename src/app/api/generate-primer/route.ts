import Anthropic from "@anthropic-ai/sdk";
import { isAdmin } from "@/lib/session";

// Generation with a large document can take a while on serverless.
export const maxDuration = 60;

// Vercel serverless caps request bodies at ~4.5 MB.
const MAX_FILE_BYTES = 4 * 1024 * 1024;

const SYSTEM_PROMPT = `You are writing an "idea primer" for AI Fund, a venture studio. The primer is shown to senior engineers (EIR candidates) on their phones at a recruiting event, right before an open discussion of the idea. You will be given source material: a document, deck text, rough notes, or the transcript of a founder's voice note.

Rules:
- High-level and directional, not a spec or business plan. The goal is to spark discussion, not to answer every question.
- Concise: 150-300 words total. Phone-readable: short paragraphs, punchy bullets.
- Structure (Markdown):

# <Idea name — short and memorable>

**One-liner:** <a single compelling sentence>

## The problem

## Why now

## Open questions for you

- "Open questions for you" must contain 2-4 genuine questions inviting the engineers' opinions — pull real uncertainties from the source material where you can.
- Do NOT include implementation roadmaps, feature lists, timelines, financial projections, or any "what we'd build first" section.
- Stay faithful to the source. Never invent facts, metrics, or claims that are not in the material; if something is missing, leave it out or surface it as an open question.
- Omit confidential specifics (customer names, revenue figures, valuations) unless the material clearly intends them to be shared.
- Output only the Markdown primer — no preamble, no commentary.`;

type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
    };

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "AI generation is not configured. Set the ANTHROPIC_API_KEY environment variable to enable it.",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const transcript = String(formData.get("transcript") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  const blocks: ContentBlock[] = [];

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      return Response.json(
        { error: "File is too large — please keep it under 4 MB." },
        { status: 413 },
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    if (file.type === "application/pdf" || name.endsWith(".pdf")) {
      blocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: buffer.toString("base64"),
        },
      });
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer });
      blocks.push({
        type: "text",
        text: `Source document (${file.name}):\n\n${value}`,
      });
    } else if (
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      file.type.startsWith("text/")
    ) {
      blocks.push({
        type: "text",
        text: `Source document (${file.name}):\n\n${buffer.toString("utf-8")}`,
      });
    } else {
      return Response.json(
        { error: "Unsupported file type — upload a PDF, DOCX, TXT or MD file." },
        { status: 415 },
      );
    }
  }

  if (transcript) {
    blocks.push({
      type: "text",
      text: `Founder's voice note / notes about the idea:\n\n${transcript}`,
    });
  }

  if (blocks.length === 0) {
    return Response.json(
      { error: "Upload a document or record a voice note first." },
      { status: 400 },
    );
  }

  blocks.push({
    type: "text",
    text: `Write the idea primer now.${title ? ` The event is titled "${title}" — use it as a hint for the idea's name if the source material doesn't name it.` : ""}`,
  });

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: { effort: "medium" },
      // Server-side fallback: if safety classifiers decline, retry on the
      // recommended fallback model instead of failing the request.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: blocks }],
    });

    if (response.stop_reason === "refusal") {
      return Response.json(
        { error: "The AI declined to process this material. Try different source content." },
        { status: 422 },
      );
    }

    const primer = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!primer) {
      return Response.json(
        { error: "Generation returned no text — please try again." },
        { status: 502 },
      );
    }

    return Response.json({ primer });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json(
        { error: "The configured ANTHROPIC_API_KEY is invalid." },
        { status: 503 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "AI service is rate-limited right now — try again in a minute." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json(
        { error: `AI generation failed (${error.status}). Please try again.` },
        { status: 502 },
      );
    }
    throw error;
  }
}
