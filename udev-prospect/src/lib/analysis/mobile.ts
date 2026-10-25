import dns from "node:dns/promises";
import { isPublicAddress } from "../net/ip";
import { validateUrl } from "../net/safe-fetch";

export interface MobileCheck {
  tool: string;
  checkedAt: string;
  viewport: { width: number; height: number };
  available: boolean;
  error?: string;
  horizontalOverflowPx?: number;
  menu?: { navLinksInDom: number; visibleNavLinks: number; toggleVisible: boolean; toggleRevealsLinks: boolean | null };
  overlappedContacts?: { href: string; coveredBy: string }[];
  screenshotJpegBase64?: string;
  note: string;
}

/**
 * Verificação visual/estrutural num ecrã móvel (390×844) com Playwright, se estiver instalado.
 * Garantias: só pedidos GET; bloqueia anfitriões privados; não submete formulários nem segue ações externas.
 */
export async function checkMobile(url: string, opts: { addressPolicy?: (ip: string) => boolean; allowedPorts?: string[]; timeoutMs?: number } = {}): Promise<MobileCheck> {
  const viewport = { width: 390, height: 844 };
  const base: MobileCheck = { tool: "playwright/chromium", checkedAt: new Date().toISOString(), viewport, available: false, note: "Verificação apenas visual/estrutural; nenhum formulário foi enviado." };
  const policy = opts.addressPolicy ?? isPublicAddress;
  const invalid = validateUrl(url, { addressPolicy: policy, allowedPorts: opts.allowedPorts });
  if (invalid) return { ...base, error: invalid };

  let playwright: typeof import("playwright");
  try {
    playwright = await import(/* webpackIgnore: true */ "playwright");
  } catch {
    return { ...base, error: "Playwright não está instalado; verificação móvel indisponível." };
  }
  const hostOk = new Map<string, boolean>();
  async function allowed(reqUrl: string): Promise<boolean> {
    let u: URL;
    try { u = new URL(reqUrl); } catch { return false; }
    if (u.protocol === "data:" || u.protocol === "blob:") return true;
    if (validateUrl(u.origin + "/", { addressPolicy: policy, allowedPorts: opts.allowedPorts })) return false;
    const h = u.hostname;
    if (!hostOk.has(h)) {
      try {
        const addrs = /^[\d.]+$/.test(h) || h.includes(":") ? [{ address: h.replace(/^\[|\]$/g, "") }] : await dns.lookup(h, { all: true });
        hostOk.set(h, addrs.length > 0 && addrs.every((a) => policy(a.address)));
      } catch { hostOk.set(h, false); }
    }
    return hostOk.get(h)!;
  }

  const browser = await playwright.chromium.launch();
  try {
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "pt-PT", acceptDownloads: false,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 UDEV-Prospect/0.1" });
    await context.route("**/*", async (route) => {
      const req = route.request();
      if (req.method() !== "GET" || !(await allowed(req.url()))) return route.abort("blockedbyclient");
      return route.continue();
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: opts.timeoutMs ?? 20_000 });
    await page.waitForTimeout(1500);
    const result = await page.evaluate(() => {
      const vis = (el: Element) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        const s = getComputedStyle(el as HTMLElement);
        return r.width > 2 && r.height > 2 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05;
      };
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const navLinks = Array.from(document.querySelectorAll("nav a[href], header a[href]"));
      const toggle = Array.from(document.querySelectorAll("button, [role=button], a, div, span")).find((el) => {
        const sig = ((el.getAttribute("aria-label") ?? "") + " " + (el.getAttribute("class") ?? "") + " " + (el.id ?? "")).toLowerCase();
        return /menu|toggle|hamburger|burger|navbar-toggler|nav-toggle|mobile-nav/.test(sig) && vis(el);
      });
      const overlapped: { href: string; coveredBy: string }[] = [];
      for (const a of Array.from(document.querySelectorAll('a[href^="tel:"], a[href*="wa.me"], a[href*="whatsapp"], a[href^="mailto:"]')).slice(0, 10)) {
        if (!vis(a)) continue;
        const r = a.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cy < 0 || cy > window.innerHeight || cx < 0 || cx > window.innerWidth) continue;
        const top = document.elementFromPoint(cx, cy);
        if (top && top !== a && !a.contains(top) && !top.contains(a)) {
          const sig = (top.tagName + "." + (top.getAttribute("class") ?? "") + "#" + (top.id ?? "")).toLowerCase();
          if (/cookie|consent|gdpr|rgpd/.test(sig)) continue; // banner de cookies fecha-se; não é um defeito do site
          overlapped.push({ href: a.getAttribute("href") ?? "", coveredBy: sig.slice(0, 120) });
        }
      }
      (window as unknown as { __toggle?: Element }).__toggle = toggle;
      return { overflow, navLinksInDom: navLinks.length, visibleNavLinks: navLinks.filter(vis).length, toggleVisible: !!toggle, overlapped };
    });
    let toggleRevealsLinks: boolean | null = null;
    if (result.toggleVisible && result.visibleNavLinks === 0 && result.navLinksInDom > 0) {
      // Clicar no botão do menu é uma ação local de interface (sem efeitos externos; pedidos não-GET bloqueados).
      await page.evaluate(() => ((window as unknown as { __toggle?: HTMLElement }).__toggle)?.click()).catch(() => {});
      await page.waitForTimeout(700);
      toggleRevealsLinks = await page.evaluate(() => Array.from(document.querySelectorAll("nav a[href], header a[href]")).some((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        const s = getComputedStyle(el as HTMLElement);
        return r.width > 2 && r.height > 2 && s.visibility !== "hidden" && s.display !== "none";
      }));
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: opts.timeoutMs ?? 20_000 }).catch(() => {});
    }
    const shot = await page.screenshot({ type: "jpeg", quality: 45, fullPage: false }).catch(() => null);
    return {
      ...base,
      available: true,
      horizontalOverflowPx: Math.max(0, result.overflow),
      menu: { navLinksInDom: result.navLinksInDom, visibleNavLinks: result.visibleNavLinks, toggleVisible: result.toggleVisible, toggleRevealsLinks },
      overlappedContacts: result.overlapped,
      screenshotJpegBase64: shot ? shot.toString("base64") : undefined,
    };
  } catch (e) {
    return { ...base, available: true, error: `falha ao carregar no navegador: ${(e as Error).message.slice(0, 200)}` };
  } finally {
    await browser.close().catch(() => {});
  }
}
