const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

// Inicializando a API do Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Função com Retry e Exponential Backoff para lidar com Rate Limits (Erro 429)
async function generateWithRetry(ai, prompt, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json'
        }
      });
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        // Tenta extrair o delay da resposta de erro (RetryInfo) ou usa backoff exponencial
        let delayMs = Math.pow(2, attempt) * 2000; // Começa com 4s, 8s...
        
        // Verifica se a API informou um tempo de espera
        if (error.details && Array.isArray(error.details)) {
          const retryInfo = error.details.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
          if (retryInfo && retryInfo.retryDelay) {
             const seconds = parseInt(retryInfo.retryDelay.replace('s', ''));
             if (!isNaN(seconds)) {
                 delayMs = seconds * 1000 + 1000; // Adiciona 1s de margem
             }
          }
        }
        
        console.log(`[Rate Limit 429] Quota excedida. Tentando novamente em ${delayMs/1000} segundos... (Tentativa ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw error; // Se não for 429 ou já estourou tentativas, lança o erro
      }
    }
  }
}

async function main() {
  try {
    const categorias = ["Tecnologia & IA", "Manutenção", "Curiosidades", "Dicas Práticas"];
    const badges = ["badge-accent", "badge-outline", "badge-secondary", "badge-primary"];
    const coresBadge = ["TECNOLOGIA", "MANUTENÇÃO", "CURIOSIDADE", "DICA PRÁTICA"];
    
    // Calcula o dia do ano para criar um ciclo balanceado perfeito
    const agora = new Date();
    const diaDoAno = Math.floor((agora - new Date(agora.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const indiceCategoria = diaDoAno % categorias.length;
    
    const categoriaSorteada = categorias[indiceCategoria];
    const badgeSorteada = badges[indiceCategoria];
    const badgeTexto = coresBadge[indiceCategoria];

    const prompt = `Você é um especialista em refrigeração comercial e residencial escrevendo para o blog da 'Frank Refrigeração'. 
Seu objetivo é escrever um artigo completo e aprofundado (800 a 1200 palavras) focado em SEO. 
O TEMA PRINCIPAL DEVE SER ESTRITAMENTE FOCADO NA CATEGORIA: "${categoriaSorteada}".
Pesquise e aborde tendências recentes, inovações tecnológicas ou guias definitivos sobre ar condicionado, geladeiras, ou tecnologia Inverter, que se encaixem perfeitamente em ${categoriaSorteada}. Não faça apenas comentários rasos, entregue um conteúdo rico, útil e com dicas práticas reais.
O tom deve ser amigável, acessível para leigos, mas demonstrando alta autoridade técnica.

Retorne sua resposta ESTRITAMENTE em formato JSON com as seguintes chaves:
- "titulo": Um título chamativo para o post.
- "slug": O título formatado para URL (sem espaços, sem acentos, minúsculo, separado por hífens).
- "resumo": Uma frase curta (máx 150 caracteres) resumindo o post para o card do blog.
- "conteudoHtml": O texto do artigo completo já formatado em tags HTML básicas (<p>, <h2>, <h3>, <ul>, <li>, <strong>). Não inclua as tags <html>, <head> ou <body>, apenas o conteúdo interno. Não use Markdown no texto HTML.`;

    const response = await generateWithRetry(ai, prompt);

    let textResponse = response.text;
    // Fallback: remover possíveis blocos de código markdown que a IA possa ter retornado mesmo pedindo JSON
    if (textResponse.startsWith('```json')) {
        textResponse = textResponse.replace(/```json\n?/, '').replace(/```$/, '');
    }

    const postData = JSON.parse(textResponse);
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `${today}-${postData.slug}.html`;
    const blogDirPath = path.join(__dirname, '..', 'blog');
    const postFilePath = path.join(blogDirPath, fileName);

    // Garante que a pasta blog exista
    if (!fs.existsSync(blogDirPath)) {
        fs.mkdirSync(blogDirPath, { recursive: true });
    }

    // Leitura e preenchimento do template
    const templatePath = path.join(__dirname, 'template.html');
    let templateHtml = fs.readFileSync(templatePath, 'utf8');
    
    // Substituindo todas as ocorrências de {{TITULO}}
    templateHtml = templateHtml.replace(/\{\{TITULO\}\}/g, postData.titulo);
    
    // Substituindo {{CONTEUDO}}
    templateHtml = templateHtml.replace(/\{\{CONTEUDO\}\}/g, postData.conteudoHtml);

    // Salvando o novo post html
    fs.writeFileSync(postFilePath, templateHtml);
    console.log(`Post gerado com sucesso: ${postFilePath}`);

    // Atualização do arquivo blog.html
    const blogHtmlPath = path.join(__dirname, '..', 'blog.html');
    let blogHtml = fs.readFileSync(blogHtmlPath, 'utf8');

    const newCardHtml = `
                        <!-- Post Gerado automaticamente pela IA -->
                        <article class="blog-post" data-category="${categoriaSorteada}" style="transition: opacity 0.3s ease;">
                            <div class="post-header">
                                <span class="badge ${badgeSorteada}">${badgeTexto}</span>
                                <h2>${postData.titulo}</h2>
                            </div>
                            <div class="post-excerpt">
                                <p>${postData.resumo}</p>
                            </div>
                            <a href="blog/${fileName}" class="btn btn-primary">Ler artigo completo</a>
                        </article>`;

    // Injetando no topo do blog-feed
    blogHtml = blogHtml.replace('<div class="blog-feed">', '<div class="blog-feed">\n' + newCardHtml);
    
    fs.writeFileSync(blogHtmlPath, blogHtml);
    console.log('blog.html atualizado com sucesso com o novo post.');

  } catch (error) {
    console.error('Erro ao gerar post com a API Gemini:', error);
    process.exit(1);
  }
}

main();