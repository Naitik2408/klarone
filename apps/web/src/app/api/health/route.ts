import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "OK",
      message: "Frontend is running",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
