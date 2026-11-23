# Howlat Mobile (Dart / Flutter)

Native mobile application for **Howlat — Personal Money & Debt Ledger**, built with **Flutter & Dart**.

It replicates the exact dark frosted glass fintech design language and connects directly to the existing FastAPI backend.

---

## Architecture & Features

- **Language:** Dart 3.5+
- **Framework:** Flutter 3.24+
- **Frosted Glass UI:** GPU-accelerated `BackdropFilter` with `ImageFilter.blur`
- **Zero Float Inaccuracy:** All amounts parsed using the `decimal` package
- **API Client:** `Dio` with automatic JWT Bearer authentication and UUID `Idempotency-Key` headers
- **Secure Token Storage:** Hardware KeyStore (Android) & Keychain (iOS) via `flutter_secure_storage`

---

## Getting Started

### 1. Prerequisites
Install Flutter on your computer:
```powershell
# Using Windows Package Manager (winget)
winget install Google.Flutter
```
Verify the installation:
```powershell
flutter doctor
```

### 2. Install Dependencies
Navigate into the `mobile` folder:
```powershell
cd mobile
flutter pub get
```

### 3. Connect to Your Backend
In `lib/core/services/api_client.dart`:
- **Android Emulator:** Uses `http://10.0.2.2:8000/api/v1` (pre-configured)
- **Physical Phone over Wi-Fi:** Set your PC's local IP: `http://192.168.x.x:8000/api/v1`
- **Production Cloud:** Set your Render live URL: `https://your-service.onrender.com/api/v1`

### 4. Run the App
```powershell
flutter run
```

### 5. Build Standalone Android APK
```powershell
flutter build apk --release
```
The installable `.apk` file will be generated at:
`build/app/outputs/flutter-apk/app-release.apk`
