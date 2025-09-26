import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormControl } from '@angular/forms';
import { ProjectsService, Project, ProjectFilters } from '../services/projects-service';
import { combineLatest, debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { ThemeService } from '../services/theme-service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-work',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './work-component.html',
  styleUrls: ['./work-component.scss']
})
export class WorkComponent implements OnInit, OnDestroy {
  private themeService = inject(ThemeService);
  private snackBar = inject(MatSnackBar);
  
  public isDarkMode: boolean = this.themeService.getTheme();
  public projects: Project[] = [];
  public filteredProjects: Project[] = [];
  public categories: string[] = [];
  public technologies: string[] = [];
  
  // Cache status tracking
  public isUsingCache: boolean = false;
  public cacheAge: number | null = null;
  
  // View options
  public viewMode: 'grid' | 'list' = 'grid';
  public showFilters: boolean = false;

  // Form controls for filters
  public searchControl = new FormControl('');
  public categoryControl = new FormControl('all');
  public statusControl = new FormControl('all');
  public featuredControl = new FormControl(false);
  
  // Filter options
  public statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'completed', label: 'Completed' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'planned', label: 'Planned' }
  ];

  private destroy$ = new Subject<void>();

  constructor(private projectsService: ProjectsService) {}

  // Getters for observables
  get loading$() {
    return this.projectsService.loading$;
  }

  get usingCache$() {
    return this.projectsService.usingCache$;
  }

  public update(): boolean {
    this.isDarkMode = this.themeService.getTheme();
    return this.isDarkMode;
  }

  ngOnInit(): void {
    console.log('WorkComponent initializing...');
    this.loadInitialData();
    this.setupFilterSubscriptions();
    this.monitorCacheStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    console.log('Starting to load projects...');
    
    // Load projects with fallback support
    this.projectsService.getAllProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          console.log('Projects loaded successfully:', projects);
          this.projects = projects;
          this.filteredProjects = projects;
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          // Even on error, we might have fallback data, so don't show error message
          // The service handles fallback internally
        },
        complete: () => {
          console.log('Projects loading completed');
        }
      });

    // Load filter options with fallback support
    this.projectsService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories = categories;
        },
        error: (error) => {
          console.warn('Using fallback categories due to error:', error);
        }
      });

    this.projectsService.getTechnologies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (technologies) => {
          this.technologies = technologies;
        },
        error: (error) => {
          console.warn('Using fallback technologies due to error:', error);
        }
      });
  }

  private setupFilterSubscriptions(): void {
    // Combine all filter controls and apply filtering with debounce
    combineLatest([
      this.searchControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ),
      this.categoryControl.valueChanges,
      this.statusControl.valueChanges,
      this.featuredControl.valueChanges
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  private monitorCacheStatus(): void {
    // Monitor cache usage status
    this.projectsService.usingCache$
      .pipe(takeUntil(this.destroy$))
      .subscribe(usingCache => {
        this.isUsingCache = usingCache;
        this.cacheAge = this.projectsService.getCacheAge();
        
        if (usingCache) {
          this.showCacheNotification();
        }
      });
  }

  private showCacheNotification(): void {
    const message = this.cacheAge 
      ? `Using cached data (${this.getCacheAgeString()}) - Server unavailable`
      : 'Using fallback data - Server unavailable';
      
    this.snackBar.open(message, 'Retry', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['cache-notification']
    }).onAction().subscribe(() => {
      this.forceRefresh();
    });
  }

  private getCacheAgeString(): string {
    if (!this.cacheAge) return '';
    
    if (this.cacheAge < 1) {
      return `${Math.round(this.cacheAge * 60)} min ago`;
    } else if (this.cacheAge < 24) {
      return `${Math.round(this.cacheAge)} hours ago`;
    } else {
      return `${Math.round(this.cacheAge / 24)} days ago`;
    }
  }

  openBlogPost(blogId: string | undefined): void {
    if (blogId) {
      window.open(`/blog/${blogId}`, '_blank');
    }
  }

  private applyFilters(): void {
    let filtered = [...this.projects];
    
    // Search filter
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(project => 
        project.title.toLowerCase().includes(searchTerm) ||
        project.description.toLowerCase().includes(searchTerm) ||
        project.technologies.some(tech => tech.toLowerCase().includes(searchTerm))
      );
    }
    
    // Category filter
    const selectedCategory = this.categoryControl.value;
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(project => project.category === selectedCategory);
    }
    
    // Status filter
    const selectedStatus = this.statusControl.value;
    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter(project => project.status === selectedStatus);
    }
    
    // Featured filter
    if (this.featuredControl.value) {
      filtered = filtered.filter(project => project.featured);
    }
    
    this.filteredProjects = filtered;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.categoryControl.setValue('all');
    this.statusControl.setValue('all');
    this.featuredControl.setValue(false);
  }

  /**
   * Force refresh data from server
   */
  forceRefresh(): void {
    console.log('Force refreshing projects...');
    this.projectsService.forceRefresh()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          this.applyFilters();
          this.snackBar.open('Projects refreshed successfully', 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['success-notification']
          });
        },
        error: (error) => {
          console.error('Failed to refresh projects:', error);
          this.snackBar.open('Failed to refresh - still using cached data', 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-notification']
          });
        }
      });
  }

  /**
   * Clear cache and reload
   */
  clearCache(): void {
    this.projectsService.clearCache();
    this.snackBar.open('Cache cleared', 'Close', {
      duration: 2000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
    this.loadInitialData();
  }

  openGithub(url: string | undefined): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  openLiveDemo(url: string | undefined): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  getStatusChipColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case 'completed': return 'primary';
      case 'in-progress': return 'accent';
      case 'planned': return 'warn';
      default: return 'primary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return 'check_circle';
      case 'in-progress': return 'schedule';
      case 'planned': return 'lightbulb';
      default: return 'help';
    }
  }

  /**
   * Get cache status for display
   */
  getCacheStatusText(): string {
    if (!this.isUsingCache) return 'Live Data';
    if (this.cacheAge) return `Cached (${this.getCacheAgeString()})`;
    return 'Fallback Data';
  }

  /**
   * Get cache status icon
   */
  getCacheStatusIcon(): string {
    if (!this.isUsingCache) return 'cloud_done';
    if (this.cacheAge) return 'cached';
    return 'cloud_off';
  }
}