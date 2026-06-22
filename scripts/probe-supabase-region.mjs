import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pwd = encodeURIComponent("Tuzz@#2020G");
const ref = "frajgdoitibffptpxxtj";
const regions = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-central-2", "eu-north-1",
  "ap-south-1", "ap-south-2", "ap-southeast-1", "ap-southeast-2",
  "ap-northeast-1", "ap-northeast-2", "ap-northeast-3",
  "sa-east-1", "ca-central-1", "me-central-1", "af-south-1",
];
const schema = path.join(__dirname, "../packages/db/prisma/schema.prisma");
const cwd = path.join(__dirname, "../packages/db");

function tryUrl(label, direct) {
  process.env.DIRECT_URL = direct;
  process.env.DATABASE_URL = direct.replace(":5432/", ":6543/") + (direct.includes("?") ? "&" : "?") + "pgbouncer=true";
  const r = spawnSync(
    "npx",
    ["prisma", "db", "execute", "--stdin", "--schema", schema],
    { input: "SELECT 1", cwd, encoding: "utf8", shell: true },
  );
  if (r.status === 0) {
    console.log("SUCCESS", label);
    console.log("DIRECT_URL=" + direct);
    process.exit(0);
  }
  const err = (r.stderr || r.stdout || "").trim().split("\n").pop();
  if (!err?.includes("tenant/user")) {
    console.log(label, "->", err);
  }
}

for (const prefix of ["aws-0", "aws-1"]) {
  for (const region of regions) {
    const poolerHost = `${prefix}-${region}.pooler.supabase.com`;
    tryUrl(poolerHost, `postgresql://postgres.${ref}:${pwd}@${poolerHost}:5432/postgres`);
  }
}

tryUrl(
  "direct-ipv6",
  `postgresql://postgres:${pwd}@db.${ref}.supabase.co:5432/postgres`,
);

console.log("No working connection string found. Copy exact URIs from Supabase Dashboard → Connect.");
process.exit(1);
