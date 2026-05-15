import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { timeOutline, copyOutline, cloudUploadOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { BookingService } from '../../../booking/services/booking.service';
import { TimerFormatPipe } from '../../../../shared/pipes/timer-format.pipe';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-proof-submission',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, TimerFormatPipe, FormsModule],
  templateUrl: './proof-submission.page.html',
  styleUrls: ['./proof-submission.page.scss'],
})
export class ProofSubmissionPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookingService = inject(BookingService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  bookingId = '';
  timeRemaining = signal(600); // 10 minutes in seconds
  private timer: any;

  submissionMode = signal<'reference' | 'upload'>('reference');
  referenceNumber = '';
  selectedFile: any = null;

  constructor() {
    addIcons({ timeOutline, copyOutline, cloudUploadOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('bookingId') || '';
    if (!this.bookingId) {
      this.router.navigate(['/book/doctors']);
      return;
    }
    this.startTimer();
  }

  onSegmentChange(ev: any) {
    const val = ev.detail.value as 'reference' | 'upload';
    this.submissionMode.set(val);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  startTimer() {
    this.timer = setInterval(() => {
      if (this.timeRemaining() <= 0) {
        clearInterval(this.timer);
        this.handleTimeout();
        return;
      }
      this.timeRemaining.update(t => t - 1);
    }, 1000);
  }

  handleTimeout() {
    this.showToast('Payment time expired. Your slot has been released.', 'danger');
    this.router.navigate(['/book/doctors']);
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    this.showToast('Copied to clipboard', 'success');
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  async submitProof() {
    if (this.submissionMode() === 'reference' && !this.referenceNumber) {
      this.showToast('Please enter the reference number', 'warning');
      return;
    }
    if (this.submissionMode() === 'upload' && !this.selectedFile) {
      this.showToast('Please upload a screenshot', 'warning');
      return;
    }

    const loader = await this.loadingCtrl.create({ message: 'Submitting proof...' });
    await loader.present();

    this.bookingService.submitProof(this.bookingId, {
      referenceNumber: this.referenceNumber,
      receiptImage: this.selectedFile
    }).subscribe({
      next: () => {
        loader.dismiss();
        this.router.navigate(['/book/confirmation']);
      },
      error: () => {
        loader.dismiss();
        this.showToast('Submission failed. Please try again.', 'danger');
      }
    });
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color });
    await toast.present();
  }
}
