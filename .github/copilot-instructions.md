PROJECT
This repo is the baseline of an AI video clipping tool: a Node.js CLI that takes one local video and produces several vertical 9:16 clips with burned-in captions. Several Copilot agents build different modules at the same time, each from its own GitHub issue. Stay strictly inside the files listed in your issue.

HARD CONSTRAINTS
- JavaScript only. No TypeScript, no .ts files, no tsconfig. ES modules, Node 20+. JSDoc is fine.
- Dependencies allowed: dotenv, openai, @anthropic-ai/sdk, zod. Use node:test for tests. Do not add others; write the request in docs/requests/<your-agent-letter>.md instead.
- Call ffmpeg and ffprobe only with child_process.spawn and an argument array (use run() in src/util.js). Never build shell command strings.
- You have no API keys and no network access to model providers. Never call real APIs in tests; mock them with the fixtures in test/fixtures/. Never hardcode keys or log transcripts.
- Write outputs to a temp name and rename on success. No partial files on failure.

COORDINATION RULES
- The contract is docs/CONTRACTS.md. Implement function signatures and data shapes EXACTLY as specified. Do not rename, reorder arguments, or change return shapes.
- Only edit the files listed under YOUR FILES in your issue. Do not touch src/util.js, docs/CONTRACTS.md, test fixtures, package.json, or any other agent's files, even to fix a bug.
- If you need a change to the contract, util, or dependencies, create docs/requests/<your-agent-letter>.md describing what and why, and work around it meanwhile. Never edit a shared file.
- Develop and test only against the fixtures in test/fixtures/. Do not depend on another agent's module being finished; mock anything outside your module.

DONE MEANS
- npm test passes for your files.
- Your PR description contains: files changed, how to run your tests, anything you could not verify, and a "Contract requests" section (or "none").
- PR title format: "Agent <letter>: <module name>".
