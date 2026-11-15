import { NextResponse } from "next/server";
import { isAuthFailure } from "@/lib/auth";

export function safeRouteError(error: unknown) {
  if (isAuthFailure(error)) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }
  console.error("ENES route failure", error);
  return NextResponse.json({ ok: false, error: "The request could not be completed" }, { status: 500 });
}

export function validText(value: unknown, maximum: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximum;
}

export function validOptionalText(value: unknown, maximum: number) {
  return value === undefined || value === null || (typeof value === "string" && value.trim().length <= maximum);
}

export function validNairaAmount(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 2_000_000_000;
}
