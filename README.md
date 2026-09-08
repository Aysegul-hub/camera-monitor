# 📹 Camera Monitor

Camera Monitor, USB ve Ethernet üzerinden bağlanan kameraların canlı görüntüsünü web arayüzü üzerinden izlemek için geliştirilmiş bir kamera izleme uygulamasıdır.

## 🚀 Özellikler

* 🔌 USB kameraları otomatik olarak algılama
* 🌐 Ethernet / IP kamera desteği
* 📡 RTSP kamera bağlantısı
* 🎥 Canlı kamera görüntüsü
* 📋 Bağlı kameraları listeleme
* ⛔ Kamera bağlantısını kesme
* ⚡ Düşük gecikmeli canlı görüntü
* 📊 Canlı gecikme göstergesi
* 🖥️ Modern ve responsive arayüz

## 🛠️ Kullanılan Teknolojiler

* HTML5
* CSS3
* JavaScript
* Node.js
* Express.js
* FFmpeg
* mpegts.js
* RTSP
* MediaDevices API

## ⚙️ Çalışma Mantığı

### USB Kamera

USB kameralar, tarayıcının MediaDevices API'si kullanılarak algılanır ve seçilen kameranın görüntüsü doğrudan video elementinde gösterilir.

```text
USB Kamera
    ↓
MediaDevices API
    ↓
JavaScript
    ↓
HTML Video
```

### Ethernet / RTSP Kamera

Ethernet kameradan alınan RTSP görüntüsü Node.js ve FFmpeg üzerinden tarayıcıya aktarılır.

```text
IP Kamera
    ↓
RTSP
    ↓
FFmpeg
    ↓
Node.js / Express
    ↓
MPEG-TS
    ↓
mpegts.js
    ↓
Web Tarayıcısı
```

## 💻 Kurulum

Projeyi bilgisayarınıza indirdikten sonra proje klasöründe:

```bash
npm install
```

Backend'i başlatın:

```bash
node server.js
```

*** Sorun yaşamanız halinde terminale taskkill /F /IM node.exe yazıp sonra yeniden node server.js diye deneyebilirsiniz...

Daha sonra `index.html` dosyasını **Live Server** ile açabilirsiniz.

> Ethernet / RTSP kamera görüntüsünün çalışması için Node.js backend ve FFmpeg'in çalışıyor olması gerekir.

## 🌐 Canlı Demo

[**Camera Monitor — Canlı Demo**](https://camera-monitor-aysegul.netlify.app/)

> Netlify sürümü arayüzü ve frontend özelliklerini gösterir. RTSP kamera bağlantısı için yerel ortamda çalışan Node.js + FFmpeg backend gereklidir.

## 📸 Screenshot

![Camera Monitor](screenshot.png)

## 📁 Proje Yapısı

```text
Camera Monitor/
├── index.html
├── style.css
├── script.js
├── server.js
├── package.json
├── package-lock.json
└── screenshot.png
```

## 👩‍💻 Geliştirici

**Ayşegül Delialioğlu**

Computer Engineering Student
