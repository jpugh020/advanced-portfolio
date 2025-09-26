import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface Project {
  _id?: string;
  title: string;
  description: string;
  shortdescription?: string;
  technologies: string[];
  githuburl?: string;
  liveurl?: string;
  imageurl?: string;
  featured: boolean;
  status: 'completed' | 'in-progress' | 'planned';
  startdate: Date;
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
  private readonly API_BASE_URL = 'https://portflio.work/projects';
  private readonly CACHE_KEY = 'portfolio_projects_cache';
  private readonly CACHE_TIMESTAMP_KEY = 'portfolio_projects_cache_timestamp';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  // BehaviorSubject for caching projects and reactive updates
  private projectsSubject = new BehaviorSubject<Project[]>([]);
  public projects$ = this.projectsSubject.asObservable();
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  // Status indicators for cache usage
  private usingCacheSubject = new BehaviorSubject<boolean>(false);
  public usingCache$ = this.usingCacheSubject.asObservable();

  // Fallback data - hardcoded projects as ultimate fallback
  private readonly fallbackProjects: Project[] = [
    {
      _id: 'fallback-1',
      title: 'Portfolio Website',
      description: 'This personal portfolio is a showcase of several skills at once, all of which I have honed independently. I used Angular for the frontend, an ExpressJS Node server deployed on AWS for the backend, and a POSTGRESQL database for its ease of implementation (and low low cost). I have all my project details saved in my Database, and they are pulled and displayed dynamically by my Angular frontend. I built the structure myself, but to save time I leveraged AI tools to streamline styling and to help implement mass changes (changing multiple stylings or re-implementing a feature), but the bulk of the portfolio is hand-built with love ♥.',
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
    {
      _id: 'fallback-2',
      title: 'Inspirational Homepage',
      description: 'An interactive inpsirational homepage that features a changeable background, a task manager, and current weather for you location.',
      shortdescription: 'Full-stack task management with real-time features',
      technologies: ['React', 'Redux', 'Netlify', 'Open-Source APIs'],
      githuburl: 'https://github.com/jpugh020/inspirational-homepage',
      liveurl: 'https://cool-centaur-c064ba.netlify.app/',
      imageurl: '',
      featured: true,
      status: 'completed',
      startdate: new Date('2025-06-01'),
      enddate: new Date('2025-06-12'),
      category: 'Web Development',
      blogpost: false
    },
    {
      _id: 'fallback-3',
      title: 'Employee Management Database App',
      description: 'An Employee Management Database made using EJS, Express, Node, and MongoDB. I constructed this myself from the ground up, mainly as a means to practice about server development, security measures, authentication and authorization, and server-side rendering.',
      shortdescription: 'Simple Employee Management App using Express, EJS, MongoDB and Node.',
      technologies: ['Node', 'ExpressJS', 'EJS', 'MongoDB'],
      githuburl: 'https://github.com/jpugh020/crud_employee_management_app',
      featured: false,
      status: 'completed',
      startdate: new Date('2025-06-14'),
      enddate: new Date('2025-06-22'),
      category: 'Employee Management',
      blogpost: false
    }
  ];

  constructor(private http: HttpClient) {
    // Load cached projects on initialization
    this.loadCachedProjects();
  }

  /**
   * Get all projects with fallback cache system
   */
  getAllProjects(): Observable<Project[]> {
    console.log('Making request to:', this.API_BASE_URL);
    this.loadingSubject.next(true);
    this.usingCacheSubject.next(false);

    return this.http.get<Project[]>(this.API_BASE_URL).pipe(
      tap(projects => {
        console.log('Received fresh projects from server:', projects);
        if (projects && projects.length > 0) {
          // Cache the fresh data
          this.cacheProjects(projects);
          this.projectsSubject.next(projects);
          this.usingCacheSubject.next(false);
        } else {
          // Server returned empty response, use cache
          console.warn('Server returned empty response, falling back to cache');
          this.useFallbackData();
        }
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error fetching projects from server:', error);
        this.useFallbackData();
        this.loadingSubject.next(false);
        
        // Return the fallback data instead of throwing error
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
    
    let params: any = {
      page: page.toString(),
      limit: limit.toString()
    };

    // Add filters to params if provided
    if (filters) {
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.featured !== undefined) params.featured = filters.featured.toString();
      if (filters.technologies && filters.technologies.length > 0) {
        params.technologies = filters.technologies.join(',');
      }
    }

    return this.http.get<ProjectsResponse>(this.API_BASE_URL, { params })
      .pipe(
        tap(response => {
          if (response && response.projects && response.projects.length > 0) {
            this.cacheProjects(response.projects);
            this.projectsSubject.next(response.projects);
            this.usingCacheSubject.next(false);
          }
          this.loadingSubject.next(false);
        }),
        catchError(error => {
          console.error('Error fetching paginated projects:', error);
          // Create fallback response from cached data
          const cachedProjects = this.getCachedProjects() || this.fallbackProjects;
          const fallbackResponse: ProjectsResponse = {
            projects: this.applyClientSideFilters(cachedProjects, filters),
            total: cachedProjects.length,
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
   * Get featured projects with fallback
   */
  getFeaturedProjects(): Observable<Project[]> {
    this.loadingSubject.next(true);
    
    return this.http.get<Project[]>(`${this.API_BASE_URL}/featured`)
      .pipe(
        tap(projects => {
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
   * Get unique categories with fallback
   */
  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_BASE_URL}/categories`)
      .pipe(
        catchError(error => {
          console.error('Error fetching categories:', error);
          const cachedProjects = this.getCachedProjects() || this.fallbackProjects;
          const categories = [...new Set(cachedProjects.map(p => p.category))];
          return of(categories);
        })
      );
  }

  /**
   * Get unique technologies with fallback
   */
  getTechnologies(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_BASE_URL}/technologies`)
      .pipe(
        catchError(error => {
          console.error('Error fetching technologies:', error);
          const cachedProjects = this.getCachedProjects() || this.fallbackProjects;
          const technologies = [...new Set(cachedProjects.flatMap(p => p.technologies))];
          return of(technologies);
        })
      );
  }

  /**
   * Cache projects to localStorage
   */
  private cacheProjects(projects: Project[]): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(projects));
      localStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('Projects cached successfully');
    } catch (error) {
      console.warn('Failed to cache projects:', error);
    }
  }

  /**
   * Get projects from localStorage cache
   */
  private getCachedProjects(): Project[] | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
      
      if (cached && timestamp) {
        const cacheAge = Date.now() - parseInt(timestamp);
        if (cacheAge < this.CACHE_DURATION) {
          console.log('Using cached projects');
          return JSON.parse(cached);
        } else {
          console.log('Cache expired, removing old data');
          this.clearCache();
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve cached projects:', error);
    }
    return null;
  }

  /**
   * Load cached projects on service initialization
   */
  private loadCachedProjects(): void {
    const cachedProjects = this.getCachedProjects();
    if (cachedProjects && cachedProjects.length > 0) {
      this.projectsSubject.next(cachedProjects);
      console.log('Loaded cached projects on initialization');
    }
  }

  /**
   * Use fallback data when server is unavailable
   */
  private useFallbackData(): void {
    const cachedProjects = this.getCachedProjects();
    
    if (cachedProjects && cachedProjects.length > 0) {
      console.log('Using cached projects as fallback');
      this.projectsSubject.next(cachedProjects);
      this.usingCacheSubject.next(true);
    } else {
      console.log('No cache available, using hardcoded fallback projects');
      this.projectsSubject.next(this.fallbackProjects);
      this.usingCacheSubject.next(true);
    }
  }

  /**
   * Apply client-side filters to cached data
   */
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

  /**
   * Clear the cache
   */
  public clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
      console.log('Cache cleared');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Force refresh from server
   */
  public forceRefresh(): Observable<Project[]> {
    this.clearCache();
    return this.getAllProjects();
  }

  /**
   * Check if cache is being used
   */
  public isUsingCache(): boolean {
    return this.usingCacheSubject.value;
  }

  /**
   * Get cache age in hours
   */
  public getCacheAge(): number | null {
    try {
      const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
      if (timestamp) {
        return (Date.now() - parseInt(timestamp)) / (1000 * 60 * 60); // Convert to hours
      }
    } catch (error) {
      console.warn('Failed to get cache age:', error);
    }
    return null;
  }

  // Keep existing methods for backward compatibility
  getProjectById(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.API_BASE_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getProjectsByCategory(category: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.API_BASE_URL}/category/${category}`)
      .pipe(catchError(this.handleError));
  }

  getProjectsByTechnology(technology: string): Observable<Project[]> {
    const params = { technologies: technology };
    return this.http.get<Project[]>(this.API_BASE_URL, { params })
      .pipe(catchError(this.handleError));
  }

  searchProjects(searchTerm: string): Observable<Project[]> {
    const params = { search: searchTerm };
    return this.http.get<Project[]>(`${this.API_BASE_URL}/search`, { params })
      .pipe(catchError(this.handleError));
  }

  refreshProjects(): void {
    this.getAllProjects().subscribe();
  }

  getCachedProjectsFromSubject(): Project[] {
    return this.projectsSubject.value;
  }

  /**
   * Error handling method
   */
  private handleError = (error: HttpErrorResponse) => {
    this.loadingSubject.next(false);
    
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      errorMessage = `Server Error: ${error.status} - ${error.message}`;
      
      switch (error.status) {
        case 404:
          errorMessage = 'Projects not found';
          break;
        case 500:
          errorMessage = 'Internal server error. Please try again later.';
          break;
        case 0:
          errorMessage = 'Unable to connect to server. Please check your connection.';
          break;
      }
    }
    
    console.error('ProjectService Error:', error);
    return throwError(() => new Error(errorMessage));
  };
}