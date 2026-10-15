<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.


# Klarone2 Autonomous Execution Rules

1. Workspace Confinement:
   - Perform all operations strictly within the Klarone2 directory. Do not attempt to traverse or modify files outside this directory.

2. Iterative Development & Self-Testing:
   - Implement one single function/feature at a time.
   - Run tests immediately using the project's test command (e.g., `npm test` or the appropriate suite).
   - If tests fail, fix the implementation before taking any further action. Do not commit broken code.

3. Automated Git Push:
   - After tests pass for the implemented function, automatically stage the changed files:
     git add <changed-files>
   - Commit the changes:
     git commit -m "feat: implement <function-name> and verify tests"
   - Push immediately to GitHub:
     git push origin <active-branch>
   - Only start working on the next requirement once the push succeeds.

<!-- END:nextjs-agent-rules -->
