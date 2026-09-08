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
const disconnetButton = document.getElementById("disconnectButton");
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
        const response = await fetch("/api/connect", {

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

        url: "/api/stream"

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
        await fetch("/api/disconnect", {
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