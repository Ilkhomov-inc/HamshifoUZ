export function demoEnabled(): boolean {
  return process.env.DEMO_MODE !== "false";
}
