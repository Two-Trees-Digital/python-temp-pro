import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: "ok",
      db: "ok",
      latency_ms: Date.now() - start,
    });
  } catch (err) {
    console.error("[health] DB check failed:", err);
    return Response.json(
      { status: "error", db: "fail", error: String(err) },
      { status: 500 }
    );
  }
}
