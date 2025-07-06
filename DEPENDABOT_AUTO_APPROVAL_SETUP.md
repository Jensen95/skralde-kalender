# Dependabot Auto-Merge Setup

## Overview

This repository is configured to automatically merge Dependabot pull requests for minor and patch updates. Since your branch protection rules don't require approvals, we're using a simple workflow that just enables auto-merge.

## Current Configuration

The workflow (`.github/workflows/dependabot-auto-merge.yml`) will automatically:
- Enable auto-merge for minor and patch version updates
- Add labels to PRs based on update type (major/minor/patch)
- Wait for all required status checks to pass before merging
- Use squash merge strategy

Major version updates will NOT be auto-merged (this is intentional for safety).

## How It Works

1. Dependabot creates a pull request
2. The workflow triggers and checks if it's a minor or patch update
3. If yes, it enables auto-merge on the PR
4. GitHub waits for all required status checks to pass
5. Once checks pass, the PR is automatically merged

## Setup Requirements

1. **Enable auto-merge in repository settings**:
   - Go to Settings → General → Pull Requests
   - Check "Allow auto-merge"

2. **Configure branch protection** (optional but recommended):
   - Go to Settings → Branches
   - Add rule for your main branch
   - Enable "Require status checks to pass before merging"
   - Select the checks you want to require

3. **Dependabot configuration** (`.github/dependabot.yml`):
   - Already configured in your repository
   - Adjust update schedule and package ecosystems as needed

## Testing

After setting up:
1. You can manually trigger Dependabot to check for updates
2. Check the Actions tab to see if the workflow runs when Dependabot creates PRs
3. Verify that minor/patch PRs have auto-merge enabled

## Customization Options

### Change which updates are auto-merged

Edit the condition in the workflow:
```yaml
# Current: auto-merge minor and patch
if: >
  steps.metadata.outputs.update-type == 'version-update:semver-minor' ||
  steps.metadata.outputs.update-type == 'version-update:semver-patch'

# Alternative: only patch updates
if: steps.metadata.outputs.update-type == 'version-update:semver-patch'

# Alternative: include major updates (use with caution!)
if: steps.metadata.outputs.update-type != ''
```

### Change merge strategy

Replace `--squash` with:
- `--merge` for regular merge commits
- `--rebase` for rebase merging

### Add more conditions

You can also filter by dependency type:
```yaml
if: >
  steps.metadata.outputs.dependency-type == 'direct:development' &&
  steps.metadata.outputs.update-type == 'version-update:semver-patch'
```

## Troubleshooting

If auto-merge isn't working:

1. **Check workflow runs**: Go to Actions tab and look for errors
2. **Verify auto-merge is enabled**: Repository settings → General → Pull Requests → Allow auto-merge
3. **Check branch protection**: Ensure status checks are configured correctly
4. **Review Dependabot logs**: Check if Dependabot is creating PRs successfully

## Security Notes

- Major version updates require manual review (good practice)
- The workflow only runs for Dependabot PRs (checked via `github.actor == 'dependabot[bot]'`)
- Uses only the default `GITHUB_TOKEN` with minimal permissions

## Additional Examples

See `.github/workflows/dependabot-auto-merge-examples.yml` for more advanced configurations including:
- Auto-approval with PAT (if you later need approvals)
- GitHub App integration
- Advanced labeling and conditions