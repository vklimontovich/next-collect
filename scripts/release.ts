import * as child_process from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as process from "process";
import * as JSON5 from "json5";

const minimist = require("minimist");

type Version = {
  canary: {
    base: string;
    npmTag: string;
  };
};

function readVersion(): Version {
  return JSON5.parse(
    fs.readFileSync(path.resolve(__dirname, "../.versionrc"), "utf8")
  );
}

function getFromCli(command: string): string {
  const { stdout } = runProjectCommand(command, { print: "error" });
  return stdout.toString().trim();
}

function runProjectCommand(
  command: string,
  opts: {
    print?: "error" | "all" | "nothing";
    error?: (cmd: string, status: number) => string;
  } = {}
) {
  const print = opts?.print || "all";
  console.log(`Running \`${command}\`...`);
  const { status, stderr, stdout } = child_process.spawnSync(command, {
    cwd: path.resolve(__dirname, ".."),
    shell: true,
  });
  if (status !== 0) {
    const errorMsg = opts.error
      ? opts.error(command, status || 0)
      : `Command ${command} failed with status ${status}`;
    if (print === "error" || print === "all") {
      console.log(printStdout(stderr, `  > `));
      console.log(printStdout(stdout, `  > `));
    }
    throw new Error(errorMsg);
  }
  if (print === "all") {
    console.log(printStdout(stdout, `  > `));
    console.error();
  }
  return { stdout, stderr };
}

function printStdout(stdout: any, prefix: string) {
  return [
    "",
    ...stdout
      .toString()
      .split("\n")
      .filter((line: any) => line.toString().trim() !== ""),
  ].join(`\n${prefix}`);
}

function getRevision() {
  return getFromCli("git rev-list --abbrev-commit HEAD").split("\n").length;
}

async function run(args: any) {
  const version = readVersion();

  if (args.canary) {
    console.log("Publishing canary release");
  } else if (args.release) {
    console.log(`Publishing production release ${args.release}`);
  } else {
    throw new Error("Please specify either --canary or --release");
  }

  runProjectCommand(`pnpm whoami`, {
    error: () =>
      `Please make sure you are logged in to npm. Run \`pnpm login\` and then make sure you are logged in with \`pnpm whoami\``,
  });

  const releaseVersion = args.canary
    ? `${version.canary.base}.${getRevision()}`
    : args.release;
  const gitTag = `v${releaseVersion}`;
  if (getFromCli(`git tag -l ${gitTag}`).trim() !== "") {
    throw new Error(
      `Tag ${gitTag} already exists. Seems like version ${releaseVersion} has already been released.`
    );
  }
  runProjectCommand(`pnpm version --ws --no-git-tag-version ${releaseVersion}`);
  const npmTag = version.canary.npmTag || "canary";
  try {
    if (!args.publish) {
      console.warn(
        "Skipping publish, making a dry run. Add --publish to make a real release."
      );
    }
    runProjectCommand(
      `pnpm publish --tag ${
        args.canary ? npmTag : "latest"
      } --filter next-collect --no-git-checks ${
        args.publish ? "" : "--dry-run"
      }`
    );
    const tagCommand = `git tag -a v${releaseVersion} -m "Release ${releaseVersion}"`;
    if (args.publish) {
      runProjectCommand(tagCommand);
    } else {
      console.log(
        `Because of dry run, not tagging the release. Here is the command that would tag id: ${tagCommand}`
      );
    }
  } finally {
    try {
      runProjectCommand(`pnpm version --ws --no-git-tag-version 0.0.0`);
    } catch (e) {
      console.error("Failed to rollback to 0.0.0", e);
    }
  }
}

async function main() {
  const args = minimist(process.argv.slice(2));
  try {
    await run(args);
  } catch (e: any) {
    console.error(args.verbose ? e : `ERROR: ${e?.message || "Uknown error"}`);
    process.exit(1);
  }
}

main();
