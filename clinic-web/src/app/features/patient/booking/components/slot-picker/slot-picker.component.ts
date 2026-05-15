import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TimeSlot } from '../../../../booking/models/booking.model';

@Component({
  selector: 'app-slot-picker',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './slot-picker.component.html',
  styleUrls: ['./slot-picker.component.scss']
})
export class SlotPickerComponent {
  @Input() slots: TimeSlot[] = [];
  @Input() selectedSlot: TimeSlot | null = null;
  @Output() slotSelected = new EventEmitter<TimeSlot>();

  onSlotClick(slot: TimeSlot) {
    if (slot.status === 'Available') {
      this.slotSelected.emit(slot);
    }
  }

  getSlotClass(slot: TimeSlot): string {
    const isSelected = this.selectedSlot?.startTime === slot.startTime;
    if (isSelected) return 'slot-btn selected';
    
    switch (slot.status) {
      case 'Available': return 'slot-btn available';
      case 'Pending':   return 'slot-btn pending';
      case 'Full':      return 'slot-btn full';
      default:          return 'slot-btn full';
    }
  }
}
