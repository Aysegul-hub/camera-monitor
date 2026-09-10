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

//Kameranın tarih ve saat bilgisini koruyan kod kısmı:

app.get("/api/camera/time", async (req, res) => {

    try {
        const response = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/System/time`
    );

        const xml = await response.text();

        console.log("KAMERA TARİH/ SAAT CEVABI: ");
        console.log(xml);

        if (!response.ok) {
            return res.status(response.status).send(xml);

        }

        res.type("application/xml").send(xml);
    }
    catch ( error) {
        console.error("Kamera saat bilgisi alınamadı:" , error);

        res.status(500).json({
            error: "Kameranın tarih/saat bilgisi alınamadı."
        });
    }
});

// Kameranın tarih/saat ayarını NTP ile otomatik senkronize et
app.put("/api/camera/time/ntp", async (req, res) => {

    try {

        // 1. NTP sunucusunu tanımla
        const ntpXml = `
<?xml version="1.0" encoding="UTF-8"?>
<NTPServerList version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
    <NTPServer>
        <id>1</id>
        <addressingFormatType>hostname</addressingFormatType>
        <hostName>pool.ntp.org</hostName>
        <portNo>123</portNo>
        <synchronizeInterval>60</synchronizeInterval>
    </NTPServer>
</NTPServerList>`;

        const ntpResponse = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/System/time/ntpServers`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/xml"
                },
                body: ntpXml
            }
        );

        const ntpResult = await ntpResponse.text();

        console.log("NTP sunucusu cevabı:");
        console.log(ntpResult);

        if (!ntpResponse.ok) {
            return res.status(ntpResponse.status).send(ntpResult);
        }


        // 2. Türkiye saat dilimi + NTP modunu ayarla
        const timeXml = `
<?xml version="1.0" encoding="UTF-8"?>
<Time version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
    <timeMode>NTP</timeMode>
    <timeZone>TRT-3:00:00</timeZone>
</Time>`;

        const timeResponse = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/System/time`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/xml"
                },
                body: timeXml
            }
        );

        const timeResult = await timeResponse.text();

        console.log("Saat ayarı cevabı:");
        console.log(timeResult);

        if (!timeResponse.ok) {
            return res.status(timeResponse.status).send(timeResult);
        }

        res.json({
            success: true,
            message: "Kamera NTP ile senkronizasyon için ayarlandı."
        });

    } catch (error) {

        console.error("NTP saat ayarı hatası:", error);

        res.status(500).json({
            error: "Kamera NTP ile senkronize edilemedi."
        });

    }

});


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

// Hikvision parlaklık ve kontrast ayarlarını değiştir
app.put("/api/camera/image-settings", async (req, res) => {

    const { brightness, contrast, sharpness} = req.body;

    try {

        const xml = `
<?xml version="1.0" encoding="UTF-8"?>
<Color version="1.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
    <brightnessLevel>${brightness}</brightnessLevel>
    <contrastLevel>${contrast}</contrastLevel>
</Color>`;

        const response = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/Image/channels/1/color`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/xml"
                },
                body: xml
            }
        );

        const result = await response.text();

        console.log("Kamera cevap:", result);

        if (!response.ok) {
            return res.status(response.status).send(result);
        }

        res.json({
            success: true,
            brightness,
            contrast
        });

    } catch (error) {

        console.error("Görüntü ayarı hatası:", error);

        res.status(500).json({
            error: "Görüntü ayarı değiştirilemedi."
        });

    }
});

// Hikvision hareket algılama ayarlarını oku
app.get("/api/camera/motion-detection", async (req, res) => {

    try {

        const response = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/System/Video/inputs/channels/1/motionDetection`
        );

        const xml = await response.text();

        console.log("KAMERA HAREKET ALGILAMA AYARLARI:");
        console.log(xml);

        if (!response.ok) {
            return res.status(response.status).send(xml);
        }

        res.type("application/xml").send(xml);

    } catch (error) {

        console.error(
            "Hareket algılama ayarları alınamadı:",
            error
        );

        res.status(500).json({
            error: "Kameranın hareket algılama ayarları alınamadı."
        });
    }
});

// Hikvision insan algılama ayarlarını güncelle
app.put("/api/camera/motion-detection", async (req, res) => {

    const { enabled, sensitivity } = req.body;

    const sensitivityValue = Number(sensitivity);

    if (
        typeof enabled !== "boolean" ||
        !Number.isInteger(sensitivityValue) ||
        sensitivityValue < 0 ||
        sensitivityValue > 100
    ) {
        return res.status(400).json({
            error: "Geçersiz insan algılama ayarı."
        });
    }

    try {

        // Önce mevcut kamera ayarlarını al
        const getResponse = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/System/Video/inputs/channels/1/motionDetection`
        );

        let xml = await getResponse.text();

        if (!getResponse.ok) {
            return res.status(getResponse.status).send(xml);
        }

        // Hareket algılamayı aç/kapat
        xml = xml.replace(
            /<enabled>.*?<\/enabled>/,
            `<enabled>${enabled}</enabled>`
        );

        // Hassasiyet değerini değiştir
        xml = xml.replace(
            /<sensitivityLevel>.*?<\/sensitivityLevel>/,
            `<sensitivityLevel>${sensitivityValue}</sensitivityLevel>`
        );

        // İnsan algılamayı zorunlu tut
        xml = xml.replace(
            /<targetType>.*?<\/targetType>/,
            `<targetType>human</targetType>`
        );

        // Güncellenmiş ayarları kameraya gönder
        const putResponse = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/System/Video/inputs/channels/1/motionDetection`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/xml"
                },
                body: xml
            }
        );

        const result = await putResponse.text();

        console.log("İNSAN ALGILAMA AYAR CEVABI:");
        console.log(result);

        if (!putResponse.ok) {
            return res.status(putResponse.status).send(result);
        }

        res.json({
            success: true,
            enabled: enabled,
            sensitivity: sensitivityValue,
            targetType: "human"
        });

    } catch (error) {

        console.error(
            "İnsan algılama ayarı değiştirilemedi:",
            error
        );

        res.status(500).json({
            error: "İnsan algılama ayarı değiştirilemedi."
        });
    }
});

app.get("/api/camera/events", async (req, res) => {

    try {

        const response = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/Event/notification/alertStream`
        );

        if (!response.ok) {

            const errorText = await response.text();

            console.error("Event stream hatası:");
            console.error(errorText);

            return res.status(response.status).send(errorText);
        }

        console.log("KAMERA EVENT STREAM BAĞLANTISI KURULDU.");
        console.log("Kameradan olay bekleniyor...");

        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        let buffer = "";

        for await (const chunk of response.body) {

            buffer += chunk.toString();

            // Tam bir EventNotificationAlert oluştuğunda al
            while (buffer.includes("</EventNotificationAlert>")) {

                const endTag = "</EventNotificationAlert>";
                const endIndex = buffer.indexOf(endTag) + endTag.length;

                const eventXml = buffer.substring(0, endIndex);

                buffer = buffer.substring(endIndex);

                console.log("KAMERA EVENT:");
                console.log(eventXml);

                // XML'i tarayıcıya tek parça gönder
                res.write(`data: ${JSON.stringify(eventXml)}\n\n`);
            }
        }

    } catch (error) {

        console.error(
            "Kamera event stream hatası:",
            error
        );

        if (!res.headersSent) {

            res.status(500).json({
                error: "Kamera olay akışı alınamadı."
            });

        } else {

            res.end();

        }
    }

});

app.get("/api/camera/motion-detection", async (req, res) => {

    try {

        const response = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/System/Video/inputs/channels/1/motionDetection`
        );

        const xml = await response.text();

        console.log("KAMERA HAREKET ALGILAMA AYARLARI:");
        console.log(xml);

        if (!response.ok) {
            return res.status(response.status).send(xml);
        }

        res.type("application/xml").send(xml);

    } catch (error) {

        console.error(
            "Hareket algılama ayarları alınamadı:",
            error
        );

        res.status(500).json({
            error: "Kameranın hareket algılama ayarları alınamadı."
        });

    }

});



// Hikvision keskinlik ayarını değiştir
app.put("/api/camera/sharpness", async (req, res) => {

    const { sharpness } = req.body;
    const value = Number(sharpness);

    // 0-100 aralığını kontrol et
    if (!Number.isInteger(value) || value < 0 || value > 100) {
        return res.status(400).json({
            error: "Keskinlik değeri 0-100 arasında olmalıdır."
        });
    }

    try {

        // Önce mevcut görüntü ayarlarını kameradan al
        const getResponse = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/Image/channels/1`
        );

        let xml = await getResponse.text();

        if (!getResponse.ok) {
            return res.status(getResponse.status).send(xml);
        }

        // Sadece keskinlik değerini değiştir
        xml = xml.replace(
            /<SharpnessLevel[^>]*>.*?<\/SharpnessLevel>/,
            `<SharpnessLevel min="0" max="100">${value}</SharpnessLevel>`
        );

        // Güncellenmiş ayarı kameraya gönder
        const putResponse = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/Image/channels/1`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/xml"
                },
                body: xml
            }
        );

        const result = await putResponse.text();

        console.log("Keskinlik değiştirme cevabı:");
        console.log(result);

        if (!putResponse.ok) {
            return res.status(putResponse.status).send(result);
        }

        res.json({
            success: true,
            sharpness: value
        });

    } catch (error) {

        console.error(
            "Keskinlik değiştirme hatası:",
            error
        );

        res.status(500).json({
            error: "Keskinlik değiştirilemedi."
        });
    }
});



//Hikvision görüntü ayarlarının desteklediği özellikleri oku

app.get("/api/camera/image-capabilities",async (req, res) => {

    try {
        const response = await cameraClient.fetch( 
            `http://${cameraIp}/ISAPI/Image/channels/1/capabilities`
        );

        const xml = await response.text();

        console.log("KAMERA GÖRÜNTÜ YETENEKLERİ:");
        console.log(xml);
        
        if (!response.ok) {
            return res.status(response.status).send(xml);
        }

        res.type("application/xml").send(xml);
    }catch (error) {
        console.error(
            "Görüntü yetenekleri alınmadı: ",
            error
        );
        res.status(500).json({
            error: "Kameranın görüntü yetenekleri alınamadı."
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

// Kameranın video çözünürlüğünü oku
app.get("/api/camera/resolution", async (req, res) => {

    try {

        const response = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/Streaming/channels/101`
        );

        const xml = await response.text();

        console.log("KAMERA VIDEO AYARLARI:");
        console.log(xml);

        if (!response.ok) {
            return res.status(response.status).send(xml);
        }

        res.type("application/xml").send(xml);

    } catch (error) {

        console.error(
            "Kamera çözünürlük bilgisi alınamadı:",
            error
        );

        res.status(500).json({
            error: "Kamera çözünürlük bilgisi alınamadı."
        });

    }

});

// Kameranın video çözünürlüğünü değiştir
app.put("/api/camera/resolution", async (req, res) => {

    const { width, height } = req.body;

    const allowedResolutions = [
        { width: 1920, height: 1080 },
        { width: 1280, height: 720 }
    ];

    const isAllowed = allowedResolutions.some(
        resolution =>
            resolution.width === Number(width) &&
            resolution.height === Number(height)
    );

    if (!isAllowed) {
        return res.status(400).json({
            error: "Desteklenmeyen çözünürlük."
        });
    }

    try {

        // Önce mevcut video ayarlarını kameradan al
        const getResponse = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/Streaming/channels/101`
        );

        let xml = await getResponse.text();

        if (!getResponse.ok) {
            return res.status(getResponse.status).send(xml);
        }

        // Sadece çözünürlük değerlerini değiştir
        xml = xml.replace(
            /<videoResolutionWidth>.*?<\/videoResolutionWidth>/,
            `<videoResolutionWidth>${width}</videoResolutionWidth>`
        );

        xml = xml.replace(
            /<videoResolutionHeight>.*?<\/videoResolutionHeight>/,
            `<videoResolutionHeight>${height}</videoResolutionHeight>`
        );

        // Güncellenmiş ayarları kameraya gönder
        const putResponse = await cameraClient.fetch(
            `http://${cameraIp}/ISAPI/Streaming/channels/101`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/xml"
                },
                body: xml
            }
        );

        const result = await putResponse.text();

        console.log("Çözünürlük değiştirme cevabı:");
        console.log(result);

        if (!putResponse.ok) {
            return res.status(putResponse.status).send(result);
        }

        res.json({
            success: true,
            width: Number(width),
            height: Number(height)
        });

    } catch (error) {

        console.error(
            "Çözünürlük değiştirme hatası:",
            error
        );

        res.status(500).json({
            error: "Kamera çözünürlüğü değiştirilemedi."
        });
    }
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