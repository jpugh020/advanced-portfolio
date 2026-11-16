import { getDatabase, getConnectionString } from '@netlify/database';
import { Config } from '@netlify/functions';

const db = getDatabase();

export default async (req: Request) => {
  const projects = await db.sql`SELECT * FROM projects ORDER BY id;`;

  return Response.json({ projects });
}
export const config: Config = {
  path: "/get-projects"
}
