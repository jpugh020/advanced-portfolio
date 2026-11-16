import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, catchError, map, tap, of} from 'rxjs';
import { HttpClient } from '@angular/common/http';


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


export interface ProjectFilters {
  category?: string;
  status?: string;
  featured?: boolean;
  technologies?: string[];
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly CACHE_KEY = 'portfolio_projects_cache';
  private readonly CACHE_TIMESTAMP_KEY = 'portfolio_projects_cache_timestamp';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;

  private projectsSubject = new BehaviorSubject<Project[]>([]);
  public projects$ = this.projectsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private usingCacheSubject = new BehaviorSubject<boolean>(false);
  public usingCache$ = this.usingCacheSubject.asObservable();

  private readonly fallbackProjects: Project[] = [
    {
      _id: 'fallback-1',
      title: 'Portfolio Website',
      description: 'This personal portfolio is a showcase of several skills at once, all of which I have honed independently. I used Angular for the frontend, an ExpressJS Node server deployed on AWS for the backend, and a POSTGRESQL database for its ease of implementation (and low low cost). I have all my project details saved in my Database, and they are pulled and displayed dynamically by my Angular frontend. I built the structure myself, but to save time I leveraged AI tools to streamline styling and to help implement mass changes (changing multiple stylings or re-implementing a feature), but the bulk of the portfolio is hand-built with love ♥.',
      shortdescription: 'Angular-based front end with Node & POSTGRESQL back end.',
      technologies: ['Angular', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
      githuburl: 'https://github.com/jpugh020/advanced-portfolio',
      liveurl: 'https://www.pughdev.com',
      imageurl: 'https://i.imgur.com/i7vMcSI.png',
      featured: true,
      status: 'completed',
      startdate: new Date('2025-08-25'),
      enddate: new Date('2025-09-20'),
      category: 'Web Development',
      blogpost: true,
      blogid: 'portfolio-development-journey'
    }, {
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
    this.loadCachedProjects();
  }

  private cacheProjects(projects: Project[]) {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(projects));
      localStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {
      console.warn("Failed to cache projects. Error: ", e);
    }
  }

  private getCachedProjects(): Project[] | null {
    try {
      const cache = localStorage.getItem(this.CACHE_KEY);
      const timestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);

      if (cache && timestamp) {
        const cacheAge = Date.now() - parseInt(timestamp);
        if (cacheAge < this.CACHE_DURATION) {
          console.log("Using cached projects");
          return JSON.parse(cache);
        } else {
          console.log("Cache Expired, clearing now");
          this.clearCache();
        }
      }
    } catch (e) {
      console.warn("Failed to get cached projects. Error: ", e);
    }
    return null;
  }

  private loadCachedProjects(): void {
    const cache = this.getCachedProjects();
    if (cache && cache.length > 0) {
      this.projectsSubject.next(cache);
      console.log("Loaded retrieved cached projects");
    }
  }

  public clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
      console.log("Cache Cleared!");
    } catch (e) {
      console.error("Error clearing cache. Error: ", e);
    }
  }

  private useFallbackData(): void {
    const cache = this.getCachedProjects();

    if (cache && cache.length > 0) {
      console.log("Using cached projects as a fallback");
      this.projectsSubject.next(cache);
      this.usingCacheSubject.next(true);
    } else {
      console.log("No cache, using hard-coded fallbacks");
      this.projectsSubject.next(this.fallbackProjects);
      this.usingCacheSubject.next(true);
    }
  }

  public forceRefresh(): Observable<Project[]> {
    this.clearCache();
    return this.getAllProjects();
  }
  getAllProjects(): Observable<Project[]> {
    this.loadingSubject.next(true);
    this.usingCacheSubject.next(false);
    this.projectsSubject.next(this.fallbackProjects);
    return this.projectsSubject.asObservable();

  }

}
