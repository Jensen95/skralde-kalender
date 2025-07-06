# Dependabot Auto-Merge Setup

This repository is configured to automatically merge Dependabot pull requests for minor and patch updates.

## Quick Setup

1. Run the setup script:
   ```bash
   ./enable-auto-merge.sh
   ```

2. That's it! 🎉

## How it works

- When Dependabot creates a PR for a minor or patch update, the workflow automatically enables auto-merge
- GitHub waits for all required status checks to pass
- Once checks pass, the PR is automatically merged
- Major updates require manual review

## Files

- `.github/dependabot.yml` - Configures which dependencies Dependabot monitors
- `.github/workflows/dependabot-auto-merge.yml` - The auto-merge workflow
- `DEPENDABOT_AUTO_APPROVAL_SETUP.md` - Detailed documentation
- `.github/workflows/dependabot-auto-merge-examples.yml` - Advanced examples if needed

## Customization

See `DEPENDABOT_AUTO_APPROVAL_SETUP.md` for customization options.