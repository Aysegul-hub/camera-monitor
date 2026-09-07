const cameraList = document.getElementById("cameraList");
const cameraCount = document.getElementById("cameraCount");

const video = document.getElementById("video");
const noCamera = document.getElementById("noCamera");

const selectedCamera = document.getElementById("selectedCamera");
const cameraName = document.getElementById("cameraName");
const connectionStatus = document.getElementById("connectionStatus");
const lastUpdate = document.getElementById("lastUpdate");

let currentStream = null;


// Kameraları listele
async function listCameras() {

    const devices = await navigator.mediaDevices.enumerateDevices();

    const cameras = devices.filter(device => {
        return device.kind === "videoinput";
    });

    cameraList.innerHTML = "";

    cameraCount.textContent = cameras.length;


    // Hiç kamera yoksa
    if (cameras.length === 0) {

        cameraList.innerHTML = `
            <div class="empty-state">
                <div>📹</div>
                <p>Kamera bulunamadı</p>
            </div>
        `;

        return;
    }


    // Kameraları ekrana ekle
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


// Kamerayı seç
async function selectCamera(camera, cameraItem) {

    console.log("Kamera seçildi:", camera.label);

    // Önceki seçimi kaldır
    document.querySelectorAll(".camera-item").forEach(item => {
        item.classList.remove("selected");
    });

    cameraItem.classList.add("selected");


    // Eski kamera akışını kapat
    if (currentStream) {

        currentStream.getTracks().forEach(track => {
            track.stop();
        });

    }


    try {

        // Seçilen kamerayı aç
        currentStream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: {
                    exact: camera.deviceId
                }
            },
            audio: false
        });


        // Görüntüyü göster
        video.srcObject = currentStream;

        video.style.display = "block";

        noCamera.style.display = "none";


        // Bilgileri güncelle
        selectedCamera.textContent = camera.label;

        cameraName.textContent = camera.label;

        connectionStatus.textContent = "Bağlı";

        lastUpdate.textContent = new Date().toLocaleTimeString("tr-TR");


    } catch (error) {

        console.error("Kamera açılamadı:", error);

        connectionStatus.textContent = "Bağlantı Hatası";

    }

}


// İlk kameraları bul
async function initializeCameras() {

    try {

        // Kamera izni al
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });


        // Bu stream'i hemen kapatıyoruz.
        // Sadece kamera isimlerini görebilmek için izin gerekiyor.
        stream.getTracks().forEach(track => {
            track.stop();
        });


        // Kameraları listele
        await listCameras();

    } catch (error) {

        console.error("Kamera erişimi reddedildi:", error);

    }

}


// Kamera takılıp çıkarıldığında otomatik güncelle
navigator.mediaDevices.addEventListener("devicechange", () => {

    console.log("Kamera cihazlarında değişiklik oldu.");

    listCameras();

});


// Uygulamayı başlat
initializeCameras();