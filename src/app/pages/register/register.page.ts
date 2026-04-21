import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IdentityCore } from '../../core/providers/identity.provider';
import { LoadingBridge } from '../../core/providers/loading.service';
import { UIMessenger } from '../../core/providers/alert.provider';
import { ProfileManager } from '../../core/providers/profile.provider';
import { UserProfile } from '../../models/user.model';

@Component({
  standalone: false,
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  readonly documentTypes: Array<UserProfile['tipoDocumento']> = ['CC', 'TI', 'CE', 'PASSPORT'];
  readonly countries: string[] = [
    'Colombia', 'México', 'Argentina', 'Chile', 'Perú', 'Ecuador',
    'Venezuela', 'Uruguay', 'Paraguay', 'Bolivia', 'Panamá',
    'Costa Rica', 'República Dominicana', 'Estados Unidos', 'España'
  ];

  readonly registerForm = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(80)]],
      apellido: ['', [Validators.required, Validators.maxLength(80)]],
      tipoDocumento: ['', Validators.required],
      numeroDocumento: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(20)]],
      pais: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: [RegisterPage.passwordMatchValidator] }
  );

  submitting = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private IdentityCore: IdentityCore,
    private ProfileManager: ProfileManager,
    private LoadingBridge: LoadingBridge,
    private UIMessenger: UIMessenger
  ) {}

  ngOnInit(): void {}

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid || this.submitting) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    await this.LoadingBridge.show('Creando cuenta...');
    try {
      const value = this.registerForm.getRawValue();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 15000)
      );

      const firebaseUser = await Promise.race([
        this.IdentityCore.register(value.email, value.password),
        timeoutPromise
      ]) as any;

      const userProfile: Omit<UserProfile, 'createdAt'> = {
        uid: firebaseUser.uid,
        nombre: value.nombre,
        apellido: value.apellido,
        tipoDocumento: value.tipoDocumento as UserProfile['tipoDocumento'],
        numeroDocumento: value.numeroDocumento,
        pais: value.pais,
        email: value.email,
        biometricEnabled: false
      };

      await Promise.race([
        this.ProfileManager.createUserProfile(userProfile),
        timeoutPromise
      ]);
      
      await this.router.navigate(['/home']);
    } catch (error: any) {
      if (error.message === 'TIMEOUT') {
        await this.UIMessenger.showError('El registro tardó demasiado. Por favor, desactiva tu Ad-Blocker (McAfee/Blur) e inténtalo de nuevo.');
      } else {
        await this.UIMessenger.showError(this.getErrorMessage(error));
      }
    } finally {
      this.submitting = false;
      await this.LoadingBridge.hide();
    }
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  controlHasError(
    controlName: 'nombre' | 'apellido' | 'tipoDocumento' | 'numeroDocumento' | 'pais' | 'email' | 'password' | 'confirmPassword',
    errorName: string
  ): boolean {
    const control = this.registerForm.controls[controlName];
    return control.touched && control.hasError(errorName);
  }

  hasPasswordMismatch(): boolean {
    return this.registerForm.touched && this.registerForm.hasError('passwordMismatch');
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'No fue posible completar el registro.';
  }

  private static passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (!password || !confirmPassword) {
      return null;
    }
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

}
