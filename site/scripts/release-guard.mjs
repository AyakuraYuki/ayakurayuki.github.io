import { execFileSync } from "node:child_process";
import { siteIdentity } from "../build-settings.mjs";
export function validateReleaseIntent({
  expected,
  actual,
  publish,
  confirmation,
}) {
  if (!/^[a-f0-9]{40}$/.test(expected ?? "") || expected !== actual)
    throw new Error(
      "Release requires the exact checked-out 40-character commit SHA. No moving branch refs.",
    );
  if (
    publish === true &&
    confirmation !== new URL(siteIdentity.origin).hostname
  )
    throw new Error(
      "Publishing requires an explicit confirmation of the production hostname.",
    );
}
if (process.argv.includes("--check")) {
  const actual = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  validateReleaseIntent({
    expected: process.env.EXPECTED_COMMIT,
    actual,
    publish: process.env.PUBLISH === "true",
    confirmation: process.env.CONFIRMATION,
  });
  console.log(
    `Verified release commit ${actual}; publish=${process.env.PUBLISH === "true"}`,
  );
}
