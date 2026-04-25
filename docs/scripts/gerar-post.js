const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

// Inicializando a API do Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
  try {
    const prompt = `Você é um especialista em refrigeração comercial e residencial. 
Crie uma postagem de blog envolvente sobre um tema interessante de ar condicionado ou geladeira.
O público alvo são donos de casa e comerciantes que querem entender melhor seus equipamentos.

Gere um JSON com os seguintes campos:
- titulo: Título atrativo do post
- slug: url-amigavel-do-post
- resumo: Breve resumo (1-2 frases)
- conteudoHtml: Conteúdo completo do post em HTML (use <h2>, <p>, <ul>, etc). Não inclua <html>, <head> ou <body>, apenas o miolo da postagem.`;

    const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
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