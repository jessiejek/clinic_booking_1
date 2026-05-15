import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthStore } from './core/stores/auth.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
})
export class AppComponent implements OnInit {
  private authStore = inject(AuthStore);

  ngOnInit() {
    this.authStore.loadUserFromStorage();
    // TODO: Phase 7 - Start notification polling
  }
}
