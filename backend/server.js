const http = require('http');

const testData = {
    "paciencia": {
        story: "La paciencia con los hijos... me lleva a la historia de Jacob. Amaba profundamente a sus hijos, pero a menudo luchaba con el favoritismo y las complejas dinámicas familiares que esto creaba. Su amor era real, pero su paciencia y sabiduría fueron probadas durante décadas de conflictos familiares, como la venta de su amado hijo José.",
        fact: "Un dato histórico interesante de mi Biblioteca es que la 'túnica de muchos colores' que Jacob le dio a José no era simplemente una prenda bonita. Probablemente era una 'ketonet passim', una túnica ornamental con mangas largas, que simbolizaba que el portador estaba exento de los trabajos manuales. Era una declaración pública de favoritismo que garantizaba el conflicto. La falta de sabiduría de Jacob puso a prueba su paciencia futura.",
        prayer: "Señor, hoy te pedimos la paciencia que a menudo le faltó a Jacob. Confesamos que, como él, a veces nuestro amor se nubla por el cansancio y la frustración, creando conflicto. Ayúdanos a no dar 'túnicas de colores' que generen rivalidad, sino a mostrar un amor sabio y equitativo. Danos una paciencia que persevere a través de las estaciones difíciles de la crianza, confiando en que estás formando tanto el carácter de nuestros hijos como el nuestro. Amén.",
        keyword: "patience,children,family"
    },
    "amor": {
        story: "El amor incondicional... me lleva a la historia de Oseas y Gomer. A pesar de la infidelidad de Gomer, Oseas fue llamado por Dios a amarla y redimirla, reflejando el amor de Dios por Israel a pesar de su infidelidad.",
        fact: "El libro de Oseas es una poderosa alegoría del pacto de Dios con su pueblo. La relación de Oseas y Gomer simboliza la relación de Dios con Israel, mostrando la fidelidad inquebrantable de Dios a pesar de la infidelidad de su pueblo.",
        prayer: "Padre celestial, ayúdanos a amar con un amor incondicional como el tuyo, incluso cuando sea difícil. Que nuestro amor refleje tu fidelidad y gracia, perdonando y restaurando como tú lo haces. Amén.",
        keyword: "love,unconditional,faithfulness"
    }
};

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permite cualquier origen
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/api/logos/generate' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const { topic } = JSON.parse(body);
                let responseData = {};

                // Simulación de la lógica de Logos
                if (topic.toLowerCase().includes('paciencia')) {
                    responseData = testData.paciencia;
                } else if (topic.toLowerCase().includes('amor')) {
                    responseData = testData.amor;
                } else {
                    // Respuesta por defecto si no coincide con los temas de prueba
                    responseData = {
                        story: "No encontramos una historia específica para este tema, pero recuerda que Dios siempre está contigo.",
                        fact: "La Biblia es rica en sabiduría para cada situación de la vida.",
                        prayer: `Señor, te pedimos guía y sabiduría para ${topic}. Amén.`,
                        keyword: "general,faith"
                    };
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(responseData));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON or topic' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Endpoint not found' }));
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
