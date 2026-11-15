import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

async function headersDeTodo() {
  const reglas = (await nextConfig.headers?.()) ?? [];
  const regla = reglas.find((r) => r.source === "/(.*)");
  return Object.fromEntries((regla?.headers ?? []).map((h) => [h.key, h.value]));
}

describe("headers de seguridad", () => {
  it("CA-19: dada cualquier página, cuando se sirve, entonces la CSP solo deja conectarse al sitio y a BigDataCloud", async () => {
    const csp = (await headersDeTodo())["Content-Security-Policy"];
    const directivas = Object.fromEntries(
      csp.split(";").map((d) => {
        const [nombre, ...valores] = d.trim().split(/\s+/);
        return [nombre, valores.join(" ")];
      })
    );
    expect(directivas["connect-src"]).toBe("'self' https://api.bigdatacloud.net");
    expect(directivas["frame-ancestors"]).toBe("'none'");
    expect(directivas["object-src"]).toBe("'none'");
    expect(directivas["script-src"]).not.toContain("unsafe-eval");
  });

  it("dada cualquier página, cuando se sirve, entonces la geolocalización solo se permite al propio sitio", async () => {
    const h = await headersDeTodo();
    expect(h["Permissions-Policy"]).toContain("geolocation=(self)");
    expect(h["X-Frame-Options"]).toBe("DENY");
  });
});
