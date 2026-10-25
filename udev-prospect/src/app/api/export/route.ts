import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { withUser } from "@/lib/db";
import { exportCsv } from "@/lib/crm";
import { todayLisbon } from "@/lib/domain/time";

export async function GET() {
  const user = await getUser();
  if (!user) return new NextResponse("Não autorizado", { status: 401 });
  const csv = await withUser(user.id, (db) => exportCsv(db));
  return new NextResponse("﻿" + csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="udev-leads-${todayLisbon()}.csv"` } });
}
