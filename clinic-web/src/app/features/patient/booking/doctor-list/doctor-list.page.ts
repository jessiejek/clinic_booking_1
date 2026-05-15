import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, filterOutline, star } from 'ionicons/icons';
import { Doctor } from '../../../admin/models/doctor.model';
import { MOCK_DOCTORS } from '../../../admin/mocks/doctor.mocks';
import { BookingFlowService } from '../../../booking/services/booking-flow.service';

@Component({
  selector: 'app-doctor-list',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './doctor-list.page.html',
  styleUrls: ['./doctor-list.page.scss'],
})
export class DoctorListPage implements OnInit {
  private router = inject(Router);
  private bookingFlow = inject(BookingFlowService);

  doctors = signal<Doctor[]>(MOCK_DOCTORS);
  filteredDoctors = signal<Doctor[]>(MOCK_DOCTORS);
  specializations = signal<string[]>([]);
  selectedSpec = signal<string>('All');
  isLoading = signal(true);

  constructor() {
    addIcons({ chevronForwardOutline, filterOutline, star });
  }

  ngOnInit() {
    this.extractSpecializations();
    this.bookingFlow.resetFlow();
    
    // Simulate loading
    setTimeout(() => {
      this.isLoading.set(false);
    }, 600);
  }

  extractSpecializations() {
    const specs = ['All', ...new Set(MOCK_DOCTORS.map(d => d.specialization))];
    this.specializations.set(specs);
  }

  filterBySpec(spec: string) {
    this.selectedSpec.set(spec);
    if (spec === 'All') {
      this.filteredDoctors.set(this.doctors());
    } else {
      this.filteredDoctors.set(this.doctors().filter(d => d.specialization === spec));
    }
  }

  selectDoctor(doctor: Doctor) {
    this.bookingFlow.selectedDoctor.set(doctor);
    this.router.navigate(['/book/doctors', doctor.id]);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }
}
