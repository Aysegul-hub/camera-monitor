const express = require("express");
const { spawn } = require("child_process");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());
app.use(express.static("."));

let rtspUrl = null;
let ffmpegProcess = null;


// RTSP adresini backend'e gönder
app.post("/api/connect", (req, res) => {

    const { rtspUrl: newRtspUrl } = req.body;

    if (!newRtspUrl || !newRtspUrl.startsWith("rtsp://")) {
        return res.status(400).json({
            error: "Geçerli bir RTSP adresi girin."
        });
    }

    rtspUrl = newRtspUrl;

    // Önceden çalışan FFmpeg varsa kapat
    if (ffmpegProcess) {
        ffmpegProcess.kill();
        ffmpegProcess = null;
    }

    res.json({
        success: true,
        message: "RTSP adresi alındı."
    });
});


// Kamera bağlantısını kes
app.post("/api/disconnect", (req, res) => {

    // FFmpeg çalışıyorsa kapat
    if (ffmpegProcess) {
        ffmpegProcess.kill();
        ffmpegProcess = null;
    }

    // RTSP adresini temizle
    rtspUrl = null;

    res.json({
        success: true,
        message: "Kamera bağlantısı kesildi."
    });
});


// Canlı görüntü
app.get("/api/stream", (req, res) => {

    if (!rtspUrl) {
        return res.status(400).send("RTSP kamera bağlanmadı.");
    }

    // FFmpeg başlat
    ffmpegProcess = spawn("ffmpeg", [
        "-loglevel", "error",
        "-rtsp_transport", "udp",
        "-fflags", "nobuffer",
        "-i", rtspUrl,
        "-an",
        "-c:v", "copy",
        
        "-f", "mpegts",
        "pipe:1"
    ]);

    res.writeHead(200, {
        "Content-Type": "video/mp2t",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    });

    // FFmpeg görüntüsünü tarayıcıya gönder
    ffmpegProcess.stdout.pipe(res);

    // FFmpeg hata mesajları
    ffmpegProcess.stderr.on("data", (data) => {
        console.log("FFmpeg:", data.toString());
    });

    // FFmpeg kapandığında
    ffmpegProcess.on("close", () => {
        console.log("FFmpeg kapandı.");
        ffmpegProcess = null;
    });

    // Tarayıcı bağlantıyı kapatırsa
    req.on("close", () => {

        if (ffmpegProcess) {
            ffmpegProcess.kill();
            ffmpegProcess = null;
        }

    });

});


// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`Camera Monitor çalışıyor: http://localhost:${PORT}`);
});