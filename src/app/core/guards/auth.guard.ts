import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { User } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { IdentityCore } from '../providers/identity.provider';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private IdentityCore: IdentityCore,
    private router: Router
  ) {}

  /**
   * Si no hay usuario en Firebase Auth → redirigir a /login
   */
  canActivate(): Observable<boolean | UrlTree> {
    return this.IdentityCore.currentUser$.pipe(
      take(1),
      map((user: User | null) => {
        if (user) {
          return true;
        }
        return this.router.createUrlTree(['/login']);
      })
    );
  }
}
