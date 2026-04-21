import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  private readonly NOTIFICATION_BASE =
    'https://sendnotificationfirebase-production.up.railway.app';

  constructor(private http: HttpClient) {}

  /**
   * POST /user/login → retorna JWT del servicio de notificaciones
   */
  async loginSignalBridge(email: string, password: string): Promise<string> {
    console.log('[HttpService] 🔐 Intentando login en servicio de notificaciones...');
    console.log('[HttpService] URL:', `${this.NOTIFICATION_BASE}/user/login`);
    console.log('[HttpService] Email:', email);

    const body = { email, password };

    try {
      const response = await firstValueFrom(
        this.http.post<any>(`${this.NOTIFICATION_BASE}/user/login`, body)
      );

      console.log('[HttpService] ✅ Respuesta login recibida:', JSON.stringify(response));

      // Buscar el token en las propiedades más comunes de respuesta
      const token = response?.token || response?.access_token || response?.jwt || response?.accessToken;

      if (!token) {
        console.error('[HttpService] ❌ No se encontró token en la respuesta:', JSON.stringify(response));
        throw new Error('La respuesta del servidor no contiene un token válido');
      }

      console.log('[HttpService] ✅ JWT obtenido correctamente:', token.substring(0, 30) + '...');
      return token;
    } catch (error: any) {
      console.error('[HttpService] ❌ Error en login de notificaciones:', error);
      if (error?.status) {
        console.error('[HttpService] HTTP Status:', error.status);
        console.error('[HttpService] HTTP Error Body:', JSON.stringify(error.error));
      }
      throw error;
    }
  }

  /**
   * POST /notifications/ con Authorization header
   * Envía la notificación push a través del backend de Railway
   */
  async sendPushNotification(
    jwtToken: string,
    fcmToken: string,
    title: string,
    body: string
  ): Promise<void> {
    console.log('[HttpService] 📤 Enviando notificación push...');
    console.log('[HttpService] FCM Token:', fcmToken.substring(0, 20) + '...');
    console.log('[HttpService] Title:', title);
    console.log('[HttpService] Body:', body);

    // El header Authorization debe llevar el prefijo 'Bearer '
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    });

    const payload = {
      token: fcmToken,
      notification: { title, body },
      android: { priority: 'high', data: {} }
    };

    console.log('[HttpService] Payload:', JSON.stringify(payload));

    try {
      const response = await firstValueFrom(
        this.http.post(`${this.NOTIFICATION_BASE}/notifications/`, payload, { headers })
      );
      console.log('[HttpService] ✅ Notificación enviada exitosamente. Respuesta:', JSON.stringify(response));
    } catch (error: any) {
      console.error('[HttpService] ❌ Error al enviar notificación:', error);
      if (error?.status) {
        console.error('[HttpService] HTTP Status:', error.status);
        console.error('[HttpService] HTTP Error Body:', JSON.stringify(error.error));
      }
      throw error;
    }
  }
}
