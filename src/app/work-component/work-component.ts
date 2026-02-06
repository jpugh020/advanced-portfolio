import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
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
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { combineLatest, debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

// Services
import { ProjectsService, Project } from '../services/projects-service';
import { ThemeService } from '../services/theme-service';

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

  // Form controls
  public searchControl = new FormControl('');
  public categoryControl = new FormControl('all');
  public statusControl = new FormControl('all');
  public featuredControl = new FormControl(false);

  public statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'completed', label: 'Completed' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'planned', label: 'Planned' }
  ];

  private destroy$ = new Subject<void>();

  constructor(private projectsService: ProjectsService) {}

  // Getters for template usage
  get loading$() { return this.projectsService.loading$; }
  get usingCache$() { return this.projectsService.usingCache$; }

  ngOnInit(): void {
    console.log('WorkComponent initializing...');
    this.isDarkMode = this.themeService.getTheme(); // Ensure theme is set
    this.loadInitialData();
    this.setupFilterSubscriptions();
    this.monitorCacheStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Helper for ngFor in template to maintain performance and focus
  trackByProject(index: number, project: Project): string | number {
    return project.id || project._id || index;
  }

  private loadInitialData(): void {
    console.log('Starting to load projects...');

    // 1. Load Projects
    this.projectsService.getAllProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rawProjects) => {
          // DATA SANITIZATION:
          // Supabase returns dates as strings. We map them to real Date objects here
          // so the rest of the app doesn't crash on date methods.
          this.projects = rawProjects.map(p => ({
            ...p,
            startdate: new Date(p.startdate),
            enddate: p.enddate ? new Date(p.enddate) : undefined,
            // Ensure technologies is always an array to prevent split() errors
            technologies: Array.isArray(p.technologies) ? p.technologies : []
          }));

          console.log('Projects processed:', this.projects.length);
          this.applyFilters(); // Run filters immediately to populate the view
        },
        error: (error) => {
          console.error('Error in component loading projects:', error);
          // Service handles fallback emission, so we don't need to manually set fallback here
        }
      });

    // 2. Load Categories
    this.projectsService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => this.categories = categories,
        error: (err) => console.warn('Category load failed', err)
      });

    // 3. Load Technologies
    this.projectsService.getTechnologies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (techs) => this.technologies = techs,
        error: (err) => console.warn('Tech load failed', err)
      });
  }

  private setupFilterSubscriptions(): void {
    combineLatest([
      this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
      this.categoryControl.valueChanges,
      this.statusControl.valueChanges,
      this.featuredControl.valueChanges
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  private applyFilters(): void {
    let filtered = [...this.projects];

    // Search
    const searchTerm = (this.searchControl.value || '').toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchTerm) ||
        project.description.toLowerCase().includes(searchTerm) ||
        project.technologies.some(tech => tech.toLowerCase().includes(searchTerm))
      );
    }

    // Category
    const cat = this.categoryControl.value;
    if (cat && cat !== 'all') {
      filtered = filtered.filter(p => p.category === cat);
    }

    // Status
    const status = this.statusControl.value;
    if (status && status !== 'all') {
      filtered = filtered.filter(p => p.status === status);
    }

    // Featured
    if (this.featuredControl.value) {
      filtered = filtered.filter(p => p.featured);
    }

    this.filteredProjects = filtered;
  }


  private getCacheAgeString(): string {
    if (!this.cacheAge) return '';
    if (this.cacheAge < 1) return `${Math.round(this.cacheAge * 60)} min ago`;
    if (this.cacheAge < 24) return `${Math.round(this.cacheAge)} hours ago`;
    return `${Math.round(this.cacheAge / 24)} days ago`;
  }

  private monitorCacheStatus(): void {
    this.projectsService.usingCache$
      .pipe(takeUntil(this.destroy$))
      .subscribe(usingCache => {
        this.isUsingCache = usingCache;
        this.cacheAge = parseInt(this.getCacheAgeString());

        if (usingCache) {
          this.showCacheNotification();
        }
      });
  }

  private showCacheNotification(): void {
    // Only show if we actually have data, otherwise the empty state handles it
    if (this.projects.length === 0) return;

    const message = this.cacheAge
      ? `Offline Mode: Cached data from ${this.getCacheAgeString()}`
      : 'Offline Mode: Using fallback data';

    this.snackBar.open(message, 'Retry', {
      duration: 8000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: ['cache-notification']
    }).onAction().subscribe(() => {
      this.forceRefresh();
    });
  }


  public forceRefresh(): void {
    this.projectsService.forceRefresh()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          // Re-apply the same data sanitization as loadInitialData
          this.projects = projects.map(p => ({
            ...p,
            startdate: new Date(p.startdate),
            enddate: p.enddate ? new Date(p.enddate) : undefined,
            technologies: Array.isArray(p.technologies) ? p.technologies : []
          }));

          this.applyFilters();

          this.snackBar.open('Projects refreshed successfully', 'Dismiss', {
            duration: 3000,
            panelClass: ['success-notification']
          });
        },
        error: () => {
          this.snackBar.open('Refresh failed - Check connection', 'Dismiss', {
            duration: 3000,
            panelClass: ['error-notification']
          });
        }
      });
  }

  public clearCache(): void {
    this.projectsService.clearCache();
    this.snackBar.open('Cache cleared', undefined, { duration: 1500 });
    this.loadInitialData();
  }

  // --- UI Helpers ---

  public toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  public toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  public clearFilters(): void {
    this.searchControl.setValue('');
    this.categoryControl.setValue('all');
    this.statusControl.setValue('all');
    this.featuredControl.setValue(false);
  }

  public getStatusChipColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case 'completed': return 'primary';
      case 'in-progress': return 'accent';
      case 'planned': return 'warn';
      default: return 'primary';
    }
  }

  public getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return 'check_circle';
      case 'in-progress': return 'schedule';
      case 'planned': return 'lightbulb';
      default: return 'help';
    }
  }

  public openLink(url: string | undefined): void {
    if (url) window.open(url, '_blank');
  }

  // Specific alias methods if your template calls them specifically
  public openGithub = this.openLink;
  public openLiveDemo = this.openLink;
  public openBlogPost(blogId: string | undefined): void {
    if (blogId) window.open(`/blog/${blogId}`, '_blank');
  }
}
