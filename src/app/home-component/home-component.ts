import { Component, inject } from '@angular/core';
import { NgClass } from "@angular/common";
import { ThemeService } from '../services/theme-service';
import {MatButton} from '@angular/material/button';
import { RouterLink } from '@angular/router';



@Component({
  selector: 'app-home-component',
  imports: [NgClass, MatButton, RouterLink],
  templateUrl: './home-component.html',
  styleUrl: './home-component.scss'
})
export class HomeComponent {
  private themeService = inject(ThemeService);
public isDarkMode: boolean = this.themeService.getTheme();
public update(): boolean {
  this.isDarkMode = this.themeService.getTheme();
  return this.isDarkMode;
}




}



