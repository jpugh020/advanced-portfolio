import { Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
    readonly isDarkMode = signal(window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Optional: method to toggle theme
  public getTheme() {
    return this.isDarkMode;
  }

  applyTheme() {
    if (this.isDarkMode()) {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
    }
  }

  // Optional: method to set specific theme
  setDarkMode = ():void => {
    this.isDarkMode.update(isDarkMode => !isDarkMode);
  }
}
