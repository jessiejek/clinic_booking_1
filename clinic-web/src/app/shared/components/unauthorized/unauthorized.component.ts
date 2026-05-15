import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  template: `
    <ion-content class="ion-padding ion-text-center">
      <div style="margin-top: 100px;">
        <ion-icon name="lock-closed-outline" color="danger" style="font-size: 64px;"></ion-icon>
        <h1 class="font-display">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
        <ion-button routerLink="/auth/login" fill="clear">Return to Login</ion-button>
      </div>
    </ion-content>
  `,
})
export class UnauthorizedComponent {}
