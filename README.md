# 📹 Camera Monitor

Camera Monitor, USB ve Ethernet üzerinden bağlanan kameraların canlı görüntüsünü web arayüzü üzerinden izlemek için geliştirilmiş bir kamera izleme uygulamasıdır.

## 🚀 Özellikler

- 🔌 USB kameraları otomatik olarak algılama
- 🌐 Ethernet / IP kamera desteği
- 📡 RTSP kamera bağlantısı
- 🎥 Canlı kamera görüntüsü
- 📋 Bağlı kameraları listeleme
- ⛔ Kamera bağlantısını kesme
- ⚡ Düşük gecikmeli canlı görüntü
- 🖥️ Modern ve responsive arayüz

## 🛠️ Kullanılan Teknolojiler

- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- FFmpeg
- mpegts.js
- RTSP
- MediaDevices API

## ⚙️ Çalışma Mantığı

Ethernet kamera tarafında RTSP üzerinden alınan görüntü Node.js ve FFmpeg aracılığıyla tarayıcıya aktarılır.

```text
IP Kamera
    ↓
   RTSP
    ↓
  FFmpeg
    ↓
 Node.js / Express
    ↓
  mpegts.js
    ↓
 Web Tarayıcısı
