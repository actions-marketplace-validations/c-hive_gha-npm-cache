const core = require("@actions/core");
const exec = require("@actions/exec");
const md5File = require("md5-file");
const cache = require("@actions/cache");

async function uname() {
  let output = "";
  const options = {};
  options.listeners = {
    stdout: data => {
      output += data.toString();
    },
  };
  await exec.exec("uname", [], options);

  return output.trim();
}

async function npmCache() {
  let output = "";
  const options = {};
  options.listeners = {
    stdout: data => {
      output += data.toString();
    },
  };
  await exec.exec("npm config get cache", [], options);

  return output.trim();
}

async function run() {
  const os = await uname();
  const cachePath = await npmCache();
  core.saveState("NPM_CACHE_PATH", cachePath);

  const directory = core.getInput("directory");
  const hash = md5File.sync(`${directory}/package-lock.json`);

  const primaryKey = `${os}-npm-cache-${hash}`;
  const restoreKey = `${os}-npm-cache-`;
  core.saveState("NPM_CACHE_KEY", primaryKey);
  core.info(`Cache keys: ${[primaryKey, restoreKey].join(", ")}`);

  const cacheKey = await cache.restoreCache([cachePath], primaryKey, [
    restoreKey,
  ]);

  if (!cacheKey) {
    core.info("Cache not found");
    return;
  }

  core.saveState("NPM_CACHE_RESULT", cacheKey);
  const isExactKeyMatch = primaryKey === cacheKey;
  core.setOutput("cache-hit", isExactKeyMatch.toString());

  core.info(`Cache restored from key: ${cacheKey}`);
}

run().catch(err => {
  core.setFailed(err.toString());
});
