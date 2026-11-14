import { pgTable, serial, text, boolean, date } from 'drizzle-orm/pg-core'

export const planets = pgTable('projects', {
  _id: serial('_id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  shortdescription: text('shortdescription'),
  technologies: text('technologies').array(),
  githuburl: text('githuburl'),
  liveurl: text('liveurl'),
  imageurl: text('imageurl'),
  featured: boolean('featured'),
  status: text('status'),
  startdate: date('startdate'),
  enddate: date('enddate'),
  category: text('category'),
  createdat: date('createdat'),
  updatedat: date('updatedat'),
  blogpost: boolean('blogpost'),
  blogid: text('blogid')
})
