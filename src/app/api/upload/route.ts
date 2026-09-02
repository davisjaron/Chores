import { NextResponse } from "next/server";
import { requireParent } from "@/lib/api-helpers";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { randomUUID } from "crypto";

const UPLOAD_DIR = join(process.cwd(), "prisma", "data", "uploads");

export async function POST(request: Request) {
  const { error } = await requireParent();
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await mkdir(UPLOAD_DIR, { recursive: true });

  const id = randomUUID();
  const filename = `${id}.webp`;

  const compressed = await sharp(buffer)
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  await writeFile(join(UPLOAD_DIR, filename), compressed);

  return NextResponse.json({ path: `/api/upload/${filename}` });
}
