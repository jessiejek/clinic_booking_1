import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phDate',
  standalone: true
})
export class PhDatePipe implements PipeTransform {
  transform(value: any, format: string = 'MMM dd, yyyy'): any {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }
}
