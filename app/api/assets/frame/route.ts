const ASSETPIPE = "https://assetpipe-production.up.railway.app";

export async function GET(request: Request) {
  const scene = new URL(request.url).searchParams.get("scene")?.trim().slice(0, 180);
  if (!scene) return Response.json({ error: "Missing scene" }, { status: 400 });
  try {
    const search = await fetch(`${ASSETPIPE}/search?q=${encodeURIComponent(scene)}&count=8`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!search.ok) throw new Error(`search ${search.status}`);
    const data = await search.json() as { results?: Array<{ asset_id: string; width: number; height: number; description: string; license: string }> };
    const candidates = data.results ?? [];
    const selected = [...candidates].sort((a, b) => {
      const landscapeA = a.width >= a.height ? 1 : 0;
      const landscapeB = b.width >= b.height ? 1 : 0;
      return landscapeB - landscapeA || b.width * b.height - a.width * a.height;
    })[0];
    if (!selected?.asset_id) throw new Error("no results");
    const fetched = await fetch(`${ASSETPIPE}/fetch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ asset_id: selected.asset_id, size: "large" }), cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!fetched.ok) throw new Error(`fetch ${fetched.status}`);
    const meta = await fetched.json() as { url?: string; license?: string };
    if (!meta.url?.startsWith(`${ASSETPIPE}/asset/`)) throw new Error("unsafe asset url");
    const image = await fetch(meta.url, { cache: "force-cache", signal: AbortSignal.timeout(20_000) });
    if (!image.ok) throw new Error(`asset ${image.status}`);
    return new Response(image.body, { headers: { "Content-Type": image.headers.get("content-type") || "image/jpeg", "X-Asset-Id": selected.asset_id, "X-Asset-License": meta.license || selected.license || "Pixabay Content License", "X-Asset-Description": selected.description.slice(0, 180) } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "AssetPipe unavailable" }, { status: 502 });
  }
}
