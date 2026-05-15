import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'peso',
  standalone: true
})
export class PesoPipe implements PipeTransform {
  transform(value: number | string): string {
    if (value === null || value === undefined) return '₱0.00';
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  }
}
