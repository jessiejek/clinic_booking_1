import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timerFormat',
  standalone: true
})
export class TimerFormatPipe implements PipeTransform {
  transform(seconds: number): string {
    const minutes: number = Math.floor(seconds / 60);
    const remainingSeconds: number = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
