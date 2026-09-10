const cameraList = document.getElementById("cameraList");
const cameraCount = document.getElementById("cameraCount");

const video = document.getElementById("video");
const noCamera = document.getElementById("noCamera");

const selectedCamera = document.getElementById("selectedCamera");
const cameraName = document.getElementById("cameraName");
const connectionStatus = document.getElementById("connectionStatus");
const lastUpdate = document.getElementById("lastUpdate");

const usbButton = document.getElementById("usbButton");
const ethernetButton = document.getElementById("ethernetButton");

const ethernetSection = document.getElementById("ethernetSection");
const rtspUrl = document.getElementById("rtspUrl");
const connectButton = document.getElementById("connectButton");
const disconnectButton = document.getElementById("disconnectButton");
const rtspStatus = document.getElementById("rtspStatus");

const cameraPanelTitle = document.getElementById("cameraPanelTitle");

let currentStream = null;
let currentPlayer = null;
let currentMode = "usb";


// ========================================
// USB KAMERALAR
// ========================================

async function listCameras() {

    const devices = await navigator.mediaDevices.enumerateDevices();

    const cameras = devices.filter(device => {
        return device.kind === "videoinput";
    });

    cameraList.innerHTML = "";

    cameraCount.textContent = cameras.length;


    if (cameras.length === 0) {

        cameraList.innerHTML = `
            <div class="empty-state">
                <div>📹</div>
                <p>Kamera bulunamadı</p>
            </div>
        `;

        return;
    }


    cameras.forEach((camera, index) => {

        const cameraItem = document.createElement("div");

        cameraItem.className = "camera-item";

        cameraItem.innerHTML = `
            <div class="camera-name">
                📹 ${camera.label || `Kamera ${index + 1}`}
            </div>

            <div class="camera-type">
                ${getCameraType(camera.label)}
            </div>

            <div class="camera-status">
                <span class="camera-status-dot"></span>
                Bağlı
            </div>
        `;


        cameraItem.addEventListener("click", () => {
            selectCamera(camera, cameraItem);
        });


        cameraList.appendChild(cameraItem);

    });
}


// Kamera türünü belirle
function getCameraType(label) {

    const name = label.toLowerCase();

    if (
        name.includes("integrated") ||
        name.includes("built-in") ||
        name.includes("internal")
    ) {
        return "Dahili Kamera";
    }

    return "USB Kamera";
}


// USB kamerayı seç
async function selectCamera(camera, cameraItem) {

    console.log("USB kamera seçildi:", camera.label);

    currentMode = "usb";


    // Ethernet player varsa kapat
    stopEthernetPlayer();


    // Önceki seçimi kaldır
    document.querySelectorAll(".camera-item").forEach(item => {
        item.classList.remove("selected");
    });

    cameraItem.classList.add("selected");


    // Eski USB akışını kapat
    if (currentStream) {

        currentStream.getTracks().forEach(track => {
            track.stop();
        });

        currentStream = null;
    }


    try {

        currentStream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: {
                    exact: camera.deviceId
                }
            },
            audio: false
        });


        video.srcObject = currentStream;

        video.style.display = "block";

        noCamera.style.display = "none";


        selectedCamera.textContent = camera.label || "USB Kamera";

        cameraName.textContent = camera.label || "USB Kamera";

        connectionStatus.textContent = "Bağlı";

        lastUpdate.textContent =
            new Date().toLocaleTimeString("tr-TR");

    } catch (error) {

        console.error("USB kamera açılamadı:", error);

        connectionStatus.textContent = "Bağlantı Hatası";
    }
}


// ========================================
// USB / ETHERNET MOD DEĞİŞTİRME
// ========================================

usbButton.addEventListener("click", () => {

    currentMode = "usb";

    usbButton.classList.add("active");
    ethernetButton.classList.remove("active");

    ethernetSection.style.display = "none";

    cameraPanelTitle.textContent = "Bağlı USB Kameralar";

    stopEthernetPlayer();

    video.srcObject = null;

    video.style.display = "none";

    noCamera.style.display = "flex";

    selectedCamera.textContent = "Kamera seçilmedi";

    cameraName.textContent = "-";

    connectionStatus.textContent = "Bekliyor";

    listCameras();
});


ethernetButton.addEventListener("click", () => {

    currentMode = "ethernet";

    ethernetButton.classList.add("active");
    usbButton.classList.remove("active");

    ethernetSection.style.display = "block";

    cameraPanelTitle.textContent = "Ethernet Kameralar";

    stopUSBStream();

    cameraList.innerHTML = `
        <div class="empty-state">
            <div>🌐</div>
            <p>RTSP kamera ekleyin</p>
        </div>
    `;

    cameraCount.textContent = "0";

    video.style.display = "none";

    noCamera.style.display = "flex";

    selectedCamera.textContent = "Ethernet kamera seçilmedi";

    cameraName.textContent = "-";

    connectionStatus.textContent = "Bekliyor";

});


// ========================================
// USB STREAM KAPAT
// ========================================

function stopUSBStream() {

    if (currentStream) {

        currentStream.getTracks().forEach(track => {
            track.stop();
        });

        currentStream = null;
    }

    video.srcObject = null;
}


// ========================================
// ETHERNET / RTSP BAĞLANTISI
// ========================================

connectButton.addEventListener("click", connectEthernetCamera);


async function connectEthernetCamera() {

    const url = rtspUrl.value.trim();


    // RTSP adresi boş mu?
    if (!url) {

        rtspStatus.textContent =
            "Lütfen RTSP adresini girin.";

        return;
    }


    // RTSP adresi mi?
    if (!url.startsWith("rtsp://")) {

        rtspStatus.textContent =
            "Geçerli bir RTSP adresi girin.";

        return;
    }


    console.log("Ethernet kamera bağlanıyor...");


    connectButton.disabled = true;

    connectButton.textContent = "⏳ Bağlanıyor...";

    rtspStatus.textContent =
        "RTSP kameraya bağlanılıyor...";


    try {

        // USB akışını kapat
        stopUSBStream();


        // Eski Ethernet player varsa kapat
        stopEthernetPlayer();


        // RTSP adresini Node.js'e gönder
        const response = await fetch("http://localhost:3000/api/connect", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                rtspUrl: url
            })

        });


        const data = await response.json();


        if (!response.ok) {
            throw new Error(data.error || "Bağlantı başarısız.");
        }


        console.log("RTSP adresi backend'e gönderildi.");


        // Sol listeye Ethernet kamerayı ekle
        addEthernetCamera();


        // FFmpeg stream'ini oynat
        startEthernetPlayer();


        rtspStatus.textContent =
            "Kamera bağlandı.";

        connectionStatus.textContent =
            "Bağlı";

        selectedCamera.textContent =
            "Ethernet Kamera";

        cameraName.textContent =
            "Ethernet Kamera";

        lastUpdate.textContent =
            new Date().toLocaleTimeString("tr-TR");


    } catch (error) {

        console.error("Ethernet kamera hatası:", error);

        rtspStatus.textContent =
            "Bağlantı hatası.";

        connectionStatus.textContent =
            "Bağlantı Hatası";

    } finally {

        connectButton.disabled = false;

        connectButton.textContent =
            "🔗 Kameraya Bağlan";
    }
}


// ========================================
// ETHERNET KAMERAYI LİSTEYE EKLE
// ========================================

function addEthernetCamera() {

    cameraList.innerHTML = "";

    cameraCount.textContent = "1";


    const cameraItem = document.createElement("div");

    cameraItem.className = "camera-item selected";


    cameraItem.innerHTML = `
        <div class="camera-name">
            🌐 Ethernet Kamera
        </div>

        <div class="camera-type">
            RTSP Kamera
        </div>

        <div class="camera-status">
            <span class="camera-status-dot"></span>
            Bağlı
        </div>
    `;


    cameraItem.addEventListener("click", () => {

        startEthernetPlayer();

    });


    cameraList.appendChild(cameraItem);
}


// ========================================
// ETHERNET CANLI GÖRÜNTÜ
// ========================================


function startEthernetPlayer() {

    latencyValues = [] ;

    // mpegts.js destekleniyor mu?
    if (!mpegts.isSupported()) {

        console.error(
            "mpegts.js bu tarayıcıda desteklenmiyor."
        );

        rtspStatus.textContent =
            "Tarayıcı MPEG-TS oynatmayı desteklemiyor.";

        return;
    }


    // Eski player varsa kapat
    stopEthernetPlayer();


    currentMode = "ethernet";


    video.srcObject = null;

    video.style.display = "block";

    noCamera.style.display = "none";


    // MPEG-TS player oluştur
    currentPlayer = mpegts.createPlayer({

        type: "mpegts",

        isLive: true,

        url: "http://localhost:3000/api/stream"

    }, {
        enableStashBuffer:false,
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 1.5,
        liveBufferLatencyMinRemain: 0.5
    });


    // Video elementine bağla
    currentPlayer.attachMediaElement(video);


    // Stream'i yükle
    currentPlayer.load();


    // Oynat
    currentPlayer.play().catch(error => {

        console.error(
            "Video oynatma hatası:",
            error
        );

    });


    console.log("Ethernet canlı görüntü başlatıldı.");
}


// ========================================
// ETHERNET PLAYER KAPAT
// ========================================

function stopEthernetPlayer() {

    if (currentPlayer) {

        try {

            currentPlayer.pause();

            currentPlayer.unload();

            currentPlayer.detachMediaElement();

            currentPlayer.destroy();

        } catch (error) {

            console.error(
                "Player kapatılırken hata:",
                error
            );
        }


        currentPlayer = null;
    }
}


// ========================================
// İLK KAMERALARI BUL
// ========================================

async function initializeCameras() {

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });


        stream.getTracks().forEach(track => {
            track.stop();
        });


        await listCameras();

    } catch (error) {

        console.error(
            "Kamera erişimi reddedildi:",
            error
        );
    }
}


// ========================================
// KAMERA TAKILIP ÇIKARILINCA
// ========================================

navigator.mediaDevices.addEventListener(
    "devicechange",
    () => {

        console.log(
            "Kamera cihazlarında değişiklik oldu."
        );


        if (currentMode === "usb") {
            listCameras();
        }

    }
);


// ========================================
// BAŞLANGIÇ
// ========================================

// Başlangıçta Ethernet alanını gizle
ethernetSection.style.display = "none";


// USB kameraları başlat
initializeCameras();

disconnectButton.addEventListener("click", async () => {

    // Tarayıcıdaki Ethernet görüntüsünü durdur
    stopEthernetPlayer();

    try {
        await fetch("http://localhost:3000/api/disconnect", {
            method: "POST"
        });

        // Arayüzü temizle
        document.getElementById("rtspStatus").textContent =
            "Kamera bağlantısı kesildi.";

        document.getElementById("selectedCamera").textContent =
            "Kamera seçilmedi";

        document.getElementById("connectionStatus").textContent =
            "Bekliyor";

        document.getElementById("cameraName").textContent =
            "-";

        document.getElementById("lastUpdate").textContent =
            "-";

        // Ethernet kamera kartını kaldır
        cameraList.innerHTML = "";

        cameraCount.textContent = "0";

        noCamera.style.display = "flex";

    } catch (error) {

        console.error("Bağlantı kesme hatası:", error);

        document.getElementById("rtspStatus").textContent =
            "Bağlantı kesilemedi.";
    }
});

// ========================================
// CANLI GECİKME ÖLÇÜMÜ
// ========================================

let latencyValues = [];

function updateLatency() {

    const latencyDisplay =
        document.getElementById("latencyDisplay");

    if (
        currentMode !== "ethernet" ||
        !currentPlayer ||
        video.readyState < 2 ||
        video.buffered.length === 0
    ) {
        return;
    }

    const liveEdge =
        video.buffered.end(video.buffered.length - 1);

    const currentTime =
        video.currentTime;

    const latency =
        liveEdge - currentTime;

    // Son 8 ölçümü sakla
    latencyValues.push(latency);

    if (latencyValues.length > 8) {
        latencyValues.shift();
    }

    // Ortalama gecikme
    const averageLatency =
        latencyValues.reduce((a, b) => a + b, 0) /
        latencyValues.length;

    const milliseconds =
        Math.round(averageLatency * 1000);

    latencyDisplay.innerHTML = `
        <span class="latency-dot"></span>
        <span class="latency-label">CANLI GECİKME</span>
        <strong>${milliseconds} ms</strong>
    `;
}


// Her 500 ms'de bir ölç
setInterval(updateLatency, 500);

// =========================
// Hikvision Kamera Kontrolleri
// =========================

const dayModeButton = document.getElementById("dayModeButton");
const autoModeButton = document.getElementById("autoModeButton");
const nightModeButton = document.getElementById("nightModeButton");

const normalImageButton = document.getElementById("normalImageButton");
const rotateImageButton = document.getElementById("rotateImageButton");


// Gece / gündüz modunu değiştir
async function setNightMode(mode, button) {

    try {

        const response = await fetch(
            "http://localhost:3000/api/camera/night-mode",
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    mode: mode
                })
            }
        );

        if (!response.ok) {
            throw new Error("Kamera ayarı değiştirilemedi.");
        }

        // Aktif butonu değiştir
        document
            .querySelectorAll(".control-buttons .control-button")
            .forEach(btn => {
                btn.classList.remove("active");
            });

        button.classList.add("active");

        console.log("Gece/Gündüz modu:", mode);

    } catch (error) {

        console.error("Kamera kontrol hatası:", error);

        alert("Kamera ayarı değiştirilemedi.");
    }
}


// Gündüz
dayModeButton.addEventListener("click", () => {
    setNightMode("day", dayModeButton);
});


// Otomatik
autoModeButton.addEventListener("click", () => {
    setNightMode("auto", autoModeButton);
});


// Gece
nightModeButton.addEventListener("click", () => {
    setNightMode("night", nightModeButton);
});


// =========================
// Görüntü döndürme
// =========================

let imageRotated = false;

normalImageButton.addEventListener("click", () => {

    imageRotated = false;

    video.style.transform = "rotate(0deg)";

    normalImageButton.classList.add("active");
    rotateImageButton.classList.remove("active");
});


rotateImageButton.addEventListener("click", () => {

    imageRotated = true;

    video.style.transform = "rotate(180deg)";

    rotateImageButton.classList.add("active");
    normalImageButton.classList.remove("active");
});

// =========================
// Kamera Tarih / Saat
// =========================

const cameraDate = document.getElementById("cameraDate");
const cameraTime = document.getElementById("cameraTime");
const cameraTimezone = document.getElementById("cameraTimezone");
const cameraTimeMode = document.getElementById("cameraTimeMode");

const syncCameraTimeButton =
    document.getElementById("syncCameraTimeButton");

const timeSyncStatus =
    document.getElementById("timeSyncStatus");


// Kameranın mevcut tarih ve saat bilgisini oku
async function getCameraTime() {

    try {

        const response = await fetch(
            "http://localhost:3000/api/camera/time"
        );

        if (!response.ok) {
            throw new Error("Kamera saat bilgisi alınamadı.");
        }

        const xmlText = await response.text();

        // XML'i JavaScript tarafından okunabilir hale getir
        const parser = new DOMParser();
        const xml = parser.parseFromString(
            xmlText,
            "application/xml"
        );

        const timeMode =
            xml.querySelector("timeMode")?.textContent;

        const localTime =
            xml.querySelector("localTime")?.textContent;

        const timeZone =
            xml.querySelector("timeZone")?.textContent;


        if (!localTime) {
            throw new Error("Kamera zamanı bulunamadı.");
        }


        // Kameranın ISO tarihini Date nesnesine dönüştür
        const date = new Date(localTime);


        // Tarihi göster
        cameraDate.textContent =
            date.toLocaleDateString("tr-TR");


        // Saati göster
        cameraTime.textContent =
            date.toLocaleTimeString("tr-TR");


        // Saat dilimini göster
        cameraTimezone.textContent =
            timeZone || "-";


        // Zaman modunu göster
        cameraTimeMode.textContent =
            timeMode === "NTP"
                ? "NTP (Otomatik)"
                : timeMode || "-";


        timeSyncStatus.textContent =
            "Kamera saati güncel.";

        console.log(
            "Kamera zamanı:",
            localTime
        );

    } catch (error) {

        console.error(
            "Kamera saat bilgisi alınamadı:",
            error
        );

        timeSyncStatus.textContent =
            "Kamera saati okunamadı.";
    }
}


// Kamerayı NTP ile senkronize et
async function syncCameraTime() {

    syncCameraTimeButton.disabled = true;

    syncCameraTimeButton.textContent =
        "⏳ Senkronize ediliyor...";

    timeSyncStatus.textContent =
        "Kamera saati NTP ile senkronize ediliyor...";


    try {

        const response = await fetch(
            "http://localhost:3000/api/camera/time/ntp",
            {
                method: "PUT"
            }
        );


        const data = await response.json();


        if (!response.ok) {
            throw new Error(
                data.error || "Senkronizasyon başarısız."
            );
        }


        timeSyncStatus.textContent =
            "✓ Kamera saati başarıyla senkronize edildi.";


        // Yeni zamanı kameradan tekrar oku
        await getCameraTime();


    } catch (error) {

        console.error(
            "Saat senkronizasyon hatası:",
            error
        );

        timeSyncStatus.textContent =
            "✕ Kamera saati senkronize edilemedi.";

    } finally {

        syncCameraTimeButton.disabled = false;

        syncCameraTimeButton.textContent =
            "🔄 Saati Senkronize Et";
    }
}


// Butona tıklanınca NTP senkronizasyonu yap
syncCameraTimeButton.addEventListener(
    "click",
    syncCameraTime
);


// Sayfa açıldığında kameranın saatini oku
getCameraTime();


// Her 30 saniyede bir kameranın saatini güncelle
setInterval(
    getCameraTime,
    30000
);

// =========================
// Parlaklık ve Kontrast
// =========================

const brightnessSlider = document.getElementById("brightness");
const contrastSlider = document.getElementById("contrast");

async function updateImageSettings() {

    const brightness = brightnessSlider.value;
    const contrast = contrastSlider.value;

    try {

        const response = await fetch(
            "http://localhost:3000/api/camera/image-settings",
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    brightness: brightness,
                    contrast: contrast
                })
            }
        );

        const data = await response.json();

        console.log("Görüntü ayarları:", data);

    } catch (error) {

        console.error(
            "Görüntü ayarı gönderilemedi:",
            error
        );

    }
}

brightnessSlider.addEventListener(
    "change",
    updateImageSettings
);

contrastSlider.addEventListener(
    "change",
    updateImageSettings
);


async function updateImageSettings() {

    const brightness = brightnessSlider.value;
    const contrast = contrastSlider.value;

    try {

        const response = await fetch(
            "http://localhost:3000/api/camera/image-settings",
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    brightness: brightness,
                    contrast: contrast
                })
            }
        );

        const data = await response.json();

        console.log("Kamera görüntü ayarları:", data);

    } catch (error) {

        console.error("Görüntü ayarı gönderilemedi:", error);

    }
}

brightnessSlider.addEventListener("change", updateImageSettings);
contrastSlider.addEventListener("change", updateImageSettings);

const resolutionSelect =
    document.getElementById("resolutionSelect");

const applyResolutionButton =
    document.getElementById("applyResolutionButton");

const resolutionStatus =
    document.getElementById("resolutionStatus");

async function getCameraResolution() {

    try {

        const response = await fetch(
            "http://localhost:3000/api/camera/resolution"
        );

        if (!response.ok) {
            throw new Error(
                "Kamera çözünürlüğü okunamadı."
            );
        }

        const xmlText = await response.text();

        const parser = new DOMParser();

        const xml = parser.parseFromString(
            xmlText,
            "application/xml"
        );

        const width =
            xml.querySelector(
                "videoResolutionWidth"
            )?.textContent;

        const height =
            xml.querySelector(
                "videoResolutionHeight"
            )?.textContent;

        if (!width || !height) {
            throw new Error(
                "Çözünürlük bilgisi bulunamadı."
            );
        }

        const currentResolution =
            `${width}x${height}`;

        resolutionSelect.value =
            currentResolution;

        resolutionStatus.textContent =
            `Mevcut çözünürlük: ${width} × ${height}`;

        console.log(
            "Kamera çözünürlüğü:",
            currentResolution
        );

    } catch (error) {

        console.error(
            "Çözünürlük okunamadı:",
            error
        );

        resolutionStatus.textContent =
            "Kamera çözünürlüğü okunamadı.";
    }
}


async function applyCameraResolution() {

    const selectedResolution =
        resolutionSelect.value;

    const [width, height] =
        selectedResolution.split("x");

    applyResolutionButton.disabled = true;

    applyResolutionButton.textContent =
        "⏳ Uygulanıyor...";

    resolutionStatus.textContent =
        "Kamera çözünürlüğü değiştiriliyor...";

    try {

        const response = await fetch(
            "http://localhost:3000/api/camera/resolution",
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    width: Number(width),
                    height: Number(height)
                })
            }
        );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                "Çözünürlük değiştirilemedi."
            );
        }

        resolutionStatus.textContent =
            `✓ Çözünürlük ${width} × ${height} olarak ayarlandı.`;

        console.log(
            "Yeni çözünürlük:",
            data
        );

    } catch (error) {

        console.error(
            "Çözünürlük değiştirme hatası:",
            error
        );

        resolutionStatus.textContent =
            "✕ Çözünürlük değiştirilemedi.";

    } finally {

        applyResolutionButton.disabled = false;

        applyResolutionButton.textContent =
            "✓ Çözünürlüğü Uygula";
    }
}


applyResolutionButton.addEventListener(
    "click",
    applyCameraResolution
);

getCameraResolution();


// ========================================
// GERÇEK ZAMANLI İNSAN ALGILAMA
// ========================================

let humanDetectionModel = null;
let detectionRunning = false;
let detectionBusy = false;

async function startHumanDetection() {

    if (detectionRunning) {
        return;
    }

    try {

        console.log("İnsan algılama modeli yükleniyor...");

        humanDetectionModel = await cocoSsd.load();

        console.log("İnsan algılama modeli hazır.");

        detectionRunning = true;

        detectHumans();

    } catch (error) {

        console.error(
            "İnsan algılama modeli yüklenemedi:",
            error
        );

    }
}


async function detectHumans() {

    if (!detectionRunning) {
        return;
    }

    if (
        !humanDetectionModel ||
        video.readyState < 2 ||
        video.videoWidth === 0
    ) {
        requestAnimationFrame(detectHumans);
        return;
    }

    // Önceki algılama bitmeden yenisini başlatma
    if (detectionBusy) {
        requestAnimationFrame(detectHumans);
        return;
    }

    detectionBusy = true;

    try {

        const predictions =
            await humanDetectionModel.detect(video);

        const humans = predictions.filter(
            prediction =>
                prediction.class === "person" &&
                prediction.score >= 0.50
        );

        drawHumanBoxes(humans);

    } catch (error) {

        console.error(
            "İnsan algılama hatası:",
            error
        );

    }

    detectionBusy = false;

    requestAnimationFrame(detectHumans);
}


// İnsanların etrafına kutu çiz
function drawHumanBoxes(humans) {

    const overlay =
        document.getElementById("detectionOverlay");

    if (!overlay) {
        return;
    }

    overlay.innerHTML = "";

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    humans.forEach(person => {

        const [
            x,
            y,
            width,
            height
        ] = person.bbox;

        const box = document.createElement("div");

        box.style.position = "absolute";
        box.style.left =
            `${(x / videoWidth) * 100}%`;

        box.style.top =
            `${(y / videoHeight) * 100}%`;

        box.style.width =
            `${(width / videoWidth) * 100}%`;

        box.style.height =
            `${(height / videoHeight) * 100}%`;

        box.style.border = "3px solid red";
        box.style.boxSizing = "border-box";

        box.style.pointerEvents = "none";

        const label = document.createElement("span");

        label.textContent =
            `İNSAN %${Math.round(person.score * 100)}`;

        label.style.position = "absolute";
        label.style.left = "0";
        label.style.top = "-28px";

        label.style.background = "red";
        label.style.color = "white";

        label.style.padding = "4px 8px";

        label.style.fontSize = "14px";
        label.style.fontFamily = "Arial, sans-serif";

        label.style.fontWeight = "bold";

        box.appendChild(label);

        overlay.appendChild(box);

    });
}


// İnsan algılamayı başlat
const humanDetectionButton =
    document.getElementById("humanDetectionButton");

const humanDetectionStatus =
    document.getElementById("humanDetectionStatus");

humanDetectionButton.addEventListener("click", async () => {

    if (!detectionRunning) {

        humanDetectionStatus.textContent =
            "İnsan algılama başlatılıyor...";

        await startHumanDetection();

        humanDetectionButton.textContent =
            "⏹ İnsan Algılamayı Durdur";

        humanDetectionStatus.textContent =
            "İnsan algılama aktif.";

    } else {

        detectionRunning = false;

        humanDetectionButton.textContent =
            "▶ İnsan Algılamayı Başlat";

        humanDetectionStatus.textContent =
            "İnsan algılama durduruldu.";

        const overlay =
            document.getElementById("detectionOverlay");

        if (overlay) {
            overlay.innerHTML = "";
        }
    }

});
// ===============================
// İNSAN ALGILAMA EVENT STREAM
// ===============================



const humanDetectionTime =
    document.getElementById("humanDetectionTime");

const eventSource =
    new EventSource("http://localhost:3000/api/camera/events");

eventSource.onopen = () => {

    console.log("İnsan algılama event bağlantısı kuruldu.");

    humanDetectionStatus.textContent =
        "🟢 Kamera olayları izleniyor...";

};

eventSource.onmessage = (event) => {

    try {

        const data = JSON.parse(event.data);

        // Sadece gerçek XML kısmını al
        const start = data.indexOf("<EventNotificationAlert");
        const end = data.indexOf("</EventNotificationAlert>");

        if (start === -1 || end === -1) {
            return;
        }

        const xmlText = data.substring(
            start,
            end + "</EventNotificationAlert>".length
        );

        const parser = new DOMParser();

        const xml = parser.parseFromString(
            xmlText,
            "application/xml"
        );

        const eventType =
            xml.getElementsByTagName("eventType")[0]?.textContent;

        const eventState =
            xml.getElementsByTagName("eventState")[0]?.textContent;

        const targetType =
            xml.getElementsByTagName("targetType")[0]?.textContent;

        const dateTime =
            xml.getElementsByTagName("dateTime")[0]?.textContent;

        console.log(
            "ALGILAMA EVENT:",
            eventType,
            eventState,
            targetType
        );

        // İnsan algılandı
        if (
            eventType === "VMD" &&
            targetType === "human" &&
            eventState === "active"
        ) {

            humanDetectionStatus.textContent =
                "🟢 İNSAN ALGILANDI";

            if (dateTime) {

                const date = new Date(dateTime);

                humanDetectionTime.textContent =
                    "Son algılama: " +
                    date.toLocaleString("tr-TR");

            }

        }

        // İnsan algılama sona erdi
        if (
            eventType === "VMD" &&
            targetType === "human" &&
            eventState === "inactive"
        ) {

            humanDetectionStatus.textContent =
                "⚪ İnsan algılanmıyor";

        }

    } catch (error) {

        console.error(
            "İnsan algılama event'i okunamadı:",
            error
        );

    }

};

eventSource.onerror = (error) => {

    console.error(
        "Event stream bağlantı hatası:",
        error
    );

    humanDetectionStatus.textContent =
        "🔴 Kamera olay bağlantısı kesildi";

};







