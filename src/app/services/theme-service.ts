import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
    isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Optional: method to toggle theme
  getTheme() {
    return this.isDarkMode;
  }

  applyTheme() {
    if (this.isDarkMode) {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
    }
  }
  
  // Optional: method to set specific theme
  setDarkMode = ():void => {
    this.isDarkMode = !this.isDarkMode;
  }
}
