import { db } from "./database.js";
import { migrate } from "./schema.js";
import { seedIfEmpty } from "./seed.js";

migrate();
seedIfEmpty();

const count = db.prepare("SELECT COUNT(*) AS count FROM structures").get() as { count: number };
console.log(`Database ready with ${count.count} structures.`);
