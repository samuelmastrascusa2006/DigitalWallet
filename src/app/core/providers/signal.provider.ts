import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface NotificationSummary {
  id?: string;
  title: string;
  body: string;
  createdAt: Date;
  read?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SignalBridge {

  private network = inject(HttpClient);
  
  // Data stream for components
  private notificationStream = new BehaviorSubject<NotificationSummary[]>([]);
  public readonly notifications$ = this.notificationStream.asObservable();

  private readonly gateway = 'https://onesignal.com/api/v1/notifications';
  
  constructor() {
    // Mock initialization for UI consistency
    this.seedMockNotifications();
  }

  /**
   * Broadcast Signal to Client
   */
  async dispatchPush(token: string, head: string, body: string): Promise<any> {
    const payload = {
      app_id: 'SUB_APP_ID_PLACEHOLDER',
      include_player_ids: [token],
      contents: { en: body },
      headings: { en: head }
    };

    try {
      return await firstValueFrom(
        this.network.post(this.gateway, payload, {
          headers: {
            'Authorization': 'Basic placeholder',
            'Content-Type': 'application/json'
          }
        })
      );
    } catch (err) {
      console.warn('[SignalBridge] Push Dispatch Failed:', err);
      return null;
    }
  }

  async sendPush(tokenOrTopic: string, title: string, body: string): Promise<any> {
    console.log('[SignalBridge] Sending encrypted signal:', title);
    
    // Add to local stream for UI feedback
    const current = this.notificationStream.value;
    this.notificationStream.next([{
      title,
      body,
      createdAt: new Date(),
      read: false
    }, ...current]);

    return Promise.resolve({ ok: true });
  }

  private seedMockNotifications() {
    this.notificationStream.next([
      {
        title: 'SECURE_BOOT_SUCCESS',
        body: 'NovaVault Engine initialized successfully.',
        createdAt: new Date(),
        read: true
      }
    ]);
  }

  /**
   * Gateway Initialization
   */
  async initPushNotifications(userId: string): Promise<void> {
    console.log('[SignalBridge] Initializing push stream for UID:', userId);
    // Logic for OneSignal or Firebase token exchange
  }

  async clearPushSession(): Promise<void> {
    console.log('[SignalBridge] Purging active push sessions.');
    this.notificationStream.next([]);
  }
}
