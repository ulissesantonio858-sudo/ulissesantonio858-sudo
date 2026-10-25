/* Servidor HTTP local com sites FICTÍCIOS para testes (ver tests/fixtures/README.md). */
import http from "node:http";
import type { AddressInfo } from "node:net";

const page = (body: string, head = '<meta name="viewport" content="width=device-width, initial-scale=1">') =>
  `<!doctype html><html lang="pt"><head><meta charset="utf-8">${head}<title>Fixture</title></head><body>${body}</body></html>`;

export const SITES: Record<string, (req: http.IncomingMessage, res: http.ServerResponse) => void> = {
  // Clínica com ligação de marcação partida (404 reproduzível)
  "/clinica-a/": (_q, r) => html(r, page(`<header><nav><a href="/clinica-a/">Início</a><a href="/clinica-a/contactos">Contactos</a></nav></header>
    <h1>Clínica Dentária Sorriso Fixture</h1><p>Rua Exemplo 1, 5000-000 Vila Real</p>
    <a href="tel:+351259000001">259 000 001</a> <a href="/clinica-a/marcacoes-antigas">Marcar consulta</a>
    <footer>© 2026 Clínica Dentária Sorriso Fixture</footer>
    <script type="application/ld+json">{"@type":"WebPage","dateModified":"${new Date(Date.now() - 10 * 86400000).toISOString()}"}</script>`)),
  "/clinica-a/contactos": (_q, r) => html(r, page(`<h1>Contactos</h1><p>Email: geral@clinica-a.fixture.invalid</p><p>Tel. 259 000 001</p><form><input type="email"><textarea></textarea></form>`)),
  "/clinica-a/marcacoes-antigas": (_q, r) => { r.writeHead(404, { "content-type": "text/html" }); r.end(page("Página não encontrada")); },
  // Salão com texto provisório e WhatsApp com ligação específica
  "/salao-b/": (_q, r) => html(r, page(`<h1>Salão Beleza Fixture</h1><p>Lorem ipsum dolor sit amet, consectetur adipiscing.</p>
    <p>Telefone 912 000 002</p><a href="https://wa.me/351912000002">Fale connosco no WhatsApp</a><p>Vila Real</p>`, "")),
  // Barbearia: só telefone em texto, sem ligação de WhatsApp; botão sem destino
  "/barbearia-c/": (_q, r) => html(r, page(`<h1>Barbearia Fixture</h1><p>Vila Real · 939 000 003</p><a href="#" class="btn">Marcar agora</a>`)),
  // Site lento: nunca responde dentro do limite
  "/lento/": () => { /* sem resposta */ },
  // Bloqueio por proteção anti-bot
  "/bloqueado/": (_q, r) => { r.writeHead(403, { "content-type": "text/html", server: "cloudflare" }); r.end("<title>Attention Required! | Cloudflare</title> cf-chl-bypass"); },
  "/captcha/": (_q, r) => { r.writeHead(403, { "content-type": "text/html" }); r.end("<div class='g-recaptcha'>Please complete the captcha</div>"); },
  // Site de outra empresa (para testar conflito de identidade)
  "/outra-empresa/": (_q, r) => html(r, page(`<h1>Loja de Ferragens Qualquer Fixture</h1><p>Lisboa</p>`)),
  // Redireção para endereço privado (SSRF)
  "/redirect-privado/": (_q, r) => { r.writeHead(302, { location: "http://10.0.0.5/admin" }); r.end(); },
  "/grande/": (_q, r) => html(r, page("x".repeat(3_000_000))),
  // Agência sem oferta web visível
  "/agencia-d/": (_q, r) => html(r, page(`<h1>Agência Social Fixture</h1><p>Gestão de redes sociais, fotografia e conteúdos em Vila Real.</p><a href="mailto:ola@agencia-d.fixture.invalid">ola@agencia-d.fixture.invalid</a>`)),
};

function html(r: http.ServerResponse, body: string) { r.writeHead(200, { "content-type": "text/html; charset=utf-8" }); r.end(body); }

export async function startFixtureServer() {
  const server = http.createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0];
    if (path === "/robots.txt") { res.writeHead(200, { "content-type": "text/plain" }); res.end("User-agent: *\nDisallow: /privado/\n"); return; }
    const h = SITES[path];
    if (h) return h(req, res);
    res.writeHead(404); res.end("not found");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;
  return {
    base, port,
    /** Opções de fetch que permitem o loopback APENAS nos testes. */
    fetchOptions: { addressPolicy: (ip: string) => ip === "127.0.0.1", allowedPorts: [String(port)], timeoutMs: 1500 },
    close: () => new Promise<void>((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
  };
}
