import { NextResponse } from "next/server";
import { getLocalModelEndpoint, listLocalModels } from "@/lib/lmstudio";

export async function GET() {
  try {
    const models = await listLocalModels();

    return NextResponse.json({
      models,
      endpoint: getLocalModelEndpoint(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reach LM Studio.";

    return NextResponse.json(
      {
        models: [],
        endpoint: getLocalModelEndpoint(),
        error: message,
      },
      { status: 502 },
    );
  }
}
