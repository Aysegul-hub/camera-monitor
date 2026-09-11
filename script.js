const cameraList = document.getElementById("cameraList");
const cameraCount = document.getElementById("cameraCount");

const video = document.getElementById("video");
const detectionVideo = document.getElementById("detectionVideo");
const streamType = document.getElementById("streamType");
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
let detectionPlayer = null;
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


        selectedCamera.textContent =
            camera.label || "USB Kamera";

        cameraName.textContent =
            camera.label || "USB Kamera";

        connectionStatus.textContent =
            "Bağlı";

        lastUpdate.textContent =
            new Date().toLocaleTimeString("tr-TR");

    } catch (error) {

        console.error(
            "USB kamera açılamadı:",
            error
        );

        connectionStatus.textContent =
            "Bağlantı Hatası";
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

    cameraPanelTitle.textContent =
        "Bağlı USB Kameralar";

    stopEthernetPlayer();

    video.srcObject = null;

    video.style.display = "none";

    noCamera.style.display = "flex";

    selectedCamera.textContent =
        "Kamera seçilmedi";

    cameraName.textContent = "-";

    connectionStatus.textContent =
        "Bekliyor";

    listCameras();
});


ethernetButton.addEventListener("click", () => {

    currentMode = "ethernet";

    ethernetButton.classList.add("active");
    usbButton.classList.remove("active");

    ethernetSection.style.display = "block";

    cameraPanelTitle.textContent =
        "Ethernet Kameralar";

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

    selectedCamera.textContent =
        "Ethernet kamera seçilmedi";

    cameraName.textContent = "-";

    connectionStatus.textContent =
        "Bekliyor";
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

connectButton.addEventListener(
    "click",
    connectEthernetCamera
);


async function connectEthernetCamera() {

    const url = rtspUrl.value.trim();


    if (!url) {

        rtspStatus.textContent =
            "Lütfen RTSP adresini girin.";

        return;
    }


    if (!url.startsWith("rtsp://")) {

        rtspStatus.textContent =
            "Geçerli bir RTSP adresi girin.";

        return;
    }


    console.log(
        "Ethernet kamera bağlanıyor..."
    );


    connectButton.disabled = true;

    connectButton.textContent =
        "⏳ Bağlanıyor...";

    rtspStatus.textContent =
        "RTSP kameraya bağlanılıyor...";


    try {

        stopUSBStream();

        stopEthernetPlayer();


        let selectedRtspUrl = url;


        // Hikvision Main / Sub Stream seçimi
        if (
            url.includes(
                "/Streaming/Channels/"
            )
        ) {

            if (
                streamType &&
                streamType.value === "sub"
            ) {

                selectedRtspUrl =
                    url.replace(
                        /\/Streaming\/Channels\/\d+/i,
                        "/Streaming/Channels/102"
                    );

            } else {

                selectedRtspUrl =
                    url.replace(
                        /\/Streaming\/Channels\/\d+/i,
                        "/Streaming/Channels/101"
                    );
            }
        }


        // İnsan algılama için her zaman Sub Stream
        const detectionRtspUrl =
            url.includes(
                "/Streaming/Channels/"
            )
                ? url.replace(
                    /\/Streaming\/Channels\/\d+/i,
                    "/Streaming/Channels/102"
                )
                : url;


        // RTSP adreslerini backend'e gönder
        const response = await fetch(
            "http://localhost:3000/api/connect",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    rtspUrl: selectedRtspUrl,
                    detectionRtspUrl: detectionRtspUrl
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Bağlantı başarısız."
            );
        }


        console.log(
            "RTSP adresleri backend'e gönderildi."
        );


        addEthernetCamera();


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
            new Date().toLocaleTimeString(
                "tr-TR"
            );


    } catch (error) {

        console.error(
            "Ethernet kamera hatası:",
            error
        );

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


    const cameraItem =
        document.createElement("div");

    cameraItem.className =
        "camera-item selected";


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


    cameraItem.addEventListener(
        "click",
        () => {

            startEthernetPlayer();

        }
    );


    cameraList.appendChild(
        cameraItem
    );
}


// ========================================
// ETHERNET CANLI GÖRÜNTÜ
// ========================================

function startEthernetPlayer() {

    latencyValues = [];


    if (!mpegts.isSupported()) {

        console.error(
            "mpegts.js bu tarayıcıda desteklenmiyor."
        );

        rtspStatus.textContent =
            "Tarayıcı MPEG-TS oynatmayı desteklemiyor.";

        return;
    }


    stopEthernetPlayer();


    currentMode = "ethernet";


    video.srcObject = null;

    video.style.display = "block";

    noCamera.style.display = "none";


    currentPlayer =
        mpegts.createPlayer(
            {
                type: "mpegts",

                isLive: true,

                url:
                    "http://localhost:3000/api/stream"
            },

            {
                enableStashBuffer: false,

                liveBufferLatencyChasing:
                    true,

                liveBufferLatencyMaxLatency:
                    1.5,

                liveBufferLatencyMinRemain:
                    0.5
            }
        );


    currentPlayer.attachMediaElement(
        video
    );


    currentPlayer.load();


    currentPlayer.play().catch(
        error => {

            console.error(
                "Video oynatma hatası:",
                error
            );

        }
    );


    // İnsan algılama zaten açıksa
    // Sub Stream'i tekrar başlat
    if (detectionRunning) {

        startDetectionPlayer();
    }


    console.log(
        "Ethernet canlı görüntü başlatıldı."
    );
}


// ========================================
// İNSAN ALGILAMA SUB STREAM PLAYER
// ========================================

function startDetectionPlayer() {

    if (
        currentMode !== "ethernet"
    ) {

        return true;
    }


    if (!detectionVideo) {

        console.error(
            "detectionVideo bulunamadı."
        );

        return false;
    }


    if (
        !mpegts.isSupported()
    ) {

        console.error(
            "mpegts.js desteklenmiyor."
        );

        return false;
    }


    // Zaten çalışıyorsa tekrar oluşturma
    if (detectionPlayer) {

        return true;
    }


    detectionVideo.muted = true;

    detectionVideo.playsInline = true;

    detectionVideo.style.display =
        "block";

    detectionVideo.style.width =
        "1px";

    detectionVideo.style.height =
        "1px";

    detectionVideo.style.opacity =
        "0";

    detectionVideo.style.pointerEvents =
        "none";


    detectionPlayer =
        mpegts.createPlayer(
            {
                type: "mpegts",

                isLive: true,

                url:
                    "http://localhost:3000/api/detection-stream"
            },

            {
                enableStashBuffer: false,

                liveBufferLatencyChasing:
                    true,

                liveBufferLatencyMaxLatency:
                    1.5,

                liveBufferLatencyMinRemain:
                    0.5
            }
        );


    detectionPlayer.attachMediaElement(
        detectionVideo
    );


    detectionPlayer.load();


    detectionPlayer.play().catch(
        error => {

            console.error(
                "Sub Stream oynatma hatası:",
                error
            );

        }
    );


    console.log(
        "İnsan algılama için Sub Stream başlatıldı."
    );


    return true;
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


    if (detectionPlayer) {

        try {

            detectionPlayer.pause();

            detectionPlayer.unload();

            detectionPlayer.detachMediaElement();

            detectionPlayer.destroy();

        } catch (error) {

            console.error(
                "Sub Stream player kapatılırken hata:",
                error
            );
        }

        detectionPlayer = null;
    }


    if (detectionVideo) {

        detectionVideo.pause();

        detectionVideo.removeAttribute(
            "src"
        );

        detectionVideo.load();

        detectionVideo.style.display =
            "none";
    }
}


// ========================================
// İLK KAMERALARI BUL
// ========================================

async function initializeCameras() {

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia(
                {
                    video: true,
                    audio: false
                }
            );


        stream.getTracks().forEach(
            track => {

                track.stop();

            }
        );


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


        if (
            currentMode === "usb"
        ) {

            listCameras();
        }

    }
);


// ========================================
// BAŞLANGIÇ
// ========================================

ethernetSection.style.display =
    "none";


initializeCameras();


disconnectButton.addEventListener(
    "click",
    async () => {

        stopEthernetPlayer();


        detectionRunning = false;

        detectionBusy = false;


        if (
            humanDetectionButton
        ) {

            humanDetectionButton.textContent =
                "▶ İnsan Algılamayı Başlat";
        }


        if (
            humanDetectionStatus
        ) {

            humanDetectionStatus.textContent =
                "İnsan algılama hazır.";
        }


        if (
            humanDetectionTime
        ) {

            humanDetectionTime.textContent =
                "Son algılama: -";
        }


        try {

            await fetch(
                "http://localhost:3000/api/disconnect",
                {
                    method: "POST"
                }
            );


            rtspStatus.textContent =
                "Kamera bağlantısı kesildi.";

            selectedCamera.textContent =
                "Kamera seçilmedi";

            connectionStatus.textContent =
                "Bekliyor";

            cameraName.textContent =
                "-";

            lastUpdate.textContent =
                "-";


            cameraList.innerHTML =
                "";

            cameraCount.textContent =
                "0";

            noCamera.style.display =
                "flex";


        } catch (error) {

            console.error(
                "Bağlantı kesme hatası:",
                error
            );

            rtspStatus.textContent =
                "Bağlantı kesilemedi.";
        }

    }
);


// ========================================
// CANLI GECİKME ÖLÇÜMÜ
// ========================================

let latencyValues = [];


function updateLatency() {

    const latencyDisplay =
        document.getElementById(
            "latencyDisplay"
        );


    if (
        currentMode !== "ethernet" ||
        !currentPlayer ||
        video.readyState < 2 ||
        video.buffered.length === 0
    ) {

        return;
    }


    const liveEdge =
        video.buffered.end(
            video.buffered.length - 1
        );


    const currentTime =
        video.currentTime;


    const latency =
        liveEdge - currentTime;


    latencyValues.push(
        latency
    );


    if (
        latencyValues.length > 8
    ) {

        latencyValues.shift();
    }


    const averageLatency =
        latencyValues.reduce(
            (a, b) => a + b,
            0
        ) /
        latencyValues.length;


    const milliseconds =
        Math.round(
            averageLatency * 1000
        );


    latencyDisplay.innerHTML = `
        <span class="latency-dot"></span>
        <span class="latency-label">CANLI GECİKME</span>
        <strong>${milliseconds} ms</strong>
    `;
}


setInterval(
    updateLatency,
    500
);


// ========================================
// HIKVISION KAMERA KONTROLLERİ
// ========================================

const dayModeButton =
    document.getElementById(
        "dayModeButton"
    );

const autoModeButton =
    document.getElementById(
        "autoModeButton"
    );

const nightModeButton =
    document.getElementById(
        "nightModeButton"
    );


const normalImageButton =
    document.getElementById(
        "normalImageButton"
    );

const rotateImageButton =
    document.getElementById(
        "rotateImageButton"
    );


// Gece / gündüz modunu değiştir
async function setNightMode(
    mode,
    button
) {

    try {

        const response =
            await fetch(
                "http://localhost:3000/api/camera/night-mode",
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        mode: mode
                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                "Kamera ayarı değiştirilemedi."
            );
        }


        document
            .querySelectorAll(
                ".control-buttons .control-button"
            )
            .forEach(btn => {

                btn.classList.remove(
                    "active"
                );

            });


        button.classList.add(
            "active"
        );


        console.log(
            "Gece/Gündüz modu:",
            mode
        );


    } catch (error) {

        console.error(
            "Kamera kontrol hatası:",
            error
        );

        alert(
            "Kamera ayarı değiştirilemedi."
        );
    }
}


dayModeButton.addEventListener(
    "click",
    () => {

        setNightMode(
            "day",
            dayModeButton
        );

    }
);


autoModeButton.addEventListener(
    "click",
    () => {

        setNightMode(
            "auto",
            autoModeButton
        );

    }
);


nightModeButton.addEventListener(
    "click",
    () => {

        setNightMode(
            "night",
            nightModeButton
        );

    }
);


// ========================================
// GÖRÜNTÜ DÖNDÜRME
// ========================================

let imageRotated = false;


normalImageButton.addEventListener(
    "click",
    () => {

        imageRotated = false;

        video.style.transform =
            "rotate(0deg)";

        normalImageButton.classList.add(
            "active"
        );

        rotateImageButton.classList.remove(
            "active"
        );

    }
);


rotateImageButton.addEventListener(
    "click",
    () => {

        imageRotated = true;

        video.style.transform =
            "rotate(180deg)";

        rotateImageButton.classList.add(
            "active"
        );

        normalImageButton.classList.remove(
            "active"
        );

    }
);


// ========================================
// KAMERA TARİH / SAAT
// ========================================

const cameraDate =
    document.getElementById(
        "cameraDate"
    );

const cameraTime =
    document.getElementById(
        "cameraTime"
    );

const cameraTimezone =
    document.getElementById(
        "cameraTimezone"
    );

const cameraTimeMode =
    document.getElementById(
        "cameraTimeMode"
    );


const syncCameraTimeButton =
    document.getElementById(
        "syncCameraTimeButton"
    );


const timeSyncStatus =
    document.getElementById(
        "timeSyncStatus"
    );


// Kameranın mevcut tarih ve saat bilgisini oku
async function getCameraTime() {

    try {

        const response =
            await fetch(
                "http://localhost:3000/api/camera/time"
            );


        if (!response.ok) {

            throw new Error(
                "Kamera saat bilgisi alınamadı."
            );
        }


        const xmlText =
            await response.text();


        const parser =
            new DOMParser();


        const xml =
            parser.parseFromString(
                xmlText,
                "application/xml"
            );


        const timeMode =
            xml.querySelector(
                "timeMode"
            )?.textContent;


        const localTime =
            xml.querySelector(
                "localTime"
            )?.textContent;


        const timeZone =
            xml.querySelector(
                "timeZone"
            )?.textContent;


        if (!localTime) {

            throw new Error(
                "Kamera zamanı bulunamadı."
            );
        }


        const date =
            new Date(localTime);


        cameraDate.textContent =
            date.toLocaleDateString(
                "tr-TR"
            );


        cameraTime.textContent =
            date.toLocaleTimeString(
                "tr-TR"
            );


        cameraTimezone.textContent =
            timeZone || "-";


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

    syncCameraTimeButton.disabled =
        true;

    syncCameraTimeButton.textContent =
        "⏳ Senkronize ediliyor...";

    timeSyncStatus.textContent =
        "Kamera saati NTP ile senkronize ediliyor...";


    try {

        const response =
            await fetch(
                "http://localhost:3000/api/camera/time/ntp",
                {
                    method: "PUT"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Senkronizasyon başarısız."
            );
        }


        timeSyncStatus.textContent =
            "✓ Kamera saati başarıyla senkronize edildi.";


        await getCameraTime();


    } catch (error) {

        console.error(
            "Saat senkronizasyon hatası:",
            error
        );


        timeSyncStatus.textContent =
            "✕ Kamera saati senkronize edilemedi.";


    } finally {

        syncCameraTimeButton.disabled =
            false;

        syncCameraTimeButton.textContent =
            "🔄 Saati Senkronize Et";
    }
}


syncCameraTimeButton.addEventListener(
    "click",
    syncCameraTime
);


getCameraTime();


setInterval(
    getCameraTime,
    30000
);


// ========================================
// PARLAKLIK VE KONTRAST
// ========================================

const brightnessSlider =
    document.getElementById(
        "brightness"
    );

const contrastSlider =
    document.getElementById(
        "contrast"
    );


async function updateImageSettings() {

    const brightness =
        brightnessSlider.value;

    const contrast =
        contrastSlider.value;


    try {

        const response =
            await fetch(
                "http://localhost:3000/api/camera/image-settings",
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        brightness:
                            brightness,

                        contrast:
                            contrast
                    })
                }
            );


        const data =
            await response.json();


        console.log(
            "Görüntü ayarları:",
            data
        );


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


// ========================================
// ÇÖZÜNÜRLÜK
// ========================================

const resolutionSelect =
    document.getElementById(
        "resolutionSelect"
    );


const applyResolutionButton =
    document.getElementById(
        "applyResolutionButton"
    );


const resolutionStatus =
    document.getElementById(
        "resolutionStatus"
    );


async function getCameraResolution() {

    try {

        const response =
            await fetch(
                "http://localhost:3000/api/camera/resolution"
            );


        if (!response.ok) {

            throw new Error(
                "Kamera çözünürlüğü okunamadı."
            );
        }


        const xmlText =
            await response.text();


        const parser =
            new DOMParser();


        const xml =
            parser.parseFromString(
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


    const [
        width,
        height
    ] =
        selectedResolution.split("x");


    applyResolutionButton.disabled =
        true;


    applyResolutionButton.textContent =
        "⏳ Uygulanıyor...";


    resolutionStatus.textContent =
        "Kamera çözünürlüğü değiştiriliyor...";


    try {

        const response =
            await fetch(
                "http://localhost:3000/api/camera/resolution",
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        width:
                            Number(width),

                        height:
                            Number(height)
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

        applyResolutionButton.disabled =
            false;

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


// İnsan algılamayı başlat
async function startHumanDetection() {

    if (detectionRunning) {

        return true;
    }


    try {

        console.log(
            "İnsan algılama modeli yükleniyor..."
        );


        // Hafif model kullan
        humanDetectionModel =
            await cocoSsd.load({
                base: "lite_mobilenet_v2"
            });


        // Ethernet'te Sub Stream kullan
        if (
            currentMode === "ethernet"
        ) {

            if (
                !startDetectionPlayer()
            ) {

                throw new Error(
                    "Sub Stream başlatılamadı."
                );
            }
        }


        console.log(
            "İnsan algılama modeli hazır."
        );


        detectionRunning =
            true;

        detectionBusy =
            false;


        detectHumans();


        return true;


    } catch (error) {

        console.error(
            "İnsan algılama başlatılamadı:",
            error
        );


        humanDetectionModel =
            null;

        detectionRunning =
            false;


        return false;
    }
}


// İnsan algılamayı kontrol et
async function detectHumans() {

    if (!detectionRunning) {

        return;
    }


    const detectionSource =
        currentMode === "ethernet" &&
        detectionVideo
            ? detectionVideo
            : video;


    if (
        !humanDetectionModel ||
        !detectionSource ||
        detectionSource.readyState < 2 ||
        detectionSource.videoWidth === 0
    ) {

        setTimeout(
            detectHumans,
            500
        );

        return;
    }


    if (detectionBusy) {

        setTimeout(
            detectHumans,
            100
        );

        return;
    }


    detectionBusy = true;


    try {

        const predictions =
            await humanDetectionModel.detect(
                detectionSource
            );


        const humans =
            predictions.filter(
                prediction =>
                    prediction.class === "person" &&
                    prediction.score >= 0.50
            );


        drawHumanBoxes(
            humans,
            detectionSource
        );


        if (
            humans.length > 0
        ) {

            humanDetectionStatus.textContent =
                "🟢 İNSAN ALGILANDI";


            humanDetectionTime.textContent =
                "Son algılama: " +
                new Date().toLocaleString(
                    "tr-TR"
                );

        } else if (
            detectionRunning
        ) {

            humanDetectionStatus.textContent =
                "⚪ İnsan algılanmıyor";
        }


        console.log(
            "İnsan sayısı:",
            humans.length
        );


    } catch (error) {

        console.error(
            "İnsan algılama hatası:",
            error
        );


    } finally {

        detectionBusy =
            false;


        setTimeout(
            detectHumans,
            500
        );
    }
}


// ========================================
// İNSAN KUTULARI
// ========================================

function drawHumanBoxes(
    humans,
    detectionSource = video
) {

    const overlay =
        document.getElementById(
            "detectionOverlay"
        );


    if (!overlay) {

        console.error(
            "detectionOverlay bulunamadı."
        );

        return;
    }


    overlay.innerHTML =
        "";


    const videoWidth =
        detectionSource.videoWidth;

    const videoHeight =
        detectionSource.videoHeight;


    if (
        !videoWidth ||
        !videoHeight
    ) {

        return;
    }


    // Görüntünün ekranda kapladığı alan
    const containerWidth =
        video.parentElement.clientWidth;

    const containerHeight =
        video.parentElement.clientHeight;


    const videoRatio =
        videoWidth /
        videoHeight;


    const containerRatio =
        containerWidth /
        containerHeight;


    let displayWidth;

    let displayHeight;

    let offsetX;

    let offsetY;


    if (
        videoRatio >
        containerRatio
    ) {

        displayWidth =
            containerWidth;

        displayHeight =
            containerWidth /
            videoRatio;

        offsetX =
            0;

        offsetY =
            (
                containerHeight -
                displayHeight
            ) / 2;

    } else {

        displayHeight =
            containerHeight;

        displayWidth =
            containerHeight *
            videoRatio;

        offsetX =
            (
                containerWidth -
                displayWidth
            ) / 2;

        offsetY =
            0;
    }


    overlay.style.left =
        `${offsetX}px`;

    overlay.style.top =
        `${offsetY}px`;

    overlay.style.width =
        `${displayWidth}px`;

    overlay.style.height =
        `${displayHeight}px`;


    humans.forEach(
        person => {

            const [
                x,
                y,
                width,
                height
            ] =
                person.bbox;


            const box =
                document.createElement(
                    "div"
                );


            box.style.position =
                "absolute";


            box.style.left =
                `${(x / videoWidth) * 100}%`;


            box.style.top =
                `${(y / videoHeight) * 100}%`;


            box.style.width =
                `${(width / videoWidth) * 100}%`;


            box.style.height =
                `${(height / videoHeight) * 100}%`;


            box.style.border =
                "3px solid red";


            box.style.boxSizing =
                "border-box";


            box.style.pointerEvents =
                "none";


            const label =
                document.createElement(
                    "span"
                );


            label.textContent =
                `İNSAN %${Math.round(
                    person.score * 100
                )}`;


            label.style.position =
                "absolute";


            label.style.left =
                "0";


            label.style.top =
                "-28px";


            label.style.background =
                "red";


            label.style.color =
                "white";


            label.style.padding =
                "4px 8px";


            label.style.fontSize =
                "14px";


            label.style.fontFamily =
                "Arial, sans-serif";


            label.style.fontWeight =
                "bold";


            box.appendChild(
                label
            );


            overlay.appendChild(
                box
            );
        }
    );
}


// İnsan algılama butonu
const humanDetectionButton =
    document.getElementById(
        "humanDetectionButton"
    );


const humanDetectionStatus =
    document.getElementById(
        "humanDetectionStatus"
    );


const humanDetectionTime =
    document.getElementById(
        "humanDetectionTime"
    );


humanDetectionButton.addEventListener(
    "click",
    async () => {

        if (
            !detectionRunning
        ) {

            humanDetectionStatus.textContent =
                "İnsan algılama başlatılıyor...";


            const started =
                await startHumanDetection();


            if (started) {

                humanDetectionButton.textContent =
                    "⏹ İnsan Algılamayı Durdur";


                humanDetectionStatus.textContent =
                    "İnsan algılama aktif.";

            } else {

                humanDetectionStatus.textContent =
                    "🔴 İnsan algılama başlatılamadı.";
            }


        } else {

            detectionRunning =
                false;

            detectionBusy =
                false;


            if (
                currentMode === "ethernet" &&
                detectionPlayer
            ) {

                try {

                    detectionPlayer.pause();

                    detectionPlayer.unload();

                    detectionPlayer.detachMediaElement();

                    detectionPlayer.destroy();

                } catch (error) {

                    console.error(
                        "Sub Stream durdurulamadı:",
                        error
                    );
                }


                detectionPlayer =
                    null;
            }


            if (detectionVideo) {

                detectionVideo.pause();

                detectionVideo.removeAttribute(
                    "src"
                );

                detectionVideo.load();

                detectionVideo.style.display =
                    "none";
            }


            humanDetectionButton.textContent =
                "▶ İnsan Algılamayı Başlat";


            humanDetectionStatus.textContent =
                "İnsan algılama hazır.";


            humanDetectionTime.textContent =
                "Son algılama: -";


            const overlay =
                document.getElementById(
                    "detectionOverlay"
                );


            if (overlay) {

                overlay.innerHTML =
                    "";
            }
        }

    }
);


// ========================================
// İNSAN ALGILAMA EVENT STREAM
// ========================================

const eventSource =
    new EventSource(
        "http://localhost:3000/api/camera/events"
    );


eventSource.onopen = () => {

    console.log(
        "İnsan algılama event bağlantısı kuruldu."
    );
};


eventSource.onmessage =
    event => {

        try {

            const data =
                JSON.parse(
                    event.data
                );


            // Sadece gerçek XML kısmını al
            const start =
                data.indexOf(
                    "<EventNotificationAlert"
                );


            const end =
                data.indexOf(
                    "</EventNotificationAlert>"
                );


            if (
                start === -1 ||
                end === -1
            ) {

                return;
            }


            const xmlText =
                data.substring(
                    start,
                    end +
                    "</EventNotificationAlert>"
                        .length
                );


            const parser =
                new DOMParser();


            const xml =
                parser.parseFromString(
                    xmlText,
                    "application/xml"
                );


            const eventType =
                xml.getElementsByTagName(
                    "eventType"
                )[0]?.textContent;


            const eventState =
                xml.getElementsByTagName(
                    "eventState"
                )[0]?.textContent;


            const targetType =
                xml.getElementsByTagName(
                    "targetType"
                )[0]?.textContent;


            console.log(
                "ALGILAMA EVENT:",
                eventType,
                eventState,
                targetType
            );


            if (
                !detectionRunning
            ) {

                return;
            }


            if (
                eventType === "VMD" &&
                targetType === "human" &&
                eventState === "active"
            ) {

                humanDetectionStatus.textContent =
                    "🟢 İNSAN ALGILANDI";


                const detectionDate =
                    new Date();


                humanDetectionTime.textContent =
                    "Son algılama: " +
                    detectionDate.toLocaleString(
                        "tr-TR"
                    );
            }


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


eventSource.onerror =
    error => {

        console.error(
            "Event stream bağlantı hatası:",
            error
        );
    };


// ========================================
// GENEL HAREKET ALGILAMA
// ========================================

const cameraEventLog =
    document.getElementById(
        "cameraEventLog"
    );


const motionCanvas =
    document.createElement(
        "canvas"
    );


const motionContext =
    motionCanvas.getContext(
        "2d",
        {
            willReadFrequently:
                true
        }
    );


motionCanvas.width =
    320;

motionCanvas.height =
    180;


let previousFrame =
    null;

let motionRunning =
    false;

let lastMotionTime =
    0;


const MOTION_INTERVAL =
    150;

const MOTION_THRESHOLD =
    18;

const MOTION_PIXEL_RATIO =
    0.015;

const MOTION_COOLDOWN =
    700;


// ========================================
// HAREKET KONTROLÜ
// ========================================

function detectGeneralMotion() {

    if (
        currentMode !== "ethernet" ||
        !video ||
        video.readyState < 2 ||
        video.videoWidth === 0
    ) {

        setTimeout(
            detectGeneralMotion,
            MOTION_INTERVAL
        );

        return;
    }


    motionContext.drawImage(
        video,
        0,
        0,
        motionCanvas.width,
        motionCanvas.height
    );


    const currentFrame =
        motionContext.getImageData(
            0,
            0,
            motionCanvas.width,
            motionCanvas.height
        );


    // İlk kareyi referans olarak al
    if (!previousFrame) {

        previousFrame =
            currentFrame;


        setTimeout(
            detectGeneralMotion,
            MOTION_INTERVAL
        );


        return;
    }


    let changedPixels =
        0;


    const totalPixels =
        motionCanvas.width *
        motionCanvas.height;


    // İki kare arasındaki farkı hesapla
    for (
        let i = 0;
        i < currentFrame.data.length;
        i += 4
    ) {

        const currentBrightness =
            (
                currentFrame.data[i] +
                currentFrame.data[i + 1] +
                currentFrame.data[i + 2]
            ) / 3;


        const previousBrightness =
            (
                previousFrame.data[i] +
                previousFrame.data[i + 1] +
                previousFrame.data[i + 2]
            ) / 3;


        const difference =
            Math.abs(
                currentBrightness -
                previousBrightness
            );


        if (
            difference >=
            MOTION_THRESHOLD
        ) {

            changedPixels++;
        }
    }


    const changedRatio =
        changedPixels /
        totalPixels;


    const now =
        Date.now();


    // Yeterli miktarda görüntü değiştiyse hareket var
    if (
        changedRatio >=
        MOTION_PIXEL_RATIO &&
        now -
        lastMotionTime >=
        MOTION_COOLDOWN
    ) {

        lastMotionTime =
            now;


        updateMotionEvent();
    }


    // Mevcut kareyi bir sonraki karşılaştırma için sakla
    previousFrame =
        currentFrame;


    setTimeout(
        detectGeneralMotion,
        MOTION_INTERVAL
    );
}


// ========================================
// KAMERA OLAYINI GÜNCELLE
// ========================================

function updateMotionEvent() {

    const now =
        new Date();


    const time =
        now.toLocaleString(
            "tr-TR"
        );


    cameraEventLog.innerHTML = `
        <div class="camera-event">
            <strong>🟢 Hareket algılandı</strong>

            <div class="camera-event-time">
                Son hareket: ${time}
            </div>
        </div>
    `;
}


// ========================================
// GENEL HAREKET ALGILAMAYI BAŞLAT
// ========================================

function startGeneralMotionDetection() {

    if (
        motionRunning
    ) {

        return;
    }


    motionRunning =
        true;


    detectGeneralMotion();


    console.log(
        "Genel hareket algılama aktif."
    );
}


// ========================================
// SAYFA AÇILINCA HAREKET ALGILAMAYI BAŞLAT
// ========================================

startGeneralMotionDetection();