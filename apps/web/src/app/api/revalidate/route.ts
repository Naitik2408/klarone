import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret");
    const configuredSecret = process.env.REVALIDATION_SECRET || "klarone_revalidation_secret_2026";

    if (secret !== configuredSecret) {
      return NextResponse.json({ message: "Invalid revalidation secret" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { path, slug } = body as { path?: string; slug?: string };

    const pathsToRevalidate: string[] = [];

    if (path) {
      pathsToRevalidate.push(path);
    } else if (slug) {
      pathsToRevalidate.push(`/laptops/${slug}`);
      pathsToRevalidate.push("/laptops");
    } else {
      // Default: revalidate catalog listing and home
      pathsToRevalidate.push("/laptops");
      pathsToRevalidate.push("/");
    }

    for (const p of pathsToRevalidate) {
      revalidatePath(p, "page");
    }

    return NextResponse.json({
      revalidated: true,
      paths: pathsToRevalidate,
      timestamp: Date.now(),
    });
  } catch (err) {
    return NextResponse.json(
      { message: "Revalidation error", error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
