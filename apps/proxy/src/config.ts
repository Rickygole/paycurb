function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing environment variable ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: () => required("DATABASE_URL"),
  ownerPassword: () => required("OWNER_PASSWORD"),
  sessionSecret: () => required("SESSION_SECRET"),
  demoMode: process.env.DEMO_MODE === "true",
  policyTimezone: process.env.POLICY_TIMEZONE ?? "America/New_York",
  paypal: () => {
    if (process.env.PAYPAL_ENV !== "sandbox") throw new Error("PAYPAL_ENV must be sandbox");
    return { clientId: required("PAYPAL_CLIENT_ID"), clientSecret: required("PAYPAL_CLIENT_SECRET") };
  },
};
