const accounts = [
  ["alexa.santos@camflea.com", "Alexa", "Santos", "CF-2026-0001"],
  ["ben.delacruz@camflea.com", "Ben", "Dela Cruz", "CF-2026-0002"],
  ["carla.mendoza@camflea.com", "Carla", "Mendoza", "CF-2026-0003"],
  ["diego.navarro@camflea.com", "Diego", "Navarro", "CF-2026-0004"],
  ["ella.reyes@camflea.com", "Ella", "Reyes", "CF-2026-0005"],
  ["felix.cruz@camflea.com", "Felix", "Cruz", "CF-2026-0006"],
  ["grace.villanueva@camflea.com", "Grace", "Villanueva", "CF-2026-0007"],
  ["hugo.ramos@camflea.com", "Hugo", "Ramos", "CF-2026-0008"],
  ["isla.garcia@camflea.com", "Isla", "Garcia", "CF-2026-0009"],
  ["jiro.aquino@camflea.com", "Jiro", "Aquino", "CF-2026-0010"],
  ["kira.bautista@camflea.com", "Kira", "Bautista", "CF-2026-0011"],
  ["liam.flores@camflea.com", "Liam", "Flores", "CF-2026-0012"],
];

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.CAMFLEA_DEMO_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !password) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and CAMFLEA_DEMO_PASSWORD before running this script.",
  );
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "content-type": "application/json",
};

async function request(path, options = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed (${response.status}): ${body.msg ?? body.message ?? "unknown error"}`);
  }
  return body;
}

const existing = await request("/auth/v1/admin/users?page=1&per_page=1000");
const existingByEmail = new Map((existing.users ?? []).map((user) => [user.email, user]));

for (const [email, firstName, lastName, studentNumber] of accounts) {
  const payload = {
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, student_number: studentNumber },
  };
  const user = existingByEmail.get(email);
  if (user) {
    await request(`/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    console.log(`updated ${email}`);
  } else {
    const created = await request("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log(`created ${created.user.email}`);
  }
}

const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? serviceRoleKey;
const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: publicKey, "content-type": "application/json" },
  body: JSON.stringify({ email: accounts[0][0], password }),
});
if (!loginResponse.ok) {
  const body = await loginResponse.json().catch(() => ({}));
  throw new Error(`Password login verification failed (${loginResponse.status}): ${body.msg ?? "unknown error"}`);
}
console.log(`verified password login for ${accounts[0][0]}`);
