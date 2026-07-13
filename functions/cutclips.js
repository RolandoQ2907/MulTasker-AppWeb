document.addEventListener('DOMContentLoaded', () => {
    const bottomNavItems = document.querySelectorAll('.bottom-nav__item');
    const economySection = document.querySelector('.economy-section');
    const calendarSection = document.querySelector('.calendar-section');
    const cutclipsSection = document.querySelector('.cutclips-section');

    // Elementos de la sección CutClips
    const cutForm = document.getElementById('cutForm');
    const audioInput = document.getElementById('audioFile');
    const clipStart = document.getElementById('clipStart');
    const clipEnd = document.getElementById('clipEnd');
    const cutResult = document.getElementById('cutResult');
    const cutSubmitBtn = cutForm ? cutForm.querySelector('button[type="submit"]') : null;

    // Elementos de estado / progreso
    const clipInfo = document.getElementById('clipInfo');         // "Clip de 23 s"
    const totalEta = document.getElementById('totalEta');         // "Tiempo aprox: 3 s"
    const cutProgressBar = document.getElementById('cutProgressBar');   // barra recorte
    const cutProgressPct = document.getElementById('cutProgressPct');   // porcentaje recorte
    const convProgressBar = document.getElementById('convProgressBar');  // barra conversión
    const convProgressPct = document.getElementById('convProgressPct');  // porcentaje conversión

    // Botón de descarga y URL del último clip
    const downloadClipBtn = document.getElementById('downloadClipBtn');
    let clipCounter = 1;
    let lastClipUrl = null;

    function showSection(tab) {
        if (economySection) economySection.style.display = tab === 'economy' ? 'flex' : 'none';
        if (calendarSection) calendarSection.style.display = tab === 'calendar' ? 'flex' : 'none';
        if (cutclipsSection) cutclipsSection.style.display = tab === 'cutclips' ? 'flex' : 'none';
    }

    // Navegación inferior
    bottomNavItems.forEach(btn => {
        btn.addEventListener('click', () => {
            bottomNavItems.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            showSection(btn.dataset.tab);
        });
    });

    // Mostrar por defecto la sección de economía
    showSection('economy');

    // Helper: HH:MM:SS → segundos
    function timeToSeconds(timeValue) {
        if (!timeValue) return 0;
        const parts = timeValue.split(':').map(Number);

        if (parts.length === 3) {
            const [hh, mm, ss] = parts;
            return hh * 3600 + mm * 60 + ss;
        }

        if (parts.length === 2) {
            const [hh, mm] = parts;
            return hh * 3600 + mm * 60;
        }

        return Number(timeValue) || 0;
    }

    // Helpers de progreso
    function setProgress(barEl, pctEl, value) {
        const v = Math.max(0, Math.min(100, value));
        if (barEl) barEl.style.width = v + '%';
        if (pctEl) pctEl.textContent = `${v.toFixed(0)}%`;
    }

    function resetProgressUI() {
        setProgress(cutProgressBar, cutProgressPct, 0);
        setProgress(convProgressBar, convProgressPct, 0);
        if (clipInfo) clipInfo.textContent = '';
        if (totalEta) totalEta.textContent = '';
    }

    function setProcessingState(isProcessing) {
        if (cutSubmitBtn) {
            cutSubmitBtn.disabled = isProcessing;
            cutSubmitBtn.textContent = isProcessing ? 'Procesando...' : 'Recortar y convertir';
        }
    }

    if (cutForm) {
        cutForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!audioInput || !audioInput.files[0]) {
                alert('Selecciona un archivo de audio.');
                return;
            }

            const startValue = clipStart?.value || '';
            const endValue = clipEnd?.value || '';

            if (!startValue || !endValue) {
                alert('Completa los campos Desde y Hasta.');
                return;
            }

            const startSeconds = timeToSeconds(startValue);
            const endSeconds = timeToSeconds(endValue);
            const duration = endSeconds - startSeconds;

            if (duration <= 0) {
                alert('El tiempo final debe ser mayor que el inicial.');
                return;
            }

            // UI: inicializar estado al hacer clic
            if (clipInfo) {
                clipInfo.textContent = `Clip de ${duration.toFixed(1)} s`;
            }

            const estimatedTotalSec = Math.max(1, duration * 0.15 + 1);
            if (totalEta) {
                totalEta.textContent = `Tiempo aprox: ${estimatedTotalSec.toFixed(1)} s`;
            }

            resetProgressUI();
            setProgress(cutProgressBar, cutProgressPct, 0);
            setProgress(convProgressBar, convProgressPct, 0);
            setProcessingState(true);

            if (cutResult) {
                cutResult.textContent = 'Procesando recorte y conversión...';
            }

            // Reset botón de descarga
            if (downloadClipBtn) {
                downloadClipBtn.style.display = 'none';
                downloadClipBtn.disabled = true;
            }
            lastClipUrl = null;

            const startOverall = performance.now();

            try {
                const file = audioInput.files[0];
                // Nombre original y separación base/ext
                const originalName = file.name || 'clip.mp3';
                let baseName = originalName;
                let ext = 'mp3';

                const lastDotIndex = originalName.lastIndexOf('.');
                if (lastDotIndex !== -1) {
                    baseName = originalName.slice(0, lastDotIndex);
                    ext = originalName.slice(lastDotIndex + 1);
                }

                // Vamos a generar siempre MP3, así que forzamos extensión
                currentBaseName = baseName;
                currentExt = 'mp3';

                const arrayBuffer = await file.arrayBuffer();

                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                const sampleRate = audioBuffer.sampleRate;
                const channels = audioBuffer.numberOfChannels;

                const startSample = Math.floor(startSeconds * sampleRate);
                const endSample = Math.floor(endSeconds * sampleRate);
                const frameCount = endSample - startSample;

                if (frameCount <= 0) {
                    alert('El rango de recorte es inválido.');
                    setProcessingState(false);
                    return;
                }

                // 1) Recorte en bloques con progreso
                const clippedBuffer = audioCtx.createBuffer(
                    channels,
                    frameCount,
                    sampleRate
                );

                const cutTotalSteps = channels * frameCount;
                let cutDoneSteps = 0;
                const cutBlockSize = 20000; // muestras por bloque

                function processCutBlock(ch, i) {
                    // Si hemos terminado todos los canales
                    if (ch >= channels) {
                        setProgress(cutProgressBar, cutProgressPct, 100);
                        // Pasar a conversión
                        startMp3Conversion(clippedBuffer, startOverall, estimatedTotalSec);
                        return;
                    }

                    const channelData = audioBuffer.getChannelData(ch);
                    const clippedData = clippedBuffer.getChannelData(ch);

                    const endIndex = Math.min(frameCount, i + cutBlockSize);

                    for (let k = i; k < endIndex; k++) {
                        clippedData[k] = channelData[startSample + k];
                        cutDoneSteps++;
                    }

                    const pct = (cutDoneSteps / cutTotalSteps) * 100;
                    setProgress(cutProgressBar, cutProgressPct, pct);

                    if (endIndex < frameCount) {
                        // Más bloques en el mismo canal
                        setTimeout(() => processCutBlock(ch, endIndex), 0);
                    } else {
                        // Pasar al siguiente canal
                        setTimeout(() => processCutBlock(ch + 1, 0), 0);
                    }
                }

                // Iniciar recorte bloque a bloque
                processCutBlock(0, 0);
            } catch (err) {
                console.error(err);
                if (cutResult) {
                    cutResult.textContent = 'Error al procesar el audio.';
                } else {
                    alert('Error al procesar el audio.');
                }
                setProcessingState(false);
            }
        });
    }

    // 2) Conversión MP3 con progreso en bloques y botón de descarga
    function startMp3Conversion(buffer, startOverall, estimatedTotalSec) {
        const wavArrayBuffer = audioBufferToWavArrayBuffer(buffer);

        wavArrayBufferToMp3BlobWithProgress(
            wavArrayBuffer,
            (pct) => {
                setProgress(convProgressBar, convProgressPct, pct);
            },
            (mp3Blob) => {
                const url = URL.createObjectURL(mp3Blob);
                lastClipUrl = url;

                // Mostrar y habilitar botón de descarga
                if (downloadClipBtn) {
                    downloadClipBtn.style.display = 'inline-block';
                    downloadClipBtn.disabled = false;
                }

                const elapsedSec = (performance.now() - startOverall) / 1000;
                if (totalEta) {
                    totalEta.innerHTML = `
                    Tiempo aprox: ${estimatedTotalSec.toFixed(1)} s<br>
                    Tiempo real: ${elapsedSec.toFixed(1)} s
                    `;
                }

                if (cutResult) {
                    cutResult.textContent = '';
                    cutResult.style.display = 'none';
                }

                setProcessingState(false);
            }
        );
    }

    // Click en botón "Descargar"
    if (downloadClipBtn) {
        downloadClipBtn.addEventListener('click', () => {
            if (!lastClipUrl) return;

            // nombre: baseOriginal + '_' + clipCounter + '.mp3'
            const filename = `${currentBaseName}_${clipCounter}.${currentExt}`;
            clipCounter++;

            const a = document.createElement('a');
            a.href = lastClipUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

    // Helper: AudioBuffer -> WAV ArrayBuffer (PCM 16-bit)
    function audioBufferToWavArrayBuffer(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1;  // PCM
        const bitDepth = 16;

        const samples = buffer.length * numChannels;
        const blockAlign = (numChannels * bitDepth) / 8;
        const byteRate = sampleRate * blockAlign;
        const dataSize = samples * (bitDepth / 8);
        const headerSize = 44;

        const bufferLength = headerSize + dataSize;
        const arrayBuffer = new ArrayBuffer(bufferLength);
        const view = new DataView(arrayBuffer);

        // Cabecera WAV
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);            // Subchunk1Size
        view.setUint16(20, format, true);        // AudioFormat (PCM)
        view.setUint16(22, numChannels, true);   // NumChannels
        view.setUint32(24, sampleRate, true);    // SampleRate
        view.setUint32(28, byteRate, true);      // ByteRate
        view.setUint16(32, blockAlign, true);    // BlockAlign
        view.setUint16(34, bitDepth, true);      // BitsPerSample
        writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        let offset = 44;
        for (let i = 0; i < buffer.length; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                const sample = buffer.getChannelData(ch)[i];
                const s = Math.max(-1, Math.min(1, sample));
                view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                offset += 2;
            }
        }

        return arrayBuffer;
    }

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // Helper: WAV ArrayBuffer -> MP3 Blob usando lamejs, con progreso en bloques
    function wavArrayBufferToMp3BlobWithProgress(wavArrayBuffer, onProgress, onDone) {
        if (!window.lamejs) {
            console.warn('lamejs no está disponible; se devolverá WAV en lugar de MP3.');
            if (onProgress) onProgress(100);
            const blob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
            if (onDone) onDone(blob);
            return;
        }

        const wavView = new DataView(wavArrayBuffer);
        const wavHeader = lamejs.WavHeader.readHeader(wavView);
        const channels = wavHeader.channels;
        const sampleRate = wavHeader.sampleRate;

        const dataOffset = wavHeader.dataOffset;
        const dataLen = wavHeader.dataLen;

        // PCM 16-bit interleaved → Int16Array
        const samples = new Int16Array(wavArrayBuffer, dataOffset, dataLen / 2);

        const kbps = 128; // bitrate MP3
        const mp3Encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps); // [web:252]

        const sampleBlockSize = 1152;
        const mp3Data = [];

        if (channels === 1) {
            // Mono en bloques
            const totalBlocks = Math.ceil(samples.length / sampleBlockSize);
            let blockIndex = 0;

            function processBlockMono() {
                const start = blockIndex * sampleBlockSize;
                const end = Math.min(samples.length, start + sampleBlockSize);
                const chunk = samples.subarray(start, end);

                const mp3buf = mp3Encoder.encodeBuffer(chunk);
                if (mp3buf.length > 0) {
                    mp3Data.push(mp3buf);
                }

                blockIndex++;
                if (onProgress) {
                    const pct = (blockIndex / totalBlocks) * 100;
                    onProgress(pct);
                }

                if (start < samples.length) {
                    setTimeout(processBlockMono, 0);
                } else {
                    finishMp3();
                }
            }

            processBlockMono();
        } else {
            // Estéreo: separar L/R, procesar en bloques
            const left = new Int16Array(samples.length / 2);
            const right = new Int16Array(samples.length / 2);

            for (let i = 0, j = 0; i < samples.length; i += 2, j++) {
                left[j] = samples[i];
                right[j] = samples[i + 1];
            }

            const totalBlocks = Math.ceil(left.length / sampleBlockSize);
            let blockIndex = 0;

            function processBlockStereo() {
                const start = blockIndex * sampleBlockSize;
                const end = Math.min(left.length, start + sampleBlockSize);

                const leftChunk = left.subarray(start, end);
                const rightChunk = right.subarray(start, end);

                const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
                if (mp3buf.length > 0) {
                    mp3Data.push(mp3buf);
                }

                blockIndex++;
                if (onProgress) {
                    const pct = (blockIndex / totalBlocks) * 100;
                    onProgress(pct);
                }

                if (start < left.length) {
                    setTimeout(processBlockStereo, 0);
                } else {
                    finishMp3();
                }
            }

            processBlockStereo();
        }

        function finishMp3() {
            const end = mp3Encoder.flush();
            if (end.length > 0) {
                mp3Data.push(end);
            }
            if (onProgress) onProgress(100);
            const blob = new Blob(mp3Data, { type: 'audio/mp3' });
            if (onDone) onDone(blob);
        }
    }
});