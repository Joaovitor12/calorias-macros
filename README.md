# Calorias e Macros

App pessoal para calcular a meta diária de calorias e macros, registrar o que foi comido e acompanhar o peso. By João Nerd.

- `index.html`: versão publicada como artifact no claude.ai (usa a conta do Claude).
- `montar-app.js`: gera a versão instalável na pasta `docs/` (`node montar-app.js`).
- `docs/`: site publicado pelo GitHub Pages. Funciona sem internet e guarda os dados no próprio aparelho.

Fontes dos dados: Tabela Brasileira de Composição de Alimentos (TACO, Unicamp) e Open Food Facts (busca por código de barras). Leitura de código de barras pela biblioteca ZXing.
