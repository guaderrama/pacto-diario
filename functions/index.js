const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { FieldValue } = require("firebase-admin/firestore");

admin.initializeApp();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = "AIzaSyDWdc6YiwzwNdCTFyu2i7VBSvdXsJjheMU"; // Hardcoded for local testing
const genAI = new GoogleGenerativeAI(API_KEY);
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
            const parsedResponse = JSON.parse(text.replace(/```json\n|```/g, ''));

            if (!parsedResponse.story || !parsedResponse.fact || !parsedResponse.prayer || !parsedResponse.keyword) {
                return res.status(500).json({ error: "Gemini's response was incomplete." });
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
            const day = new Date().getDay();
            let prompt = "";
            let title = "";
            switch (day) {
                case 0: case 6: title = "Conexión Divertida"; prompt = `Eres un consejero de parejas. Genera una idea corta, original y divertida para que una pareja (${userName} y ${partnerName}) conecte hoy. El objetivo es reír juntos. La respuesta debe ser un solo párrafo.`; break;
                case 1: title = "Santuario de Oración"; prompt = `Eres un consejero espiritual. Genera una reflexión corta para ${userName} y ${partnerName} sobre la importancia de empezar la semana orando en pareja. Anima a compartir una preocupación y orar el uno por el otro. La respuesta debe ser un solo párrafo.`; break;
                case 2: title = "Traduciendo el Amor (Gary Chapman)"; prompt = `Actuando como un consejero matrimonial inspirado en 'Los 5 Lenguajes del Amor' de Gary Chapman, genera un reto práctico y corto sobre el lenguaje del amor 'Actos de Servicio' para la pareja ${userName} y ${partnerName}. La respuesta debe ser un solo párrafo.`; break;
                case 3: title = "Crecimiento y Santidad (Gary Thomas)"; prompt = `Actuando como un consejero matrimonial inspirado en la obra 'Sacred Marriage' de Gary Thomas, genera una pregunta de reflexión para ${userName} y ${partnerName} sobre cómo ver una frustración reciente como una oportunidad de crecimiento espiritual. La respuesta debe ser un solo párrafo.`; break;
                case 4: title = "Ancla del Pacto"; prompt = `Eres un consejero matrimonial. Genera una reflexión corta para ${userName} y ${partnerName} sobre la importancia de recordar y reafirmar su compromiso. Anímalos a compartir tres cosas que valoran el uno del otro. La respuesta debe ser un solo párrafo.`; break;
                case 5: title = "Comunicación y Paz"; prompt = `Eres un experto en comunicación de parejas. Genera un reto práctico y corto para ${userName} y ${partnerName} para practicar la escucha activa durante 10 minutos sin interrupciones. El objetivo no es solucionar problemas, sino entenderse. La respuesta debe ser un solo párrafo.`; break;
            }
            if (prompt === "") { return res.status(500).json({ error: "Could not determine prompt for today." }); }

            // 4. Llamar a Gemini y devolver la respuesta
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
            const { userName, partnerName } = req.body;
            if (!userName || !partnerName) { throw new functions.https.HttpsError('invalid-argument', 'Names are required.'); }
            
            const profileRef = admin.firestore().collection('profiles').doc(uid);
            await profileRef.set({ userName, partnerName, updatedAt: FieldValue.serverTimestamp() });

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
