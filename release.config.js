export default {
  // https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration
  // https://github.com/semantic-release/semantic-release/blob/master/docs/usage/plugins.md
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    // TODO: "@semantic-release/npm",
    "@semantic-release/github",
  ],
}
