import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { IdentityCore } from './core/providers/identity.provider';
import { SignalBridge } from './core/providers/signal.provider';

describe('AppComponent', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      providers: [
        { provide: IdentityCore, useValue: { currentUser$: of(null) } },
        {
          provide: SignalBridge,
          useValue: {
            initPushNotifications: jasmine.createSpy('initPushNotifications'),
            clearPushSession: jasmine.createSpy('clearPushSession')
          }
        }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});
