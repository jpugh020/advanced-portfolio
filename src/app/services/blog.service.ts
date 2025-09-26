import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { fallbackBlogPosts } from './fallback-blog-data';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  publisheddate: Date;
  tags: string[];
  readtime: number;
  imageurl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private apiUrl = 'https://portflio.work/blog';
  private readonly CACHE_KEY = 'blog_posts_cache';
  private readonly CACHE_TIMESTAMP_KEY = 'blog_posts_cache_timestamp';
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  private loadingSubject = new BehaviorSubject<boolean>(false);
  private usingCacheSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  public usingCache$ = this.usingCacheSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCachedPosts();
  }

  /**
   * Get all blog posts with caching and fallback
   */
  getPosts(): Observable<BlogPost[]> {
    this.loadingSubject.next(true);

    // Try to get from cache first
    const cachedPosts = this.getCachedPosts();
    if (cachedPosts) {
      this.loadingSubject.next(false);
      this.usingCacheSubject.next(true);
      return of(cachedPosts);
    }

    return this.http.get<BlogPost[]>(this.apiUrl).pipe(
      tap(posts => {
        this.cachePosts(posts);
        this.usingCacheSubject.next(false);
      }),
      catchError(error => {
        console.error('Error fetching blog posts:', error);
        const fallbackPosts = this.getCachedPosts() || fallbackBlogPosts;
        this.usingCacheSubject.next(true);
        return of(fallbackPosts);
      }),
      tap(() => this.loadingSubject.next(false))
    );
  }

  /**
   * Get a single blog post by its slug
   */
  getPostBySlug(slug: string): Observable<BlogPost | null> {
    return this.getPosts().pipe(
      map(posts => posts.find(p => p.slug === slug) || null)
    );
  }

  /**
   * Get recent posts
   */
  getRecentPosts(count: number = 3): Observable<BlogPost[]> {
    return this.getPosts().pipe(
      map(posts => {
        return [...posts]
          .sort((a, b) => new Date(b.publisheddate).getTime() - new Date(a.publisheddate).getTime())
          .slice(0, count);
      })
    );
  }

  /**
   * Get all unique tags from blog posts
   */
  getTags(): Observable<string[]> {
    return this.getPosts().pipe(
      map(posts => {
        const allTags = posts.reduce((tags, post) => [...tags, ...post.tags], [] as string[]);
        return [...new Set(allTags)].sort();
      })
    );
  }

  /**
   * Get posts by tag
   */
  getPostsByTag(tag: string): Observable<BlogPost[]> {
    return this.getPosts().pipe(
      map(posts => posts.filter(post => 
        post.tags.some(t => t.toLowerCase() === tag.toLowerCase())
      ))
    );
  }

  /**
   * Search posts by query string
   */
  searchPosts(query: string): Observable<BlogPost[]> {
    const searchTerms = query.toLowerCase().split(' ');
    return this.getPosts().pipe(
      map(posts => posts.filter(post => {
        const searchText = `${post.title} ${post.excerpt} ${post.content} ${post.tags.join(' ')}`.toLowerCase();
        return searchTerms.every(term => searchText.includes(term));
      }))
    );
  }

  /**
   * Force refresh from server
   */
  forceRefresh(): Observable<BlogPost[]> {
    this.clearCache();
    return this.http.get<BlogPost[]>(this.apiUrl).pipe(
      tap(posts => {
        this.cachePosts(posts);
        this.usingCacheSubject.next(false);
      }),
      catchError(error => {
        console.error('Error refreshing blog posts:', error);
        return of(fallbackBlogPosts);
      })
    );
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
    localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
  }

  /**
   * Get cache age in hours
   */
  getCacheAge(): number | null {
    const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
    if (!timestamp) return null;
    
    const age = (Date.now() - parseInt(timestamp)) / (1000 * 60 * 60); // Convert to hours
    return Math.round(age * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Cache the blog posts
   */
  private cachePosts(posts: BlogPost[]): void {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(posts));
    localStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
  }

  /**
   * Get cached blog posts
   */
  private getCachedPosts(): BlogPost[] | null {
    const cached = localStorage.getItem(this.CACHE_KEY);
    const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);

    if (!cached || !timestamp) return null;

    // Check if cache is still valid
    if (Date.now() - parseInt(timestamp) > this.CACHE_DURATION) {
      this.clearCache();
      return null;
    }

    const posts = JSON.parse(cached);
    // Convert string dates back to Date objects
    return posts.map((post: any) => ({
      ...post,
      publisheddate: new Date(post.publisheddate)
    }));
  }

  /**
   * Load cached posts on service initialization
   */
  private loadCachedPosts(): void {
    const posts = this.getCachedPosts();
    if (posts) {
      this.usingCacheSubject.next(true);
    }
  }
}
