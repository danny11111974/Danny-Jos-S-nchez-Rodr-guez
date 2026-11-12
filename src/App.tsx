/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Cpu,
  Sliders,
  Camera,
  UploadCloud,
  Aperture,
  Trash2,
  Video,
  Film,
  XCircle,
  FileText,
  SearchCheck,
  ShieldAlert,
  Copy,
  Printer,
  Check,
  AlertTriangle,
  X,
  Sparkles
} from 'lucide-react';
import { marked } from 'marked';

// Configuración de Marked para seguridad y formato técnico
marked.setOptions({
  gfm: true,
  breaks: true,
});

export default function App() {
  // Entradas Multimedia
  const [selectedImage, setSelectedImage] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
    name: string;
  } | null>(null);

  const [selectedVideo, setSelectedVideo] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
    name: string;
    sizeMB: string;
  } | null>(null);

  const [contextText, setContextText] = useState('');

  // Estado del Proceso
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Inicializando peritaje...');
  const [progressPercent, setProgressPercent] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [noticeMessage, setNoticeMessage] = useState<{ text: string; type: 'warning' | 'error' } | null>(null);

  // Resultado
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [reportTimestamp, setReportTimestamp] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const showNotice = (text: string, type: 'warning' | 'error' = 'warning') => {
    setNoticeMessage({ text, type });
    setTimeout(() => {
      setNoticeMessage((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  // Manejo de Imágenes (Subir o Tomar con Cámara)
  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotice('El archivo seleccionado debe ser una imagen válida (JPG, PNG, WEBP).', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const fullBase64 = evt.target?.result as string;
      const base64Data = fullBase64.split(',')[1];
      setSelectedImage({
        base64: base64Data,
        mimeType: file.type,
        previewUrl: fullBase64,
        name: file.name,
      });
      setNoticeMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Manejo de Video
  const handleVideoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showNotice('El archivo de video supera el límite de 20 MB. Seleccione un clip más corto.', 'warning');
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const fullBase64 = evt.target?.result as string;
      const base64Data = fullBase64.split(',')[1];
      setSelectedVideo({
        base64: base64Data,
        mimeType: file.type,
        previewUrl: fullBase64,
        name: file.name,
        sizeMB: (file.size / (1024 * 1024)).toFixed(2),
      });
      setNoticeMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const clearVideo = () => {
    setSelectedVideo(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Temporizador de Diagnóstico
  const startTimer = () => {
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => parseFloat((s + 0.1).toFixed(1)));
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Ejecución de Peritaje Forense con IA
  const executeForensicAnalysis = async () => {
    if (!selectedImage && !selectedVideo && !contextText.trim()) {
      showNotice('Debe suministrar al menos un elemento de entrada (Fotografía, Video o Síntomas/Contexto operativo).', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setProgressPercent(20);
    setStatusMessage('Codificando telemetría y evidencias multimedia...');
    startTimer();

    try {
      setTimeout(() => {
        setProgressPercent(50);
        setStatusMessage('Identificando componente y analizando evidencia visual con IA...');
      }, 700);

      setTimeout(() => {
        setProgressPercent(80);
        setStatusMessage('Compilando dictamen forense y correlacionando normativas...');
      }, 1800);

      const payload = {
        image: selectedImage
          ? {
              mimeType: selectedImage.mimeType,
              data: selectedImage.base64,
              name: selectedImage.name,
            }
          : undefined,
        video: selectedVideo
          ? {
              mimeType: selectedVideo.mimeType,
              data: selectedVideo.base64,
            }
          : undefined,
        contextText: contextText.trim(),
      };

      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error del servidor HTTP ${response.status}`);
      }

      const data = await response.json();
      setProgressPercent(100);
      setStatusMessage('Dictamen pericial generado satisfactoriamente.');

      setReportMarkdown(data.reportMarkdown);
      const now = new Date();
      setReportTimestamp(
        `GENERADO: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
      );
    } catch (err: any) {
      console.error('Error en diagnóstico:', err);
      showNotice(`Fallo en el diagnóstico: ${err.message || 'Error de procesamiento'}`, 'error');
    } finally {
      stopTimer();
      setIsAnalyzing(false);
    }
  };

  // Copiar al portapapeles
  const copyReportToClipboard = () => {
    if (!reportMarkdown) return;
    navigator.clipboard
      .writeText(reportMarkdown)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch((err) => {
        showNotice('No se pudo copiar al portapapeles: ' + err, 'error');
      });
  };

  return (
    <div className="h-full min-h-screen flex flex-col font-sans antialiased bg-slate-950 text-slate-100">
      {/* NAVBAR TÉCNICA */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2">
              ELECTRO-DIAG AI{' '}
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                v1.5 PRO CORE
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Auditoría Forense & Diagnóstico Electromecánico Multimodal
            </p>
          </div>
        </div>

        <div id="header-controls" className="flex items-center space-x-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Gemini 3.8 Flash // Listo</span>
          </div>
        </div>
      </header>

      {/* AVISO / TOAST */}
      {noticeMessage && (
        <div
          className={`px-6 py-2.5 flex items-center justify-between text-xs font-medium border-b transition-all ${
            noticeMessage.type === 'error'
              ? 'bg-rose-950/90 border-rose-800 text-rose-200'
              : 'bg-amber-950/90 border-amber-800 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{noticeMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="p-1 hover:bg-white/10 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* WORKSPACE PRINCIPAL */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950">
        {/* PANEL DE ENTRADA (COLUMNA IZQUIERDA) */}
        <section
          id="input-panel"
          className="w-full lg:w-1/2 p-6 overflow-y-auto border-r border-slate-800 space-y-6"
        >
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" /> Parámetros de Operación
              </h2>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Temperatura: 0.2 (Riguroso)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Aplicable a motores, bombas, reductores, cuadros de distribución, actuadores, compresores y trenes de potencia electromecánicos en general.
            </p>
          </div>

          {/* ENTRADA 1: FOTOGRAFÍA ESTÁTICA / ALTA RESOLUCIÓN */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Camera className="w-4 h-4 text-sky-400" /> Fotografía / Imagen de Detalle (Macro/Falla)
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-sky-500/50 rounded-lg cursor-pointer bg-slate-950/40 hover:bg-slate-900/40 transition">
                <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-medium text-slate-300">Seleccionar o Arrastrar Foto</span>
                <span className="text-[10px] text-slate-500">JPG, PNG, WEBP</span>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelected}
                />
              </label>

              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-lg cursor-pointer bg-slate-950/40 hover:bg-slate-900/40 transition">
                <Aperture className="w-6 h-6 text-emerald-400 mb-1" />
                <span className="text-xs font-medium text-slate-300">Tomar Foto con Cámara</span>
                <span className="text-[10px] text-slate-500">Cámara Directa</span>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageSelected}
                />
              </label>
            </div>

            {selectedImage && (
              <div className="mt-3 relative rounded-lg overflow-hidden border border-slate-800 bg-black/60 p-2">
                <img
                  src={selectedImage.previewUrl}
                  alt={selectedImage.name}
                  className="max-h-48 w-full object-contain mx-auto rounded"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-3 right-3 p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-md text-xs backdrop-blur-sm transition"
                  title="Eliminar foto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="mt-2 text-center text-[11px] font-mono text-slate-400 truncate">
                  {selectedImage.name}
                </div>
              </div>
            )}
          </div>

          {/* ENTRADA 2: SECUENCIA DE VIDEO */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-400" /> Registro de Video (Vibración / Dinámica / Ruido)
            </label>

            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-lg cursor-pointer bg-slate-950/40 hover:bg-slate-900/40 transition">
                <Film className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-medium text-slate-300">Cargar Clip Corto de Video (&lt; 20 MB)</span>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={handleVideoSelected}
                />
              </label>
            </div>

            {selectedVideo && (
              <div className="mt-3 relative rounded-lg overflow-hidden border border-slate-800 bg-black/60 p-2">
                <video
                  src={selectedVideo.previewUrl}
                  controls
                  className="max-h-48 w-full rounded"
                />
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-[11px] font-mono text-slate-400">
                    {selectedVideo.name} ({selectedVideo.sizeMB} MB)
                  </span>
                  <button
                    type="button"
                    onClick={clearVideo}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Descartar Video
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ENTRADA 3: DESCRIPCIÓN CONTEXTUAL Y TELEMETRÍA */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" /> Contexto Operativo y Síntomas Percibidos
            </label>
            <textarea
              rows={4}
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              placeholder="Ej: Motor trifásico de jaula de ardilla 75 kW que acciona bomba centrífuga multietapa. Se detecta incremento de temperatura superficial en chumacera lado acople (>85°C), ruido seco tipo cascabeleo e incremento de vibración axial tras parada imprevista del proceso..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-400 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none font-sans"
            />
          </div>

          {/* BOTÓN DE DISPARO DEL DIAGNÓSTICO */}
          <button
            type="button"
            onClick={executeForensicAnalysis}
            disabled={isAnalyzing}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-bold uppercase tracking-wider text-sm rounded-xl shadow-lg shadow-sky-500/10 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SearchCheck className="w-5 h-5" />
            <span>{isAnalyzing ? 'Identificando y Analizando con IA...' : 'Ejecutar Diagnóstico Forense Gemini'}</span>
          </button>

          {/* INDICADORES DE ESTADO EN TIEMPO REAL */}
          {isAnalyzing && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                  {statusMessage}
                </span>
                <span className="text-slate-500">{elapsedSeconds.toFixed(1)}s</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-400 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          )}
        </section>

        {/* PANEL DE RESULTADOS (COLUMNA DERECHA) */}
        <section
          id="output-panel"
          className="w-full lg:w-1/2 flex flex-col h-full bg-slate-950"
        >
          {/* TOOLBAR DE SALIDA */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Dictamen Técnico Pericial
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyReportToClipboard}
                disabled={!reportMarkdown}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                disabled={!reportMarkdown}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
              </button>
            </div>
          </div>

          {/* ÁREA DE CONTENIDO / REPORTE */}
          <div className="flex-1 p-6 overflow-y-auto">
            {!reportMarkdown ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 max-w-sm mx-auto space-y-3 py-12">
                <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-600">
                  <ShieldAlert className="w-10 h-10" />
                </div>
                <h3 className="text-sm font-semibold text-slate-400">Sin Auditoría en Curso</h3>
                <p className="text-xs">
                  Cargue fotografías, video y notas de telemetría de cualquier máquina electromecánica y ejecute el análisis para recibir el desglose técnico estructurado.
                </p>
              </div>
            ) : (
              <div
                className="prose-industrial text-slate-200 text-xs"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(reportMarkdown) as string,
                }}
              />
            )}
          </div>

          {/* FOOTER DEL REPORTE */}
          <div className="px-6 py-2.5 bg-slate-900/60 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center font-mono shrink-0">
            <span>ISO 14224 / ISO 10816 / IEEE 43 COMPLIANT FORMAT</span>
            <span>{reportTimestamp || '--/--/--'}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
