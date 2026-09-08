const express = require("express");
const { spawn } = require("child_process");

const app = express();
const PORT = 3000;

app.use(express.json());
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

    rtspUrl = null;

    res.json({
        success: true,
        message: "RTSP adresi alındı."
    });
});


// Canlı görüntü
app.get("/api/stream", (req, res) => {

    if (!rtspUrl) {
        return res.status(400).send("RTSP kamera bağlanmadı.");
    }

    // FFmpeg başlat
    ffmpegProcess = spawn("ffmpeg", [
        "-rtsp_transport", "tcp",
        "-loglevel","error",

        "-i", rtspUrl,

        "-an",

        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",

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


app.listen(PORT, () => {
    console.log(`Camera Monitor çalışıyor: http://localhost:${PORT}`);
});