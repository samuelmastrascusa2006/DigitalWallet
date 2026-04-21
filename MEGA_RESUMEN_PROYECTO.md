# Mega resumen tecnico - MyDigitalWallet (Ionic + Angular + Firebase + Google Cloud)

## 1) Que es este proyecto

**MyDigitalWallet** es una app movil (Android) hecha con **Ionic 7 + Angular 17 + Capacitor**, conectada a **Firebase** para:

- Autenticacion (correo/password + Google Sign-In)
- Base de datos (Firestore)
- Push notifications (FCM)
- Soporte biometrico para login/pagos

Tambien integra un **backend externo de notificaciones** (deployado en Railway) para enviar push via endpoint HTTP autenticado con JWT.

---

## 2) Estructura real del repositorio

Ruta principal del proyecto app:

`D:\UNIVERSIDAD\SEMESTRE 7\SegundoCorteJesus\ParcialMobile\MyDigitalWallet`

Archivos/carpetas clave:

- `src\app\core\services\` -> servicios (auth, firestore, cards, pagos, notificaciones, biometria, etc.)
- `src\app\core\guards\` -> guards de acceso
- `src\app\pages\` -> paginas (login, register, home, add-card, payment, transfer)
- `src\app\shared\components\` -> componentes reutilizables UI/UX
- `src\environments\` -> configuraciones de Firebase/Google/notificaciones
- `android\` -> proyecto nativo Android (google-services, manifest, gradle)
- `capacitor.config.ts` -> configuracion plugins Capacitor

Archivos importantes fuera de la app:

- `D:\UNIVERSIDAD\SEMESTRE 7\SegundoCorteJesus\digitalwallet-eb287-firebase-adminsdk-fbsvc-cecc92409b.json` (service account Firebase Admin SDK)
- `D:\UNIVERSIDAD\SEMESTRE 7\SegundoCorteJesus\google-services.json` (config Android Firebase)

---

## 3) Stack y dependencias exactas

### Stack base

- Angular `^17.3.0`
- Ionic `^7.8.0`
- Capacitor Android `^8.3.1`
- Firebase JS SDK `^10.8.0`
- AngularFire `^17.1.0`
- TypeScript strict mode

### Plugins/librerias funcionales

- `@capawesome/capacitor-google-sign-in`
- `@capacitor/push-notifications`
- `@capacitor/haptics`
- `@capacitor/toast`
- `capacitor-native-biometric`
- `@faker-js/faker`
- `@ctrl/ngx-emoji-mart`
- `animejs`

---

## 4) Paso a paso completo para rehacer todo desde cero

## Fase A - Preparacion local

1. Instalar:
   - Node LTS
   - npm
   - Ionic CLI (`npm i -g @ionic/cli`)
   - Android Studio + SDK
   - Java (para build Android y obtener SHA)
2. Crear app base:
   ```bash
   ionic start MyDigitalWallet blank --type=angular --capacitor --no-standalone
   ```
3. Entrar al proyecto e instalar dependencias:
   ```bash
   npm install
   npm install @angular/fire firebase
   npm install capacitor-native-biometric
   npm install @capawesome/capacitor-google-sign-in
   npm install @capacitor/push-notifications
   npm install @capacitor/haptics
   npm install @capacitor/splash-screen
   npm install @capacitor/toast
   npm install @faker-js/faker
   npm install @ctrl/ngx-emoji-mart
   npm install animejs
   npm install --save-dev @types/animejs
   ```

---

## Fase B - Firebase y Google Cloud (paso a paso)

### B1) Crear proyecto Firebase

1. Ir a Firebase Console.
2. Crear proyecto (ej: `digitalwallet-eb287`).
3. Vincular con proyecto de Google Cloud automatico.

### B2) Registrar app Android en Firebase

1. Package name: `com.mydigitalwallet.app`
2. Obtener SHA-1/SHA-256 debug (Windows):
   ```bash
   keytool -list -v -alias androiddebugkey -keystore "%USERPROFILE%\.android\debug.keystore" -storepass android -keypass android
   ```
3. Registrar SHA en Firebase.
4. Descargar `google-services.json`.
5. Copiar en:
   - `android\app\google-services.json` (obligatorio)
   - `android\google-services.json` (en este repo tambien existe copia)

### B3) Configurar Authentication

Habilitar proveedores:

1. **Email/Password**
2. **Google**
   - Configurar OAuth consent screen en Google Cloud
   - Definir email de soporte y (si aplica) usuarios de prueba

### B4) Configurar OAuth en Google Cloud

En Google Cloud Console:

1. Ir a APIs & Services -> Credentials
2. Crear OAuth Client IDs:
   - Android (package + SHA)
   - Web (para flujo web/redirect)
3. Copiar **Web Client ID** a:
   - `environment.ts -> googleWebClientId`
   - `environment.prod.ts -> googleWebClientId`

### B5) Configurar Firestore

1. Crear Firestore en modo Native.
2. Colecciones esperadas por codigo:
   - `users/{uid}`
   - `users/{uid}/cards/{cardId}`
   - `users/{uid}/transactions/{txId}`
3. Crear indice compuesto para consulta de transacciones por tarjeta:
   - Collection: `transactions` (subcoleccion)
   - Campos:
     - `cardId` Asc
     - `date` Desc

### B6) Reglas Firestore (base recomendada para este codigo)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /cards/{cardId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }

      match /transactions/{txId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

### B7) Cloud Messaging (FCM)

1. Verificar FCM habilitado en Firebase.
2. Android ya tiene permisos + metadatos en `AndroidManifest.xml`.
3. `NotificationService` pide permisos, registra dispositivo y guarda `fcmToken` en Firestore.

### B8) Service Account para backend de notificaciones

1. En Firebase -> Project settings -> Service accounts.
2. Generar clave privada JSON (Admin SDK).
3. **Nunca commitear** esta clave.
4. Usarla solo en backend seguro (Railway/servidor) para enviar push.

---

## Fase C - Configuracion de la app Angular/Ionic

### C1) Environment

Configurar en `src\environments\environment.ts` y `environment.prod.ts`:

- `firebaseConfig` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
- `googleWebClientId`
- `googleRedirectUrl` (ej. `http://localhost:8100/login`)
- `notificationServiceEmail` y `notificationServicePassword` (credenciales del backend de notificaciones)

### C2) AppModule

`app.module.ts` conecta:

- `provideFirebaseApp(() => initializeApp(...))`
- `provideAuth(() => getAuth())`
- `provideFirestore(() => getFirestore())`
- locale `es-CO`
- `provideHttpClient()`

### C3) Rutas y guards

`app-routing.module.ts`:

- `/login`, `/register` con `AutoLoginGuard`
- `/home`, `/add-card`, `/payment`, `/transfer` con `AuthGuard`

---

## Fase D - Arquitectura funcional que hay que recrear

## Modelos

- `UserProfile`
- `Card`
- `Transaction`

## Servicios core

1. `AuthService`
   - login email/password
   - register
   - login Google (Capacitor plugin + Firebase credential)
   - login biometrico
   - reautenticacion para habilitar biometria
2. `FirestoreService`
   - CRUD generico con API modular de AngularFire
3. `UserService`
   - crear/leer/actualizar perfil
   - guardar `fcmToken`
4. `CardService`
   - Luhn check
   - detectar franquicia (visa/mastercard)
   - formateo numero/fecha/cvv
   - CRUD tarjetas y validaciones
5. `PaymentService`
   - validar pago
   - procesar pago con biometria opcional
   - guardar transacciones
   - consultar transacciones (por tarjeta, fecha, global)
6. `NotificationService`
   - registrar push en dispositivo
   - guardar token FCM en Firestore
   - enviar push via backend HTTP
7. `HttpService`
   - login en backend notificaciones (`/user/login`)
   - envio push (`/notifications/`)
8. `BiometricService`
   - disponibilidad biometrica
   - validacion para pagos
9. `TransactionStatsService`
   - resumen del mes, rangos, promedio, categorias
10. Servicios UI: `ToastService`, `LoadingService`, `DialogService`, `ModalService`

## Componentes compartidos

- `card`, `transaction-list`, `transaction-item` (long press 2s para emoji)
- `quick-actions`
- `custom-input`
- `payment-simulator` (faker merchant + amount)
- `calendar` (filtro de movimientos por fecha)
- `payment-confirmation`
- `skeleton-loading`, `balance-display`

## Paginas

1. `login`
   - email/password
   - Google sign-in
   - login biometrico rapido
2. `register`
   - formulario completo de perfil + password confirm
3. `home`
   - tarjetas
   - movimientos recientes y todos
   - emoji picker para transaccion
   - modales: perfil, notificaciones, editar tarjeta
   - toggle biometria en perfil
4. `add-card`
   - validaciones + Luhn + franquicia
   - preview + animacion flip (animejs)
5. `payment`
   - seleccionar tarjeta
   - simulador de pago
   - biometria
   - haptics
   - push notification post-pago
6. `transfer`
   - transferencia simple, registrada como transaccion

---

## Fase E - Android/Capacitor especifico

1. `capacitor.config.ts`:
   - `appId: com.mydigitalwallet.app`
   - plugins SplashScreen y PushNotifications
2. `android\build.gradle`:
   - classpath `com.google.gms:google-services`
3. `android\app\build.gradle`:
   - aplica plugin `com.google.gms.google-services` si existe `google-services.json`
4. `AndroidManifest.xml`:
   - `android:name=".MyApplication"`
   - permisos internet + notifications + vibrate + wake_lock + boot_completed
   - metadata default channel/icon/color para FCM
5. `MyApplication.java`:
   - inicializacion base de app

---

## Fase F - Backend externo de notificaciones (necesario para flujo actual)

En esta app, el envio de push **no se hace directo desde el cliente**. Se llama un backend:

- Base URL: `https://sendnotificationfirebase-production.up.railway.app`
- Endpoints esperados:
  - `POST /user/login` -> devuelve JWT
  - `POST /notifications/` -> envia push con `Authorization: Bearer <jwt>`

Payload esperado:

```json
{
  "token": "FCM_TOKEN",
  "notification": { "title": "Pago Exitoso", "body": "..." },
  "android": { "priority": "high", "data": {} }
}
```

Si otra IA rehace el proyecto completo, debe:

1. Rehacer/deployar este backend
2. Conectarlo con Firebase Admin SDK (service account seguro)
3. Poner credenciales de backend en `environment.ts`

---

## Fase G - Orden recomendado de implementacion (para otra IA)

1. Scaffolding Ionic + Angular + Capacitor
2. Instalar dependencias
3. Configurar `environment*`
4. Configurar Firebase en `AppModule`
5. Crear modelos
6. Crear `FirestoreService`, `AuthService`, `UserService`
7. Crear guards
8. Crear `CardService`, `PaymentService`, `NotificationService`, `HttpService`, `BiometricService`
9. Crear `SharedModule` + componentes base
10. Implementar paginas en orden:
    - login -> register -> home -> add-card -> payment -> transfer
11. Configurar Android (`google-services`, manifest, gradle)
12. Ejecutar sync/corrida

---

## Fase H - Comandos de ejecucion

```bash
npm install
npm run start
```

Para Android:

```bash
npm run build
npx cap sync android
npx cap open android
```

---

## Fase I - Checklist final de reconstruccion

- [ ] Auth email/password funciona
- [ ] Google login funciona (web + Android segun configuracion)
- [ ] Registro crea `users/{uid}` en Firestore
- [ ] Agregar tarjeta valida Luhn y guarda solo ultimos 4
- [ ] Home lista tarjetas y movimientos
- [ ] Long press en transaccion abre selector emoji y guarda
- [ ] Pago exige biometria si esta activa
- [ ] Pago crea transaccion
- [ ] Haptics ejecuta en pago exitoso
- [ ] Se registra token FCM en perfil usuario
- [ ] Notificacion push llega tras pago (si backend + FCM ok)
- [ ] Transferencia guarda transaccion

---

## 5) Notas importantes de seguridad y mantenimiento

1. En el estado actual hay credenciales sensibles en archivos locales. Para rehacer correctamente:
   - mover secretos a variables seguras por entorno
   - no commitear service account JSON
2. Rotar credenciales si alguna ya fue expuesta.
3. El modulo legacy `src\app\home\` (starter por defecto) existe pero no es el home real usado en rutas (`src\app\pages\home\`).

---

## 6) Resumen ultra corto para otra IA

Recrear una app Ionic Angular con Firebase Auth + Firestore + FCM + biometria, siguiendo la arquitectura modular (`core/services`, `pages`, `shared/components`), configurando Google Sign-In (OAuth web+android), Firestore por subcolecciones de usuario, y un backend seguro que envia push via JWT + Firebase Admin SDK.

