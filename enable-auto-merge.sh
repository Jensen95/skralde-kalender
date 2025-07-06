#!/bin/bash

echo "🔧 Enabling auto-merge for this repository..."

# Get repository information from git remote
repo_url=$(git remote get-url origin)
repo_name=$(basename -s .git "$repo_url")
owner=$(echo "$repo_url" | awk -F'[/:]' '{print $(NF-1)}')

# Enable auto-merge and delete branch on merge
echo "Configuring repository settings..."
gh repo edit "$owner/$repo_name" \
  --enable-auto-merge \
  --delete-branch-on-merge \
  || { echo "❌ Failed to enable auto-merge. Make sure you have the GitHub CLI installed and authenticated."; exit 1; }

echo "✅ Auto-merge enabled for $owner/$repo_name"
echo ""
echo "📋 Optional: Set up branch protection rules"
echo "   Run: gh repo edit $owner/$repo_name --default-branch main"
echo "   Then configure protection rules in the GitHub UI"
echo ""
echo "🎉 Done! Your Dependabot PRs will now auto-merge for minor and patch updates."