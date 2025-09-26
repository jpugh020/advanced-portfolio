import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Angular Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';

import { BlogService, BlogPost } from '../services/blog.service';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatCardModule
  ],
  templateUrl: './blog-detail-component.html',
  styleUrl: './blog-detail-component.scss'
})
export class BlogDetailComponent implements OnInit, OnDestroy {
  // Signals for reactive state management
  post = signal<BlogPost | null>(null);
  relatedPosts = signal<BlogPost[]>([]);
  isLoading = signal<boolean>(true);
  
  // Computed properties
  sanitizedContent = computed(() => {
    const currentPost = this.post();
    if (!currentPost?.content) return '';
    return this.sanitizer.bypassSecurityTrustHtml(currentPost.content);
  });

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private blogService: BlogService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(
      switchMap(params => {
        this.isLoading.set(true);
        return this.blogService.getPostBySlug(params['slug']);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (post) => {
        this.post.set(post);
        this.isLoading.set(false);
        
        if (post) {
          this.loadRelatedPosts(post); // Load related posts
          // Scroll to top
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
      error: (error) => {
        console.error('Error loading blog post:', error);
        this.isLoading.set(false);
        this.router.navigate(['/blog']); // Redirect to blog list on error
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load related posts based on tags
   */
  loadRelatedPosts(currentPost: BlogPost): void {
    if (currentPost.tags.length > 0) {
      this.blogService.getPostsByTag(currentPost.tags[0]).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (posts) => {
          const related = posts
            .filter(post => post.slug !== currentPost.slug)
            .slice(0, 3); // Limit to 3 related posts
          this.relatedPosts.set(related);
        },
        error: (error) => {
          console.error('Error loading related posts:', error);
          this.relatedPosts.set([]);
        }
      });
    }
  }

  /**
   * Navigate to another blog post
   */
  navigateToPost(post: BlogPost): void {
    this.router.navigate(['/blog', post.slug]);
  }

  /**
   * Navigate to blog list with tag filter
   */
  navigateToTagFilter(tag: string): void {
    this.router.navigate(['/blog'], { 
      queryParams: { tag } 
    });
  }

  /**
   * Share on Twitter
   */
  shareOnTwitter(): void {
    const currentPost = this.post();
    if (!currentPost) return;
    
    const text = encodeURIComponent(`Check out this article: ${currentPost.title}`);
    const url = encodeURIComponent(window.location.href);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    
    window.open(twitterUrl, '_blank');
  }

  /**
   * Copy current page link
   */
  copyLink(): void {
    navigator.clipboard.writeText(window.location.href).then(() => {
      // You could show a toast notification here
      console.log('Link copied to clipboard');
    });
  }

  /**
   * Format date for display
   */
  formatDate(date: string): string {
    const formatted = new Date(date);

    return formatted.toDateString();
  }

  /**
   * Get reading time text
   */
  getReadingTime(minutes: number): string {
    return `${minutes} min read`;
  }
}