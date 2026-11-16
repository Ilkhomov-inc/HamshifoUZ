/**
 * Grants the doctor role to a Google account and links it to a doctor record.
 * Roles can ONLY be assigned here (server-side, with DB credentials) — never by users.
 *
 *   npm run doctor:create -- --email someone@gmail.com --doctor dilnoza-karimova
 *   npm run doctor:create -- --list
 */
import "./_env";
import { getPool, withServer } from "../src/lib/db";

const args = process.argv.slice(2);
const get = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

await withServer(async (db) => {
  if (args.includes("--list")) {
    const r = await db.query(
      "select d.slug, d.full_name, d.specialty, c.city, u.email from hs.doctors d join hs.clinics c on c.id = d.clinic_id left join hs.users u on u.id = d.user_id order by c.city, d.specialty",
    );
    console.table(r.rows);
    return;
  }
  const email = get("--email")?.trim().toLowerCase();
  const slug = get("--doctor");
  if (!email || !slug || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Usage: npm run doctor:create -- --email someone@gmail.com --doctor <doctor-slug>  (see --list)");
    process.exitCode = 1;
    return;
  }
  const doctor = await db.query<{ id: string }>("select id from hs.doctors where slug = $1", [slug]);
  if (!doctor.rows[0]) {
    console.error(`No doctor with slug "${slug}". Run with --list.`);
    process.exitCode = 1;
    return;
  }
  const user = await db.query<{ id: string }>(
    `insert into hs.users (email, role) values ($1, 'doctor')
     on conflict (email) do update set role = 'doctor' returning id`,
    [email],
  );
  await db.query("update hs.doctors set user_id = null where user_id = $1", [user.rows[0]!.id]);
  await db.query("update hs.doctors set user_id = $1 where id = $2", [user.rows[0]!.id, doctor.rows[0].id]);
  await db.query("delete from hs.sessions where user_id = $1", [user.rows[0]!.id]);
  console.log(`✔ ${email} is now the doctor account for "${slug}". They sign in with Google as usual.`);
});
await getPool().end();
