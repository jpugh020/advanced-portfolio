import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment'; // Ensure this path is correct

export interface Project {
  id?: number; // Supabase usually uses numeric IDs or UUIDs
  _id?: string; // Kept for backward compatibility with your fallback data
  title: string;
  description: string;
  shortdescription?: string;
  technologies: string[]; // Assumes a text[] array column in Postgres
  githuburl?: string;
  liveurl?: string;
  imageurl?: string;
  featured: boolean;
  status: 'completed' | 'in-progress' | 'planned';
  startdate: Date; // Supabase returns these as strings, we may need to convert
  enddate?: Date;
  category: string;
  createdat?: Date;
  updatedat?: Date;
  blogpost: boolean;
  blogid?: string;
}

// API Response interfaces
export interface ProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
}

export interface ProjectFilters {
  category?: string;
  status?: string;
  featured?: boolean;
  technologies?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  private supabase: SupabaseClient;

  // Cache Constants
  private readonly CACHE_KEY = 'portfolio_projects_cache';
  private readonly CACHE_TIMESTAMP_KEY = 'portfolio_projects_cache_timestamp';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // State Management
  private projectsSubject = new BehaviorSubject<Project[]>([]);
  public projects$ = this.projectsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private usingCacheSubject = new BehaviorSubject<boolean>(false);
  public usingCache$ = this.usingCacheSubject.asObservable();

  // Fallback data (Preserved from your original code)
  private readonly fallbackProjects: Project[] = [
    {
      _id: 'fallback-1',
      title: 'Portfolio Website fallback',
      description: 'This personal portfolio is a showcase of several skills at once...',
      shortdescription: 'Angular-based front end with Node & POSTGRESQL back end.',
      technologies: ['Angular', 'TypeScript', 'Angular Material', 'Tailwind CSS'],
      githuburl: 'https://github.com/yourusername/portfolio',
      liveurl: 'https://yourportfolio.com',
      imageurl: 'https://i.imgur.com/i7vMcSI.png',
      featured: true,
      status: 'completed',
      startdate: new Date('2025-08-25'),
      enddate: new Date('2025-09-20'),
      category: 'Web Development',
      blogpost: true,
      blogid: 'portfolio-development-journey'
    },
    // ... (Your other fallback projects here) ...
  ];

  constructor() {
    // Initialize Supabase
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    // Load cached projects on initialization
    this.loadCachedProjects();
  }

  /**
   * Get all projects with fallback cache system
   */
  getAllProjects(): Observable<Project[]> {
    this.loadingSubject.next(true);
    this.usingCacheSubject.next(false);

    // Convert Supabase Promise to Observable
    const query = this.supabase
      .from('projects')
      .select('*')
      .order('startdate', { ascending: false });

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as unknown as Project[];
      }),
      tap(projects => {
        if (projects && projects.length > 0) {
          this.cacheProjects(projects);
          this.projectsSubject.next(projects);
          this.usingCacheSubject.next(false);
        } else {
          console.warn('Supabase returned empty response, falling back to cache');
          this.useFallbackData();
        }
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error fetching projects from Supabase:', error);
        this.useFallbackData();
        this.loadingSubject.next(false);
        const cachedProjects = this.getCachedProjects() || this.fallbackProjects;
        return of(cachedProjects);
      })
    );
  }

  /**
   * Get projects with optional filtering and pagination
   */
  getProjects(
    page: number = 1,
    limit: number = 10,
    filters?: ProjectFilters
  ): Observable<ProjectsResponse> {
    this.loadingSubject.next(true);

    // Calculate Pagination Range for Supabase (0-index based)
    const fromIndex = (page - 1) * limit;
    const toIndex = fromIndex + limit - 1;

    // Build the query dynamically
    let query = this.supabase
      .from('projects')
      .select('*', { count: 'exact' }); // requesting count for pagination

    // Apply Filters
    if (filters) {
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.featured !== undefined) {
        query = query.eq('featured', filters.featured);
      }
      if (filters.technologies && filters.technologies.length > 0) {
        // Postgres array "contains" operator
        query = query.contains('technologies', filters.technologies);
      }
    }

    // Apply Pagination
    query = query.range(fromIndex, toIndex).order('startdate', { ascending: false });

    return from(query).pipe(
      map(({ data, count, error }) => {
        if (error) throw error;
        return {
          projects: data as unknown as Project[],
          total: count || 0,
          page,
          limit
        };
      }),
      tap(response => {
        if (response.projects.length > 0) {
          // Note: We might not want to cache partial paginated results deeply,
          // or we handle it differently. For now, we update the subject.
          this.projectsSubject.next(response.projects);
          this.usingCacheSubject.next(false);
        }
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error fetching paginated projects:', error);
        const cachedProjects = this.getCachedProjects() || this.fallbackProjects;
        const filtered = this.applyClientSideFilters(cachedProjects, filters);

        // Manual pagination of fallback data
        const pagedData = filtered.slice(fromIndex, toIndex + 1);

        const fallbackResponse: ProjectsResponse = {
          projects: pagedData,
          total: filtered.length,
          page,
          limit
        };
        this.usingCacheSubject.next(true);
        this.loadingSubject.next(false);
        return of(fallbackResponse);
      })
    );
  }

  /**
   * Get featured projects
   */
  getFeaturedProjects(): Observable<Project[]> {
    this.loadingSubject.next(true);

    const query = this.supabase
      .from('projects')
      .select('*')
      .eq('featured', true);

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as unknown as Project[];
      }),
      tap(() => {
        this.loadingSubject.next(false);
        this.usingCacheSubject.next(false);
      }),
      catchError(error => {
        console.error('Error fetching featured projects:', error);
        const cachedProjects = this.getCachedProjects() || this.fallbackProjects;
        const featuredProjects = cachedProjects.filter(p => p.featured);
        this.usingCacheSubject.next(true);
        this.loadingSubject.next(false);
        return of(featuredProjects);
      })
    );
  }

  /**
   * Get unique categories
   */
  getCategories(): Observable<string[]> {
    // Supabase doesn't have a distinct() API for simple selects easily without RPC,
    // so we fetch the column and filter in JS, or create a Postgres function.
    // Fetching distinct category names via simple query:
    const query = this.supabase
      .from('projects')
      .select('category');

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const categories = data?.map((p: any) => p.category) || [];
        return [...new Set(categories)] as string[];
      }),
      catchError(error => {
        console.error('Error fetching categories:', error);
        const cachedProjects = this.getCachedProjects() || this.fallbackProjects;
        const categories = [...new Set(cachedProjects.map(p => p.category))];
        return of(categories);
      })
    );
  }

  /**
   * Get unique technologies
   */
  getTechnologies(): Observable<string[]> {
    const query = this.supabase
      .from('projects')
      .select('technologies');

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        // Flatten the array of arrays
        const allTech = data?.flatMap((p: any) => p.technologies) || [];
        return [...new Set(allTech)] as string[];
      }),
      catchError(error => {
        console.error('Error fetching technologies:', error);
        const cachedProjects = this.getCachedProjects() || this.fallbackProjects;
        const technologies = [...new Set(cachedProjects.flatMap(p => p.technologies))];
        return of(technologies);
      })
    );
  }

  // ==========================================
  // CACHING & UTILITY METHODS (UNCHANGED)
  // ==========================================

  private cacheProjects(projects: Project[]): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(projects));
      localStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to cache projects:', error);
    }
  }

  private getCachedProjects(): Project[] | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);

      if (cached && timestamp) {
        const cacheAge = Date.now() - parseInt(timestamp);
        if (cacheAge < this.CACHE_DURATION) {
          return JSON.parse(cached);
        } else {
          this.clearCache();
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve cached projects:', error);
    }
    return null;
  }

  private loadCachedProjects(): void {
    const cachedProjects = this.getCachedProjects();
    if (cachedProjects && cachedProjects.length > 0) {
      this.projectsSubject.next(cachedProjects);
    }
  }

  private useFallbackData(): void {
    const cachedProjects = this.getCachedProjects();

    if (cachedProjects && cachedProjects.length > 0) {
      this.projectsSubject.next(cachedProjects);
      this.usingCacheSubject.next(true);
    } else {
      this.projectsSubject.next(this.fallbackProjects);
      this.usingCacheSubject.next(true);
    }
  }

  private applyClientSideFilters(projects: Project[], filters?: ProjectFilters): Project[] {
    if (!filters) return projects;

    let filtered = [...projects];

    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    if (filters.featured) {
      filtered = filtered.filter(p => p.featured);
    }

    if (filters.technologies && filters.technologies.length > 0) {
      filtered = filtered.filter(p =>
        filters.technologies!.some(tech =>
          p.technologies.some(pTech =>
            pTech.toLowerCase().includes(tech.toLowerCase())
          )
        )
      );
    }

    return filtered;
  }

  public clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  public forceRefresh(): Observable<Project[]> {
    this.clearCache();
    return this.getAllProjects();
  }
}
