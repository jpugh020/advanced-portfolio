import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ThemeService } from '../services/theme-service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { BlogService, BlogPost } from '../services/blog.service';

@Component({
  selector: 'app-blog-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './blog-component.html',
  styleUrl: './blog-component.scss'
})
export class BlogComponent implements OnInit, OnDestroy {
  // Signals for reactive state management
  public themeService = inject(ThemeService);

  posts = signal<BlogPost[]>([]);
  totalCount = signal<number>(0);
  currentPage = signal<number>(1);
  totalPages = signal<number>(0);
  isLoading = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedTag = signal<string>('');
  availableTags = signal<string[]>([]);
  isUsingCache = signal<boolean>(false);
  cacheAge = signal<number | null>(null);

  // Computed properties
  hasResults = computed(() => this.posts().length > 0);
  showPagination = computed(() => this.totalPages() > 1);
  
  // Configuration
  readonly pageSize = 5;
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  private snackBar = inject(MatSnackBar);

  constructor(
    private blogService: BlogService,
    private router: Router
  ) {
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.currentPage.set(1);
      this.loadBlogPosts();
    });
  }

  ngOnInit(): void {
    this.loadBlogPosts();
    this.loadTags();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load blog posts based on current filters and pagination
   */
  loadBlogPosts(): void {
    this.isLoading.set(true);
    
    const currentPage = this.currentPage();
    const searchQuery = this.searchQuery();
    const selectedTag = this.selectedTag();

    let request;
    
    if (searchQuery) {
      request = this.blogService.searchPosts(searchQuery);
    } else if (selectedTag) {
      request = this.blogService.getPostsByTag(selectedTag);
    } else {
      request = this.blogService.getPosts();
    }

    request.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (posts: BlogPost[]) => {
        // Calculate pagination details
        const startIndex = (currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const totalPosts = posts.length;
        
        // Update signals
        this.totalCount.set(totalPosts);
        this.totalPages.set(Math.ceil(totalPosts / this.pageSize));
        this.posts.set(posts.slice(startIndex, endIndex));
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading blog posts:', error);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Load available tags for filtering
   */
  loadTags(): void {
    this.blogService.getTags().pipe(
      takeUntil(this.destroy$)
    ).subscribe(tags => {
      this.availableTags.set(tags);
    });
  }

  /**
   * Handle page change from paginator
   */
  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex + 1);
    this.loadBlogPosts();
    
    // Scroll to top of blog list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Handle search input
   */
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }

  /**
   * Clear search query
   */
  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadBlogPosts();
  }

  /**
   * Filter by tag
   */
  filterByTag(tag: string): void {
    if (this.selectedTag() === tag) {
      // If same tag is clicked, clear the filter
      this.selectedTag.set('');
    } else {
      this.selectedTag.set(tag);
    }
    this.currentPage.set(1);
    this.loadBlogPosts();
  }

  /**
   * Clear tag filter
   */
  clearTagFilter(): void {
    this.selectedTag.set('');
    this.currentPage.set(1);
    this.loadBlogPosts();
  }

  /**
   * Navigate to blog post detail
   */
  navigateToPost(post: BlogPost): void {
    this.router.navigate(['/blog', post.slug]);
  }

  /**
   * Format date for display
   */
  formatDate(date: string): string {
    const dateObj = new Date(date);

    return dateObj.toDateString();
  }

  /**
   * Get reading time text
   */
  getReadingTime(minutes: number): string {
    return `${minutes} min read`;
  }

  /**
   * Track function for ngFor optimization
   */
  trackBySlug(index: number, post: BlogPost): string {
    return post.slug;
  }

  private getCacheAgeString(): string {
    const age = this.cacheAge();
    if (!age) return '';
    
    if (age < 1) {
      return `${Math.round(age * 60)} min ago`;
    } else if (age < 24) {
      return `${Math.round(age)} hours ago`;
    } else {
      return `${Math.round(age / 24)} days ago`;
    }
  }

  getCacheStatusText(): string {
    if (!this.isUsingCache()) return 'Live Data';
    if (this.cacheAge()) return `Cached (${this.getCacheAgeString()})`;
    return 'Fallback Data';
  }

  getCacheStatusIcon(): string {
    if (!this.isUsingCache()) return 'cloud_done';
    if (this.cacheAge()) return 'cached';
    return 'cloud_off';
  }

  forceRefresh(): void {
    this.blogService.forceRefresh()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (posts) => {
          const startIndex = (this.currentPage() - 1) * this.pageSize;
          const endIndex = startIndex + this.pageSize;
          const totalPosts = posts.length;
          
          this.totalCount.set(totalPosts);
          this.totalPages.set(Math.ceil(totalPosts / this.pageSize));
          this.posts.set(posts.slice(startIndex, endIndex));

          this.snackBar.open('Posts refreshed successfully', 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['success-notification']
          });
        },
        error: (error) => {
          console.error('Failed to refresh posts:', error);
          this.snackBar.open('Failed to refresh - still using cached data', 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-notification']
          });
        }
      });
  }
}