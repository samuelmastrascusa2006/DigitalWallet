import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { User } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { IdentityCore } from '../providers/identity.provider';

@Injectable({
  providedIn: 'root'
})
export class AutoLoginGuard implements CanActivate {

  constructor(
    private IdentityCore: IdentityCore,
    private router: Router
  ) {}

  /**
   * Si hay usuario activo → redirigir a /home (aplica a /login y /register)
   */
  canActivate(): Observable<boolean | UrlTree> {
    return this.IdentityCore.currentUser$.pipe(
      take(1),
      map((user: User | null) => {
        if (user) {
          return this.router.createUrlTree(['/home']);
        }
        return true;
      })
    );
  }
}
