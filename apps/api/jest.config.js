/** @type {import('jest').Config} */
module.exports = {
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  testPathIgnorePatterns: ["/node_modules/", "/test/"],
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  moduleFileExtensions: ["js", "json", "ts"],
  collectCoverageFrom: ["src/**/*.(t|j)s"],
};
