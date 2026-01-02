export async function compressString(str) {
    const stream = new Blob([str]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const chunks = [];
    const reader = compressedStream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const blob = new Blob(chunks);
    const arrayBuffer = await blob.arrayBuffer();
    return bufferToBase64(arrayBuffer);
}

export async function decompressToJSON(base64) {
    try {
        const bytes = base64ToUint8Array(base64);
        const stream = new Blob([bytes]).stream();
        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
        const text = await new Response(decompressedStream).text();
        return JSON.parse(text);
    } catch (e) {
        try {
            const binaryString = atob(base64);
            const decoded = decodeURIComponent(escape(binaryString));
            return JSON.parse(decoded);
        } catch (e2) {
            console.error("Decompression failed", e, e2);
            return null;
        }
    }
}

function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
}

export function playAnimation(el, animationName) {
    el.classList.remove("animate__animated", "animate__fadeIn", "animate__fadeInDown", "animate__zoomIn", "animate__headShake", "animate__pulse");
    void el.offsetWidth;
    el.classList.add("animate__animated", animationName);
    el.addEventListener("animationend", () => {
        el.classList.remove("animate__animated", animationName);
    }, { once: true });
}
