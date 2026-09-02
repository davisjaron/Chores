import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireParent } from "@/lib/api-helpers";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session!.user.role === "parent") {
    const suggestions = await prisma.rewardSuggestion.findMany({
      include: { child: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const grouped: Record<
      string,
      { name: string; count: number; children: string[]; ids: string[] }
    > = {};
    for (const s of suggestions) {
      const key = s.name.toLowerCase().trim();
      if (!grouped[key]) {
        grouped[key] = { name: s.name, count: 0, children: [], ids: [] };
      }
      grouped[key].count++;
      grouped[key].children.push(s.child.name);
      grouped[key].ids.push(s.id);
    }

    return NextResponse.json(Object.values(grouped));
  }

  const childId = session!.user.childId;
  if (!childId) {
    return NextResponse.json({ error: "No child" }, { status: 400 });
  }

  const suggestions = await prisma.rewardSuggestion.findMany({
    where: { childId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(suggestions);
}

export async function POST(req: Request) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { name, childId: bodyChildId } = await req.json();
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const childId =
    session!.user.role === "kid" ? session!.user.childId : bodyChildId;
  if (!childId) {
    return NextResponse.json({ error: "No child" }, { status: 400 });
  }

  const allByChild = await prisma.rewardSuggestion.findMany({
    where: { childId },
  });
  const existing = allByChild.find(
    (s) => s.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (existing) {
    return NextResponse.json(
      { error: "You've already suggested this!" },
      { status: 409 }
    );
  }

  const suggestion = await prisma.rewardSuggestion.create({
    data: { childId, name: trimmed },
  });

  return NextResponse.json(suggestion, { status: 201 });
}

export async function DELETE(req: Request) {
  const { error } = await requireParent();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (name) {
    const all = await prisma.rewardSuggestion.findMany();
    const toDelete = all
      .filter((s) => s.name.toLowerCase() === name.toLowerCase())
      .map((s) => s.id);
    if (toDelete.length > 0) {
      await prisma.rewardSuggestion.deleteMany({
        where: { id: { in: toDelete } },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
