const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Inicializando a API do Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Função com Retry e Exponential Backoff para lidar com Rate Limits (Erro 429)
async function generateWithRetry(model, prompt, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Usando gemini-1.5-pro para maior compatibilidade regional nos Runners do GitHub
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });
      return result.response;
    } catch (error) {
      // Erro 429: Rate Limit
      if (error.status === 429 && attempt < maxRetries) {
        let delayMs = Math.pow(2, attempt) * 5000; // Backoff agressivo: 10s, 20s...
        console.log(`[Rate Limit 429] Quota excedida. Tentando novamente em ${delayMs/1000} segundos... (Tentativa ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } 
      // Erro de Localização (Region block) ou outros erros 400
      else if (error.status === 400 && error.message.includes('location is not supported')) {
        console.error('[ERRO REGIONAL] O Runner do GitHub está em uma região não suportada por este modelo.');
        throw error;
      }
      else {
        throw error;
      }
    }
  }
}

function updateSitemap() {
  const domain = 'https://refrigeracaopnz.com.br';
  const docsDir = path.join(__dirname, '..');
  const blogDir = path.join(docsDir, 'blog');
  const sitemapPath = path.join(docsDir, 'sitemap.xml');

  const pages = [
    '',
    'index.html',
    'servicos.html',
    'vendas.html',
    'blog.html',
    'sobre-nos.html'
  ];

  let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Adicionar páginas principais
  pages.forEach(page => {
    sitemapContent += `  <url>
    <loc>${domain}/${page}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page === '' || page === 'index.html' ? '1.0' : '0.8'}</priority>
  </url>\n`;
  });

  // Adicionar posts do blog
  if (fs.existsSync(blogDir)) {
    const posts = fs.readdirSync(blogDir).filter(file => file.endsWith('.html'));
    posts.forEach(post => {
      sitemapContent += `  <url>
    <loc>${domain}/blog/${post}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
    });
  }

  sitemapContent += `</urlset>`;
  fs.writeFileSync(sitemapPath, sitemapContent);
  console.log(`Sitemap atualizado em: ${sitemapPath}`);
}

async function main() {
  try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `Você é o Frank, um técnico especialista em refrigeração com mais de 20 anos de experiência em Petrolina e região do Vale do São Francisco. 
Você NÃO é uma IA. Você é um profissional "mão na massa" que escreve para ajudar seus clientes.

SEU OBJETIVO: Escrever um artigo técnico, humano e prático (800 a 1200 palavras) para o seu blog.

DIRETRIZES DE ESTILO E VOZ:
1. Tom de Voz: Direto, técnico mas acessível, empático e autoritário. Use termos como "chão de oficina", "peças originais", "carga de gás".
2. Localidade: Mencione naturalmente Petrolina, Juazeiro ou o calor do Vale do São Francisco.
3. SEO Humano: Foque em termos como "Técnico em Refrigeração em Petrolina", "Soluções de Ar Condicionado", "Conserto de Geladeira", "Manutenção de Máquina de Lavar".
4. Estrutura: Use subtítulos que respondam a dúvidas reais (ex: "Por que seu ar parou de gelar no calor de Petrolina?").
5. PROIBIDO: Mencionar que é uma IA, usar linguagem robótica ou marketing genérico.

Retorne sua resposta ESTRITAMENTE em formato JSON com as seguintes chaves:
- "titulo": Título focado em SEO e solução (ex: "Como economizar 30% na conta de luz com seu Ar Condicionado em Petrolina").
- "slug": Título formatado para URL.
- "resumo": Uma introdução rápida e chamativa (máx 150 caracteres).
- "conteudoHtml": Conteúdo rico em HTML (use <h2>, <p>, <ul>, <li>). Sem Markdown.
- "categoria": A categoria do post, ESCOLHIDA EXATAMENTE de uma dessas 4 opções: "Tecnologia & IA", "Manutenção", "Curiosidades", ou "Dicas Práticas".`;

    const response = await generateWithRetry(model, prompt);
    let textResponse = response.text();
    
    // Limpeza de possíveis marcações de markdown
    textResponse = textResponse.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    const postData = JSON.parse(textResponse);
    
    // Fallback de segurança para categoria
    const categoriasValidas = ["Tecnologia & IA", "Manutenção", "Curiosidades", "Dicas Práticas"];
    let categoriaFinal = postData.categoria;
    if (!categoriasValidas.includes(categoriaFinal)) {
        categoriaFinal = "Dicas Práticas";
    }

    let badgeSorteada = "badge-primary";
    let badgeTexto = "ARTIGO";
    if (categoriaFinal === "Tecnologia & IA") { badgeSorteada = "badge-accent"; badgeTexto = "TECNOLOGIA"; }
    else if (categoriaFinal === "Manutenção") { badgeSorteada = "badge-primary"; badgeTexto = "MANUTENÇÃO"; }
    else if (categoriaFinal === "Curiosidades") { badgeSorteada = "badge-secondary"; badgeTexto = "CURIOSIDADES"; }
    else if (categoriaFinal === "Dicas Práticas") { badgeSorteada = "badge-outline"; badgeTexto = "DICA DO TÉCNICO"; }

    
    const today = new Date().toISOString().split('T')[0];
    const fileName = `${today}-${postData.slug}.html`;
    const blogDirPath = path.join(__dirname, '..', 'blog');
    const postFilePath = path.join(blogDirPath, fileName);

    if (!fs.existsSync(blogDirPath)) {
        fs.mkdirSync(blogDirPath, { recursive: true });
    }

    const templatePath = path.join(__dirname, 'template.html');
    let templateHtml = fs.readFileSync(templatePath, 'utf8');
    
    templateHtml = templateHtml.replace(/\{\{TITULO\}\}/g, postData.titulo);
    templateHtml = templateHtml.replace(/\{\{CONTEUDO\}\}/g, postData.conteudoHtml);
    templateHtml = templateHtml.replace(/\{\{SLUG_FILE\}\}/g, fileName);
    templateHtml = templateHtml.replace(/\{\{DATA_ISO\}\}/g, new Date().toISOString());

    fs.writeFileSync(postFilePath, templateHtml);
    console.log(`Post gerado com sucesso: ${postFilePath}`);

    // Atualizar sitemap.xml
    updateSitemap();

    const blogHtmlPath = path.join(__dirname, '..', 'blog.html');
    let blogHtml = fs.readFileSync(blogHtmlPath, 'utf8');

    const newCardHtml = `
                        <!-- Post Gerado automaticamente pela IA -->
                        <article class="blog-post" data-category="${categoriaFinal}" style="transition: opacity 0.3s ease;">
                            <div class="post-header">
                                <span class="badge ${badgeSorteada}">${badgeTexto}</span>
                                <h2>${postData.titulo}</h2>
                            </div>
                            <div class="post-excerpt">
                                <p>${postData.resumo}</p>
                            </div>
                            <a href="blog/${fileName}" class="btn btn-primary">Ler artigo completo</a>
                        </article>`;

    blogHtml = blogHtml.replace('<div class="blog-feed">', '<div class="blog-feed">\n' + newCardHtml);
    
    fs.writeFileSync(blogHtmlPath, blogHtml);
    console.log('blog.html atualizado com sucesso.');

  } catch (error) {
    console.error('Erro ao gerar post com a API Gemini:', error);
    process.exit(1);
  }
}

main();