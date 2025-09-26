import { Routes } from '@angular/router';
import { HomeComponent } from './home-component/home-component';
import { WorkComponent } from './work-component/work-component';
import { BlogComponent } from './blog-component/blog-component';
import { ContactComponent } from './contact-component/contact-component';
import { BlogDetailComponent } from './blog-detail-component/blog-detail-component';

export const routes: Routes = [
  {
    path: 'about', 
    component: HomeComponent,
    title: "About"
  },
  {
    path: '',
    component: HomeComponent,
    title: "About"
  },
  {
    path: 'work',
    component: WorkComponent,
    title: "Work"
  },
  {
    path: 'blog',
    component: BlogComponent,
    title: "Blog"
  },
  {
    path: 'blog/:slug',
    component: BlogDetailComponent,
    title: "Blog Post"
  },
  {
    path: 'contact',
    component: ContactComponent,
    title: "Contact"
  }
];