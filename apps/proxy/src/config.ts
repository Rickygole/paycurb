function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing environment variable ${name}`);
  return value;
}

export function ownerDatabaseUrl(): string {
  return process.env.OWNER_DATABASE_URL ?? required("OWNER_DATABASE_DATABASE_URL");
}

function appRoleUrl(): string {
  const url = new URL(ownerDatabaseUrl());
  url.username = "paycurb_app";
  url.password = required("APP_DB_PASSWORD");
  return url.toString();
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: () => process.env.DATABASE_URL ?? appRoleUrl(),
  ownerPassword: () => required("OWNER_PASSWORD"),
  sessionSecret: () => required("SESSION_SECRET"),
  demoMode: process.env.DEMO_MODE === "true",
  policyTimezone: process.env.POLICY_TIMEZONE ?? "America/New_York",
  paypal: () => {
    if (process.env.PAYPAL_ENV !== "sandbox") throw new Error("PAYPAL_ENV must be sandbox");
    return { clientId: required("PAYPAL_CLIENT_ID"), clientSecret: required("PAYPAL_CLIENT_SECRET") };
  },
};
