// Gera a versão instalável (pasta docs/) a partir do index.html do artifact.
// Uso: node montar-app.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const raiz = __dirname;
const saida = path.join(raiz, "docs"); // o GitHub Pages publica a pasta docs/
fs.mkdirSync(saida, { recursive: true });

let s = fs.readFileSync(path.join(raiz, "index.html"), "utf8");

function trocar(nome, de, para) {
  const antes = s;
  s = typeof de === "string" ? s.split(de).join(para) : s.replace(de, () => para);
  if (s === antes) throw new Error("Trecho não encontrado: " + nome);
}

// ---------- 1. Cabeçalho de site completo ----------
trocar("cabeçalho", /^[\s\S]*?<style>/,
`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Calorias e Macros</title>
<meta name="description" content="Calcula a meta diária de calorias e macros, registra o que você comeu e acompanha o peso.">
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#1f7a5a">
<link rel="icon" href="icone-192.png">
<link rel="apple-touch-icon" href="icone-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Calorias">
<style>`);

trocar("css extra", "</style>",
`  [hidden] { display: none !important; }
  body { margin: 0; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
  button.sec { font-family: inherit; }
  #camera { width: 100%; max-height: 320px; border-radius: 10px; background: #000; display: block; }
</style>`);

trocar("abre body", /<\/style>\s*<main>/, "</style>\n</head>\n<body>\n<main>");
s = s.trimEnd() + "\n<script src=\"zxing.min.js\" defer></script>\n</body>\n</html>\n";

// ---------- 2. Textos ----------
trocar("dica do campo",
  "com valor estimado, sem consulta. Se não houver sugestão que sirva, toque em Adicionar: o app pergunta ao Claude os valores por 100 g e guarda para as próximas vezes.",
  "com valor estimado. Se não houver sugestão que sirva, cadastre o produto pelo código de barras logo abaixo.");
trocar("sem sugestão",
  "Toque em Adicionar para o Claude estimar, ou abra “Não achou?” abaixo para cadastrar por foto, Google ou código de barras.",
  "Abra “Não achou?” abaixo para cadastrar pelo código de barras, pelo Google ou digitando.");
trocar("título do cadastro",
  "Não achou? Cadastrar por foto, Google ou código de barras",
  "Não achou? Cadastrar por código de barras, Google ou digitando");

// ---------- 3. Opções de cadastro (HTML) ----------
trocar("opções de cadastro", /<div class="opcao">\s*<b>Foto da tabela nutricional<\/b>[\s\S]*?(?=<p class="nota" id="msgCadastro")/,
`<div class="opcao">
          <b>Código de barras</b>
          <p class="nota">Aponte a câmera para o código de barras da embalagem, ou digite os números. O app busca o produto no Open Food Facts e preenche os campos abaixo.</p>
          <div class="grade">
            <div class="cheio"><button type="button" class="sec" id="btnCamera">Ler com a câmera</button></div>
            <div class="cheio" id="areaCamera" hidden>
              <video id="camera" playsinline muted></video>
              <button type="button" class="link" id="btnPararCamera">Fechar câmera</button>
            </div>
            <div><label for="codigoBarras">Números do código</label><input id="codigoBarras" type="text" inputmode="numeric" autocomplete="off" placeholder="Ex.: 7891000100103"></div>
            <div style="align-self:end"><button type="button" class="sec" id="btnBuscarProduto">Buscar produto</button></div>
          </div>
        </div>

        <div class="opcao">
          <b>Pesquisar no Google</b>
          <p class="nota">Abre a pesquisa em outra aba. Copie os valores por 100 g para os campos abaixo.</p>
          <a class="sec" id="linkGoogle" target="_blank" rel="noopener" href="https://www.google.com/search?q=tabela+nutricional+100g">Pesquisar no Google</a>
        </div>

        `);

// ---------- 4. Cartão de instalação e backup ----------
trocar("cartão instalar", `<div class="cartao" id="resultado"></div>`,
`<div class="cartao" id="resultado"></div>

    <div class="cartao">
      <h2>Instalar e backup</h2>
      <p class="nota" id="comoInstalar" style="margin-top:0"></p>
      <button type="button" class="acao" id="btnInstalar" style="margin-top:10px" hidden>Instalar o app</button>
      <div class="grade" style="margin-top:14px">
        <div><button type="button" class="sec" id="btnExportar">Salvar backup</button></div>
        <div><label class="sec" for="arqBackup">Restaurar backup</label>
          <input id="arqBackup" type="file" accept="application/json,.json" hidden></div>
      </div>
      <p class="nota" id="msgBackup">Os dados ficam só neste aparelho. Salve um backup de vez em quando e guarde o arquivo.</p>
    </div>`);

// ---------- 5. Dados só no aparelho (sai a conta do Claude) ----------
trocar("gravação", /let conta = null;[\s\S]*?(?=\/\/ ---------- Cálculo da meta ----------)/,
`// Tudo fica guardado no próprio aparelho (localStorage).
function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(dados)); }
  catch (e) { aviso("Não foi possível gravar neste aparelho. Verifique o espaço livre."); }
}

`);

// ---------- 6. Sai a busca no Claude ----------
trocar("busca Claude", /\/\/ ---------- Busca automática de alimento novo[\s\S]*?(?=function registrar\()/,
`const igual = (a, b) => semAcento(a) === semAcento(b);
const msgAlimento = (texto) => { $("msgAlimento").textContent = texto; };

`);

trocar("alimento novo", /  \/\/ 2\) Alimento novo:[\s\S]*?\n\}\);/,
`  // 2) Não está na lista: abre o cadastro com o nome já preenchido
  $("cadastro").open = true;
  $("cNome").value = nome;
  atualizarLinks();
  msgAlimento("“" + nome + "” não está na lista. Cadastre logo abaixo: pelo código de barras, pelo Google ou digitando os valores.");
  $("cadastro").scrollIntoView({ behavior: "smooth", block: "start" });
});`);

// ---------- 7. Código de barras com busca automática ----------
trocar("cadastro alternativo", /\/\/ ---------- Outras formas de cadastrar[\s\S]*?(?=\/\/ ---------- Aba Peso ----------)/,
`// ---------- Outras formas de cadastrar: código de barras e Google ----------
const msgCadastro = (texto) => { $("msgCadastro").textContent = texto; };

function atualizarLinks() {
  const nome = ($("cNome").value || $("alimento").value).trim();
  $("linkGoogle").href = "https://www.google.com/search?q=" + encodeURIComponent("tabela nutricional " + nome + " 100g");
}
["cNome", "alimento"].forEach((id) => $(id).addEventListener("input", atualizarLinks));
$("cadastro").addEventListener("toggle", () => {
  if ($("cadastro").open && !$("cNome").value) $("cNome").value = $("alimento").value.trim();
  if (!$("cadastro").open) pararCamera();
  atualizarLinks();
});

// Busca o produto no Open Food Facts (base pública e gratuita) pelo código de barras
async function buscarProduto() {
  const codigo = $("codigoBarras").value.replace(/\\D/g, "");
  if (codigo.length < 8) { msgCadastro("Digite os números do código de barras (8 a 13 dígitos)."); return; }
  if (!navigator.onLine) { msgCadastro("Sem internet. A busca pelo código de barras precisa de conexão."); return; }
  msgCadastro("Buscando o produto…");
  try {
    const resposta = await fetch("https://world.openfoodfacts.org/api/v2/product/" + codigo +
      ".json?fields=product_name,product_name_pt,brands,nutriments");
    const json = await resposta.json();
    const produto = json && json.status === 1 ? json.product : null;
    const n = (produto && produto.nutriments) || {};
    let kcal = Number(n["energy-kcal_100g"]);
    if (!isFinite(kcal) && isFinite(Number(n["energy_100g"]))) kcal = Number(n["energy_100g"]) / 4.184; // veio em kJ
    if (!produto || !isFinite(kcal)) {
      msgCadastro("Produto não encontrado no Open Food Facts, ou sem tabela nutricional cadastrada lá. Use o Google ou digite os valores da embalagem.");
      return;
    }
    const marca = typeof produto.brands === "string" ? produto.brands.split(",")[0].trim() : "";
    const nome = [produto.product_name_pt || produto.product_name || "", marca].filter(Boolean).join(" - ");
    if (nome) $("cNome").value = nome.slice(0, 80);
    $("cKcal").value = Math.round(kcal);
    $("cP").value = +num(n["proteins_100g"]).toFixed(1);
    $("cC").value = +num(n["carbohydrates_100g"]).toFixed(1);
    $("cG").value = +num(n["fat_100g"]).toFixed(1);
    atualizarLinks();
    msgCadastro("Produto encontrado. Confira os valores com a embalagem e toque em Salvar alimento.");
  } catch (erro) {
    msgCadastro("Não consegui consultar agora. Verifique a internet e tente de novo, ou digite os valores.");
  }
}
$("btnBuscarProduto").addEventListener("click", buscarProduto);

// Leitura do código de barras pela câmera (biblioteca ZXing, que vem junto com o app)
let leitor = null;
function pararCamera() {
  if (leitor) { try { leitor.reset(); } catch (e) {} leitor = null; }
  $("areaCamera").hidden = true;
}
$("btnPararCamera").addEventListener("click", pararCamera);
$("btnCamera").addEventListener("click", () => {
  const digite = " Digite os números que ficam embaixo das barras.";
  if (!window.ZXing || !navigator.mediaDevices) { msgCadastro("Este navegador não abre a câmera aqui." + digite); return; }
  pararCamera();
  $("areaCamera").hidden = false;
  msgCadastro("Aponte a câmera para o código de barras.");
  const dicas = new Map();
  dicas.set(ZXing.DecodeHintType.POSSIBLE_FORMATS,
    [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]);
  leitor = new ZXing.BrowserMultiFormatReader(dicas);
  leitor.decodeFromConstraints({ video: { facingMode: "environment" } }, $("camera"), (resultado) => {
    if (!resultado) return;
    $("codigoBarras").value = resultado.getText();
    pararCamera();
    buscarProduto();
  }).catch(() => {
    pararCamera();
    msgCadastro("Não consegui abrir a câmera. Autorize o uso da câmera no navegador." + digite);
  });
});

`);

// ---------- 8. Início: instalação, backup e funcionamento offline ----------
trocar("início", "ligarConta();",
`aviso("Dados guardados neste aparelho.");
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// ---------- Backup ----------
$("btnExportar").addEventListener("click", () => {
  const arquivo = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(arquivo);
  link.download = "calorias-macros-backup-" + hoje() + ".json";
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  $("msgBackup").textContent = "Backup salvo na pasta de downloads deste aparelho.";
});

$("arqBackup").addEventListener("change", async (e) => {
  const arquivo = e.target.files[0];
  e.target.value = "";
  if (!arquivo) return;
  try {
    const lido = JSON.parse(await arquivo.text());
    const valido = lido && typeof lido === "object" && typeof lido.perfil === "object" &&
      typeof lido.diario === "object" && Array.isArray(lido.pesos) && Array.isArray(lido.meus);
    if (!valido) throw new Error("formato");
    if (!confirm("Restaurar este backup substitui os dados atuais deste aparelho. Continuar?")) return;
    dados = { perfil: lido.perfil || {}, diario: lido.diario || {}, pesos: lido.pesos, meus: lido.meus };
    salvar(); mostrarTudo();
    $("msgBackup").textContent = "Backup restaurado.";
  } catch (erro) {
    $("msgBackup").textContent = "Esse arquivo não é um backup deste app.";
  }
});

// ---------- Instalação ----------
// Este tipo de app se instala pelo próprio navegador: não tem loja nem arquivo para baixar.
const instalado = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const agente = navigator.userAgent;
const ehApple = /iphone|ipad|ipod/i.test(agente) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const ehAndroid = /android/i.test(agente);
const ehSafari = ehApple && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(agente);
const dentroDeOutroApp = /FBAN|FBAV|Instagram|WhatsApp|Line\\/|; wv\\)|Electron/i.test(agente);

// Passo a passo conforme o aparelho e o navegador em que a página está aberta
function passosInstalar() {
  if (dentroDeOutroApp) return "Esta página está aberta dentro de outro aplicativo, que não deixa instalar. Copie o endereço " + location.href +
    " e abra no Chrome (Android) ou no Safari (iPhone).";
  if (ehApple && !ehSafari) return "No iPhone a instalação só funciona pelo Safari. Abra " + location.href +
    " no Safari, toque em Compartilhar (o quadrado com a seta para cima) e depois em “Adicionar à Tela de Início”.";
  if (ehApple) return "Toque em Compartilhar (o quadrado com a seta para cima, na barra do Safari), role a lista e toque em “Adicionar à Tela de Início”.";
  if (ehAndroid) return "Toque nos três pontos no canto de cima do Chrome, escolha “Adicionar à tela inicial” e depois “Instalar”. " +
    "Não use o download (a seta para baixo): ele só salva uma cópia da página.";
  return "No computador: no Chrome ou no Edge, clique no ícone de instalar no fim da barra de endereço (um monitor com uma seta), " +
    "ou abra o menu de três pontos e escolha “Transmitir, salvar e compartilhar” e “Instalar página como app”.";
}

let convite = null;
if (instalado) {
  $("comoInstalar").textContent = "App instalado neste aparelho.";
} else {
  $("comoInstalar").textContent = "Este app se instala pelo navegador, sem loja e sem arquivo para baixar. Toque em “Instalar o app”.";
  $("btnInstalar").hidden = false;
}
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); convite = e; });
$("btnInstalar").addEventListener("click", async () => {
  if (!convite) { $("comoInstalar").textContent = passosInstalar(); return; } // o navegador não ofereceu a instalação direta
  convite.prompt();
  const escolha = await convite.userChoice;
  convite = null;
  if (escolha && escolha.outcome === "accepted") $("btnInstalar").hidden = true;
});
window.addEventListener("appinstalled", () => { $("comoInstalar").textContent = "App instalado neste aparelho."; $("btnInstalar").hidden = true; });

// ---------- Funcionar sem internet ----------
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});`);

if (/claude|ligarConta|pendente\.|claudePronto|fotoRotulo|linkProduto/i.test(s.replace(/Claude outputs/g, ""))) {
  const sobra = s.split("\n").filter((l) => /claude|ligarConta|pendente\.|claudePronto|fotoRotulo|linkProduto/i.test(l)).slice(0, 8);
  throw new Error("Sobrou referência antiga:\n" + sobra.join("\n"));
}
fs.writeFileSync(path.join(saida, "index.html"), s);

// ---------- Manifesto ----------
fs.writeFileSync(path.join(saida, "manifest.webmanifest"), JSON.stringify({
  name: "Calorias e Macros",
  short_name: "Calorias",
  description: "Meta diária de calorias e macros, diário alimentar e acompanhamento do peso.",
  lang: "pt-BR",
  start_url: "./",
  scope: "./",
  display: "standalone",
  orientation: "portrait",
  background_color: "#f3f5f4",
  theme_color: "#1f7a5a",
  icons: [
    { src: "icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
}, null, 2));

// ---------- Service worker (funcionamento offline) ----------
const versao = "calorias-" + new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
fs.writeFileSync(path.join(saida, "sw.js"),
`// Guarda os arquivos do app no aparelho para ele abrir sem internet.
// Com internet, busca sempre a versão mais nova; sem internet, usa a cópia guardada.
const CACHE = "${versao}";
const ARQUIVOS = ["./", "index.html", "manifest.webmanifest", "zxing.min.js", "icone-192.png", "icone-512.png", "icone-180.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // Open Food Facts e Google passam direto
  e.respondWith(
    fetch(e.request)
      .then((resposta) => {
        if (resposta.ok) { const copia = resposta.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
        return resposta;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
`);

// ---------- Ícones (desenhados aqui, sem depender de programa externo) ----------
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function bloco(tipo, dadosBloco) {
  const tam = Buffer.alloc(4); tam.writeUInt32BE(dadosBloco.length);
  const corpo = Buffer.concat([Buffer.from(tipo), dadosBloco]);
  const soma = Buffer.alloc(4); soma.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tam, corpo, soma]);
}
function icone(tam) {
  const fundo = [31, 122, 90];
  const arcos = [[251, 146, 60], [122, 167, 255], [229, 176, 32]]; // proteína, carboidrato, gordura
  const linhas = Buffer.alloc(tam * (tam * 3 + 1));
  const SS = 3; // suavização das bordas
  for (let y = 0; y < tam; y++) {
    linhas[y * (tam * 3 + 1)] = 0;
    for (let x = 0; x < tam; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = (x + (sx + 0.5) / SS) / tam - 0.5, py = (y + (sy + 0.5) / SS) / tam - 0.5;
        const raio = Math.hypot(px, py);
        let cor = fundo;
        if (raio > 0.19 && raio < 0.31) {
          const ang = (Math.atan2(px, -py) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI); // 0 no topo
          const limites = [0, 0.3, 0.75, 1]; // fatias do anel
          for (let i = 0; i < 3; i++) if (ang > limites[i] + 0.02 && ang < limites[i + 1] - 0.02) cor = arcos[i];
        } else if (raio < 0.07) cor = [255, 255, 255];
        r += cor[0]; g += cor[1]; b += cor[2];
      }
      const p = y * (tam * 3 + 1) + 1 + x * 3;
      linhas[p] = Math.round(r / (SS * SS)); linhas[p + 1] = Math.round(g / (SS * SS)); linhas[p + 2] = Math.round(b / (SS * SS));
    }
  }
  const cab = Buffer.alloc(13);
  cab.writeUInt32BE(tam, 0); cab.writeUInt32BE(tam, 4); cab[8] = 8; cab[9] = 2; // 8 bits, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", cab), bloco("IDAT", zlib.deflateSync(linhas, { level: 9 })), bloco("IEND", Buffer.alloc(0))
  ]);
}
for (const tam of [180, 192, 512]) fs.writeFileSync(path.join(saida, "icone-" + tam + ".png"), icone(tam));

console.log("Pasta docs/ gerada:", fs.readdirSync(saida).join(", "));
