const express = require("express");
const { spawn } = require("child_process");
const cors = require("cors");

const DigestClient = require("digest-fetch");
require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());
app.use(express.static("."));

let rtspUrl = null;
let ffmpegProcess = null;
const cameraIp = process.env.CAMERA_IP;
const cameraUsername = process.env.CAMERA_USERNAME;
const cameraPassword = process.env.CAMERA_PASSWORD;

const cameraClient = new DigestClient(
    cameraUsername,
    cameraPassword,
{
    algorithm: "MD5",
    logger: console
}
);

// Hikvision ISAPI - Gece/Gündüz durumunu oku
app.get("/api/camera/night-mode", async (req, res) => {

    try {

        const response = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/Image/channels/1/IrcutFilter`
        );

        const xml = await response.text();

        if (!response.ok) {
            return res.status(response.status).send(xml);
        }

        res.type("application/xml").send(xml);

    } catch (error) {

        console.error("ISAPI hatası:", error);

        res.status(500).json({
            error: "Kameraya ISAPI üzerinden bağlanılamadı."
        });

    }

});

// Hikvision gece/gündüz modunu değiştir
app.put("/api/camera/night-mode", async (req, res) => {
    const { mode } = req.body;

    const allowedModes = ["auto", "day", "night"];

    if (!allowedModes.includes(mode)) {
        return res.status(400).json({
            error: "Geçersiz gece/gündüz modu."
        });
    }

    const xml = `
<?xml version="1.0" encoding="UTF-8"?>
<IrcutFilter xmlns="http://www.hikvision.com/ver20/XMLSchema" version="2.0">
    <IrcutFilterType>${mode}</IrcutFilterType>
    <nightToDayFilterLevel>4</nightToDayFilterLevel>
    <nightToDayFilterTime>5</nightToDayFilterTime>
</IrcutFilter>`;

    try {
        const response = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/Image/channels/1/IrcutFilter`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/xml"
                },
                body: xml
            }
        );

        const result = await response.text();

        if (!response.ok) {
            console.log("ISAPI cevap:", result);

            return res.status(response.status).send(result);
        }

        res.json({
            success: true,
            mode: mode
        });

    } catch (error) {
        console.error("ISAPI hata:", error);

        res.status(500).json({
            error: "Kamera ayarı değiştirilemedi."
        });
    }
});

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