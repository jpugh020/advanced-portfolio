import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'about',
    title: "About",
    loadComponent: () => import('./home-component/home-component').then(m => m.HomeComponent)
  },
  {
    path: '',
    title: "About",
    loadComponent: () => import('./home-component/home-component').then(m => m.HomeComponent)
  },
  {
    path: 'work',
    title: "Work",
    loadComponent: () => import('./work-component/work-component').then(m => m.WorkComponent)
  },
  {
    path: 'blog',
    title: "Blog",
    loadComponent: () => import('./blog-component/blog-component').then(m => m.BlogComponent)
  },
  {
    path: 'blog/:slug',
    title: "Blog Post",
    loadComponent: () => import('./blog-detail-component/blog-detail-component').then(m => m.BlogDetailComponent)
  },
  {
    path: 'contact',
    title: "Contact",
    loadComponent: () => import('./contact-component/contact-component').then(m => m.ContactComponent)

  }
];
