import { getDatabase, getConnectionString } from '@netlify/database';
import { Config } from '@netlify/functions';

const db = getDatabase();

export default async (req: Request) => {
  const projects = await db.sql`SELECT * FROM projects.projects;`;

  return Response.json({ projects });
}
export const config: Config = {
  path: "/get-projects"
}
