import { execFileSync } from "node:child_process";
import { siteIdentity } from "../build-settings.mjs";
export const allowedReleaseRefs = Object.freeze([
  "refs/heads/rhine-blog",
  "refs/heads/codex/rhine-blog",
]);
export function validateReleaseRef(ref, publish) {
  if (publish === true && !allowedReleaseRefs.includes(ref)) {
    throw new Error(
      `Publishing is allowed only from branches rhine-blog or codex/rhine-blog; received ${ref ?? "(missing ref)"}. The historical hugo branch and tags are not publication targets.`,
    );
  }
}
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
  validateReleaseRef(process.env.WORKFLOW_REF, process.env.PUBLISH === "true");
  validateReleaseIntent({
    expected: process.env.EXPECTED_COMMIT,
    actual,
    publish: process.env.PUBLISH === "true",
    confirmation: process.env.CONFIRMATION,
  });
  if (process.env.PUBLISH === "true") {
    console.log("The github-pages environment must separately allow this workflow branch. If GitHub rejects deploy before any step runs, check Settings > Environments > github-pages > Deployment branches and tags; do not remove environment protection.");
  }
  console.log(
    `Verified release commit ${actual}; ref=${process.env.WORKFLOW_REF}; publish=${process.env.PUBLISH === "true"}`,
  );
}
