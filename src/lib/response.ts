import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export const UNAUTHORIZED = () => err("Unauthorized", 401);
export const FORBIDDEN    = () => err("Forbidden", 403);
export const NOT_FOUND    = (entity = "Resource") => err(`${entity} not found`, 404);
