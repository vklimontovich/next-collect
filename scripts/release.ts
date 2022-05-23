import * as child_process from "child_process";
import * as path from "path";
import * as fs from "fs";

const minimist = require("minimist");

type Version = {
  base: string;
  counter: number;
  tag?: string;
};

function readVersion(): Version {
  return {
    tag: "alpha",
    ...JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../.versionrc"), "utf8")
    ),
  };
}

function saveVersion(v: Version) {
  fs.writeFileSync(
    path.resolve(__dirname, "../.versionrc"),
    JSON.stringify(v, null, 2)
  );
}

function getFromCli(command: string): string {
  const { stdout } = runProjectCommand(command);
  return stdout.toString().trim();
}

function runProjectCommand(
  command: string,
  opts: {
    print?: "error" | "all" | "nothing";
    error?: (cmd: string, status: number) => string;
  } = {}
) {
  const print = opts?.print || "error";
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
    ...(stdout
      .toString()
      .split("\n")
      .filter((line: any) => line.toString().trim() !== "")),
  ].join(`\n${prefix}`);
}

async function run(args: any) {
  const version = readVersion();

  runProjectCommand(`pnpm whoami`, {
    error: () =>
      `Please make sure you are logged in to npm. Run \`pnpm login\` and then make sure you are logged in with \`pnpm whoami\``,
  });

  const releaseVersion = `${version.base}-${version.tag}-${
    version.counter + 1
  }-${getFromCli("git rev-parse --short HEAD")}`;
  runProjectCommand(`pnpm version --ws --no-git-tag-version ${releaseVersion}`);
  try {
    saveVersion({ ...version, counter: version.counter + 1 });
    runProjectCommand(
      `pnpm publish --filter next-collect --no-git-checks ${
        args.publish ? "" : "--dry-run"
      }`
    );
    runProjectCommand(`git add .versionrc`);
    runProjectCommand(
      `git commit -m 'chore: saved next version for canary releases, last canary - ${releaseVersion} '`
    );
    runProjectCommand(`git tag -a v${releaseVersion} -m "Release ${releaseVersion}"`);
  } finally {
    try {
      runProjectCommand(`pnpm version --ws --no-git-tag-version 0.0.0`);
    } catch (e) {
      console.error("Failed to rollback to 0.0.0");
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
