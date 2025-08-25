const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { FieldValue } = require("firebase-admin/firestore");

admin.initializeApp();

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Carga la API Key de forma segura desde la configuración de Firebase
// Para desarrollo local, ejecuta: firebase functions:config:set gemini.key="TU_API_KEY"
const genAI = new GoogleGenerativeAI(functions.config().gemini.key);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Helper function to verify user token
const getAuthenticatedUid = async (req) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        throw new functions.https.HttpsError('unauthenticated', 'No token provided.');
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        throw new functions.https.HttpsError('unauthenticated', 'Invalid token.');
    }
};

exports.generateLogosResponse = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') { return res.status(405).send('Method Not Allowed'); }
        try {
            const { topic } = req.body;
            if (!topic) { return res.status(400).json({ error: "Topic is required." }); }
            
            const prompt = `Genera una guía de oración completa sobre el tema "${topic}". Incluye los siguientes cuatro elementos en formato JSON: 1. Una "historia" o ejemplo bíblico relevante. 2. Un "dato" histórico o teológico interesante relacionado. 3. Una "oracion" que integre el tema, la historia y el dato. 4. Una "keyword" que sea una sola palabra simple en inglés, representativa de la historia, para usar en una búsqueda de imágenes. El formato de la respuesta debe ser un objeto JSON con las claves "story", "fact", "prayer", y "keyword".`;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Find and parse the JSON block from the response text
            let parsedResponse;
            try {
                // Use a regex to find the JSON block, ignoring the markdown backticks
                const jsonMatch = text.match(/\{.*\}/s);
                if (!jsonMatch) {
                    throw new Error("No valid JSON block found in Gemini's response.");
                }
                parsedResponse = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                console.error("Error parsing JSON from Gemini response:", text);
                return res.status(500).json({ error: "Failed to parse the guide from the AI's response." });
            }

            if (!parsedResponse.story || !parsedResponse.fact || !parsedResponse.prayer || !parsedResponse.keyword) {
                let missingFields = [];
                if (!parsedResponse.story) missingFields.push("story");
                if (!parsedResponse.fact) missingFields.push("fact");
                if (!parsedResponse.prayer) missingFields.push("prayer");
                if (!parsedResponse.keyword) missingFields.push("keyword");
                return res.status(500).json({ error: `Gemini's response was incomplete. Missing fields: ${missingFields.join(', ')}.` });
            }
            res.status(200).json(parsedResponse);
        } catch (error) {
            console.error("Error in generateLogosResponse:", error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    });
});

exports.getDailyJourneyContent = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'GET') { return res.status(405).send('Method Not Allowed'); }
        try {
            // 1. Autenticar al usuario y obtener su UID
            const uid = await getAuthenticatedUid(req);

            // 2. Obtener el perfil del usuario desde Firestore
            const profileDoc = await admin.firestore().collection('profiles').doc(uid).get();
            let userName = 'tú';
            let partnerName = 'tu pareja';
            if (profileDoc.exists) {
                userName = profileDoc.data().userName || userName;
                partnerName = profileDoc.data().partnerName || partnerName;
            }

            // 3. Construir el prompt personalizado
            const day = new Date().getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
            const dayDocRef = admin.firestore().collection('dailyJourney').doc(`day${day}`);
            const dayDoc = await dayDocRef.get();

            if (!dayDoc.exists) {
                return res.status(404).json({ error: "No content found for today's journey." });
            }

            const dailyContent = dayDoc.data();
            const title = dailyContent.title;
            const seed = dailyContent.seed;

            // Construir el prompt personalizado para Gemini usando la "semilla"
            const prompt = `Eres un consejero matrimonial y espiritual. Basado en la siguiente reflexión/desafío: "${seed}". Genera un párrafo corto y práctico para la pareja ${userName} y ${partnerName}. Asegúrate de que el tono sea inspirador y que el contenido sea directamente aplicable a su relación.`;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            res.status(200).json({ title: title, content: text });
        } catch (error) {
            console.error("Error in getDailyJourneyContent:", error);
            res.status(error.code === 'unauthenticated' ? 401 : 500).json({ error: error.message });
        }
    });
});

exports.setUserProfile = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') { return res.status(405).send('Method Not Allowed'); }
        try {
            const uid = await getAuthenticatedUid(req);
            const { userName, partnerName, userLoveLanguage, partnerLoveLanguage } = req.body;
            if (!userName || !partnerName) { throw new functions.https.HttpsError('invalid-argument', 'Names are required.'); }
            
            const profileData = {
                userName,
                partnerName,
                userLoveLanguage: userLoveLanguage || null,
                partnerLoveLanguage: partnerLoveLanguage || null,
                updatedAt: FieldValue.serverTimestamp()
            };

            const profileRef = admin.firestore().collection('profiles').doc(uid);
            await profileRef.set(profileData, { merge: true });

            res.status(200).json({ success: true, message: 'Perfil guardado con éxito.' });
        } catch (error) {
            console.error("Error saving profile:", error);
            res.status(error.code === 'unauthenticated' ? 401 : 500).json({ error: error.message });
        }
    });
});

exports.getUserProfile = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'GET') { return res.status(405).send('Method Not Allowed'); }
        try {
            const uid = await getAuthenticatedUid(req);
            const profileRef = admin.firestore().collection('profiles').doc(uid);
            const doc = await profileRef.get();

            if (!doc.exists) {
                res.status(200).json({ profile: null });
            } else {
                res.status(200).json({ profile: doc.data() });
            }
        } catch (error) {
            console.error("Error getting profile:", error);
            res.status(error.code === 'unauthenticated' ? 401 : 500).json({ error: error.message });
        }
    });
});

exports.generateLoveLanguageIdea = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') { return res.status(405).send('Method Not Allowed'); }
        try {
            const uid = await getAuthenticatedUid(req);
            const { userLoveLanguage, partnerLoveLanguage } = req.body;

            if (!userLoveLanguage || !partnerLoveLanguage) {
                throw new functions.https.HttpsError('invalid-argument', 'Love languages are required.');
            }

            const prompt = `Eres un consejero matrimonial. Genera una idea práctica y concreta para que una pareja exprese amor, considerando que el lenguaje del amor de uno es '${userLoveLanguage}' y el del otro es '${partnerLoveLanguage}'. La idea debe ser positiva, fácil de realizar hoy y enfocada en la conexión. Devuelve solo la idea, sin introducciones ni conclusiones.`;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            res.status(200).json({ idea: text });
        } catch (error) {
            console.error("Error in generateLoveLanguageIdea:", error);
            res.status(error.code === 'unauthenticated' ? 401 : 500).json({ error: error.message });
        }
    });
});
