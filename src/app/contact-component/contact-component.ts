
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { ThemeService } from '../services/theme-service';
import { Mail } from '../services/mail';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './contact-component.html',
  styleUrls: ['./contact-component.scss']
})
export class ContactComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private themeService = inject(ThemeService);
  private destroy$ = new Subject<void>();
  public mailservice = inject(Mail);
  contactForm: FormGroup;
  isSubmitting: boolean = false;
  isDarkMode: boolean = false;

  budgetOptions = [
    { value: 'under-5k', label: 'Under $5,000' },
    { value: '5k-10k', label: '$5,000 - $10,000' },
    { value: '10k-25k', label: '$10,000 - $25,000' },
    { value: '25k-50k', label: '$25,000 - $50,000' },
    { value: 'over-50k', label: '$50,000+' },
    { value: 'discuss', label: 'I\'m not sure, let\'s discuss' }
  ];

  serviceTypes = [
    { value: 'web-development', label: 'Web Development' },
    { value: 'web-design', label: 'Web Design' },
    { value: 'full-stack', label: 'Full-Stack Development' },
    { value: 'frontend', label: 'Frontend Development' },
    { value: 'backend', label: 'Backend Development' },
    { value: 'ui-ux', label: 'UI/UX Design' },
    { value: 'ecommerce', label: 'E-commerce Development' },
    { value: 'mobile', label: 'Mobile App Development' },
    { value: 'consulting', label: 'Technical Consulting' },
    { value: 'maintenance', label: 'Website Maintenance' },
    { value: 'other', label: 'Other (please specify)' }
  ];

  constructor() {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      budget: [''],
      serviceType: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1000)]]
    });
  }

  ngOnInit() {
    // Initial theme setup
    this.isDarkMode = this.themeService.getTheme();
    this.themeService.applyTheme();

    // Listen for theme changes (if you add a theme observable to your service)
    // For now, we'll check periodically or you can trigger updates manually
    this.updateTheme();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Method to update theme reactively
  updateTheme() {
    this.isDarkMode = this.themeService.getTheme();
    return this.isDarkMode;
  }

  onSubmit() {
    if (this.contactForm.valid) {
      this.isSubmitting = true;
      
      this.mailservice.sendEmail(this.contactForm.value)
        .then(response => {
          if (response.ok) {
            this.snackBar.open(
              'Thank you for your message! I\'ll get back to you within 24 hours.', 
              'Close',
              {
                duration: 6000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
                panelClass: this.isDarkMode ? ['dark-snackbar'] : ['light-snackbar']
              }
            );
            
            this.resetForm();
          } else {
            throw new Error('Failed to send message');
          }
        })
        .catch(error => {
          this.snackBar.open(
            'Sorry, there was an error sending your message. Please try again.', 
            'Close',
            {
              duration: 6000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['error-snackbar']
            }
          );
        })
        .finally(() => {
          this.isSubmitting = false;
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.contactForm.controls).forEach(key => {
        this.contactForm.get(key)?.markAsTouched();
      });
      
      this.snackBar.open(
        'Please fill in all required fields correctly.', 
        'Close',
        {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        }
      );
    }
  }

  resetForm() {
    this.contactForm.reset();
    Object.keys(this.contactForm.controls).forEach(key => {
      this.contactForm.get(key)?.setErrors(null);
    });
  }
}