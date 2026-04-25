const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

// Inicializando a API do Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
  try {
    const prompt = `Você é um especialista em refrigeração comercial e residencial escrevendo para o blog da 'Frank Refrigeração'. 
Seu objetivo é escrever um artigo completo e aprofundado (800 a 1200 palavras) focado em SEO. 
Pesquise e aborde tendências recentes, inovações tecnológicas ou guias definitivos de manutenção sobre ar condicionado, geladeiras, ou tecnologia Inverter. Não faça apenas comentários rasos, entregue um conteúdo rico, útil e com dicas práticas reais.
O tom deve ser amigável, acessível para leigos, mas demonstrando alta autoridade técnica.

Retorne sua resposta ESTRITAMENTE em formato JSON com as seguintes chaves:
- "titulo": Um título chamativo para o post.
- "slug": O título formatado para URL (sem espaços, sem acentos, minúsculo, separado por hífens).
- "resumo": Uma frase curta (máx 150 caracteres) resumindo o post para o card do blog.
- "conteudoHtml": O texto do artigo completo já formatado em tags HTML básicas (<p>, <h2>, <h3>, <ul>, <li>, <strong>). Não inclua as tags <html>, <head> ou <body>, apenas o conteúdo interno. Não use Markdown no texto HTML.`;

    const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            tools: [{ googleSearch: {} }]
        }
    });

    const postData = JSON.parse(response.text);
    
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
                    <article class="service-card reveal" style="text-align: left;">
                        <span class="badge" style="background: var(--primary-blue); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; margin-bottom: 1rem; display: inline-block;">IA HUMANIZADA</span>
                        <div class="service-icon" style="font-size: 1.5rem; margin-bottom: 0.5rem;">❄️</div>
                        <h3>${postData.titulo}</h3>
                        <p>${postData.resumo}</p>
                        <a href="blog/${fileName}" class="btn btn-outline" style="margin-top: 1rem; display: inline-block;">Ler artigo completo</a>
                        <p class="back-link" style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-muted); cursor: pointer;" onclick="document.querySelector('.card-overlay').click()">← Voltar</p>
                    </article>`;

    // Injetando no topo do service-grid
    blogHtml = blogHtml.replace('<div class="service-grid">', '<div class="service-grid">\n' + newCardHtml);
    
    fs.writeFileSync(blogHtmlPath, blogHtml);
    console.log('blog.html atualizado com sucesso com o novo post.');

  } catch (error) {
    console.error('Erro ao gerar post com a API Gemini:', error);
    process.exit(1);
  }
}

main();