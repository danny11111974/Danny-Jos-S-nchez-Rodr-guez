/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Inicialización de Google GenAI
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Ruta de comprobación de salud
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  });
});

// Endpoint principal: Diagnóstico Forense basado en Identificación Real con IA
app.post('/api/diagnose', async (req: Request, res: Response) => {
  try {
    const { image, images, video, contextText } = req.body;

    const allImages: Array<{ mimeType: string; data: string; name?: string }> = [];
    if (image && image.data && image.mimeType) {
      allImages.push(image);
    }
    if (Array.isArray(images)) {
      for (const img of images) {
        if (img && img.data && img.mimeType) {
          allImages.push(img);
        }
      }
    }

    const hasMedia = allImages.length > 0 || (video && video.data && video.mimeType);
    const hasText = contextText && typeof contextText === 'string' && contextText.trim().length > 0;

    if (!hasMedia && !hasText) {
      return res.status(400).json({
        error: 'Debe suministrar al menos una fotografía, video o descripción de síntomas para realizar el peritaje.',
      });
    }

    if (!aiClient) {
      return res.status(500).json({
        error: 'El servicio de IA no está configurado (falta GEMINI_API_KEY en el servidor).',
      });
    }

    const forensicSystemInstruction = `Eres un consultor experto en ingeniería electromecánica, análisis de fallas forenses y confiabilidad operacional.

REGLA CRÍTICA Y ESTRICTA:
1. NO INVENTES NADA. Tu responsabilidad primordial es IDENTIFICAR VISUALMENTE con la IA qué componente, pieza o equipo electromecánico aparece en la fotografía o video adjunto (por ejemplo: pista interna o externa de rodamiento, elementos rodantes, jaula, devanado de estator, barras o paquete del rotor, muñón de eje, chavetero, cara de rozamiento de sello mecánico, impulsor de bomba, engranajes, bornera eléctrica, etc.).
2. Realiza el diagnóstico basándote 100% en lo que se observa física y realmente en la imagen: marcas de desgaste, picado superficial, desconchado, fracturas, decoloración térmica, acanalado/fluting por corriente eléctrica, cavitación, fisuras o degradación del lubricante.
3. Si el usuario no proporcionó imagen o video, basa tu análisis exclusiva y estrictamente en la descripción y síntomas descritos en el texto del operador, sin suponer componentes ni inventar datos.

La respuesta DEBE estructurarse OBLIGATORIAMENTE en las siguientes 4 secciones con formato Markdown estandarizado:

## 1. Descripción Real de lo Observado
- Identificación visual exacta del componente o equipo que aparece en la imagen.
- Desglose objetivo, milimétrico y detallado de lo que se observa físicamente en la pieza: estado de la superficie, patrones de deterioro, picaduras (pitting), desconchado (spalling), fracturas visibles, decoloración por sobrecalentamiento, estrías de fluting por corrientes parásitas, fisuras, estado de lubricación observable, etc.

## 2. Planteamiento del Problema
- Causa raíz técnica más probable deducida a partir de la evidencia visual observada.
- Componente específico comprometido y subsistema (Mecánico, Eléctrico, Hidráulico, Neumático o Control).
- Grado de criticidad operacional (Bajo, Medio, Alto, Inmediato/Catastrófico) según riesgo de parada o daño colateral.

## 3. Análisis Real
- Deducción basada en primeros principios de ingeniería: correlación termodinámica, esfuerzos mecánicos (tensión, cizalladura, fatiga por contacto rodante), fenómenos electromagnéticos (descargas por corrientes de eje por VFD, descargas parciales) o tribología (rotura de película lubricante elasto-hidrodinámica, abrasión por contaminantes).
- Justificación física y técnica de cómo se produjo y progresó el deterioro visible en la imagen.

## 4. Soluciones Detalladas
- **Contención Inmediata:** Medidas de seguridad y prevención de daños secundarios.
- **Procedimiento de Reparación Definitivo:** Guía técnica paso a paso para el desmontaje, sustitución o reacondicionamiento del componente identificado.
- **Herramientas, Insumos y Repuestos:** Lista concreta acorde a la pieza identificada (extractores, calentador inductivo, micrómetro, torquímetro, lubricante adecuado, especificaciones de repuesto con tolerancias).
- **Plan Preventivo y Confiabilidad:** Medidas para evitar recurrencia (rutas de vibración, termografía, análisis de aceite, alineación láser o aislamiento del rodamiento).`;

    const userPromptText = `INSPECCIÓN FORENSE ELECTROMECÁNICA SOLICITADA.

${hasMedia ? 'SE ADJUNTA EVIDENCIA VISUAL (FOTOGRAFÍA / VIDEO). Por favor, identifica con precisión el componente mostrado en la imagen y realiza el diagnóstico pericial basado exclusivamente en lo que se observa físicamente en la pieza.' : 'NO SE ADJUNTÓ IMAGEN. Basa el análisis rigurosamente en la descripción provista a continuación.'}

DESCRIPCIÓN / SÍNTOMAS DEL OPERADOR:
${hasText ? contextText.trim() : 'Sin descripción adicional. Basa el peritaje 100% en la identificación y análisis de la imagen adjunta.'}
`;

    const parts: any[] = [{ text: userPromptText }];

    // Adjuntar imágenes
    for (const img of allImages) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      });
    }

    // Adjuntar video
    if (video && video.data && video.mimeType) {
      parts.push({
        inlineData: {
          mimeType: video.mimeType,
          data: video.data,
        },
      });
    }

    console.log('[ELECTRO-DIAG] Iniciando peritaje con Gemini 3.8 Flash (partes:', parts.length, ')...');
    const startTime = Date.now();

    let response: any = null;
    let modelUsed = 'gemini-3.8-flash';

    // Intento primario con gemini-3.8-flash
    try {
      response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: parts,
        config: {
          systemInstruction: forensicSystemInstruction,
          temperature: 0.2,
        },
      });
    } catch (primaryErr: any) {
      const errStr = primaryErr?.message || '';
      console.warn('[ELECTRO-DIAG] Incidencia en modelo primario (gemini-3.8-flash):', errStr);
      
      // Si hay 503 o alta demanda, intentar con modelo alternativo gemini-flash-latest
      if (errStr.includes('503') || errStr.includes('high demand') || errStr.includes('UNAVAILABLE') || errStr.includes('resource exhausted')) {
        console.log('[ELECTRO-DIAG] Reintentando peritaje con gemini-flash-latest...');
        modelUsed = 'gemini-flash-latest';
        response = await aiClient.models.generateContent({
          model: 'gemini-flash-latest',
          contents: parts,
          config: {
            systemInstruction: forensicSystemInstruction,
            temperature: 0.2,
          },
        });
      } else {
        throw primaryErr;
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[ELECTRO-DIAG] Respuesta pericial recibida en ${elapsed}ms utilizando ${modelUsed}.`);

    const reportMarkdown = response?.text || '';
    if (!reportMarkdown) {
      throw new Error('El modelo de IA no devolvió texto de respuesta para la evidencia provista.');
    }

    return res.json({
      success: true,
      source: modelUsed,
      reportMarkdown,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[ELECTRO-DIAG] Error al procesar diagnóstico:', error?.message || error);
    let userMsg = error?.message || 'Error al comunicarse con la IA para analizar la foto.';
    if (userMsg.includes('503') || userMsg.includes('high demand') || userMsg.includes('UNAVAILABLE')) {
      userMsg = 'El servicio de IA está experimentando alta demanda momentánea. Por favor vuelva a hacer clic en "Ejecutar Diagnóstico" en unos segundos.';
    }
    return res.status(500).json({
      error: userMsg,
    });
  }
});

// Configuración de Vite / Servidor Estático
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ELECTRO-DIAG Pro] Servidor activo en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
