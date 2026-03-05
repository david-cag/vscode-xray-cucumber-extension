#!/bin/bash

# VS Code Extension Release Helper Script
# This script helps create tags for automatic releases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Function to get current version from package.json
get_current_version() {
    node -p "require('./package.json').version"
}

# Function to update version in package.json
update_version() {
    local new_version=$1
    npm version $new_version --no-git-tag-version
}

print_color $BLUE "🚀 VS Code Extension Release Helper"
print_color $BLUE "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_color $RED "❌ Error: package.json not found. Run this script from the extension root directory."
    exit 1
fi

# Check if git is clean
if [ -n "$(git status --porcelain)" ]; then
    print_color $YELLOW "⚠️  Warning: You have uncommitted changes. Please commit or stash them first."
    git status --short
    echo
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

current_version=$(get_current_version)
print_color $GREEN "📦 Current version: $current_version"

echo
print_color $YELLOW "Select release type:"
echo "1) Patch (bug fixes) - e.g., 0.0.1 → 0.0.2"
echo "2) Minor (new features) - e.g., 0.0.1 → 0.1.0"
echo "3) Major (breaking changes) - e.g., 0.0.1 → 1.0.0"
echo "4) Alpha pre-release - e.g., 0.0.1 → 0.0.2-alpha.1"
echo "5) Beta pre-release - e.g., 0.0.1 → 0.0.2-beta.1"
echo "6) Release Candidate - e.g., 0.0.1 → 0.0.2-rc.1"
echo "7) Custom version"
echo "8) Just create tag for current version"

read -p "Enter your choice (1-8): " choice

case $choice in
    1)
        new_version="patch"
        ;;
    2)
        new_version="minor"
        ;;
    3)
        new_version="major"
        ;;
    4)
        new_version="prerelease --preid=alpha"
        ;;
    5)
        new_version="prerelease --preid=beta"
        ;;
    6)
        new_version="prerelease --preid=rc"
        ;;
    7)
        read -p "Enter custom version (e.g., 1.2.3): " custom_version
        new_version="$custom_version"
        ;;
    8)
        new_version=""
        ;;
    *)
        print_color $RED "❌ Invalid choice"
        exit 1
        ;;
esac

# Update version if needed
if [ "$choice" != "8" ]; then
    print_color $BLUE "📝 Updating version..."
    update_version $new_version
    updated_version=$(get_current_version)
    print_color $GREEN "✅ Version updated to: $updated_version"
    
    # Commit the version change
    git add package.json
    git commit -m "chore: bump version to $updated_version"
    
    tag_version="v$updated_version"
else
    tag_version="v$current_version"
    updated_version="$current_version"
fi

# Create and push tag
print_color $BLUE "🏷️  Creating tag: $tag_version"
git tag $tag_version

print_color $YELLOW "🚀 Ready to release!"
echo "Tag created: $tag_version"
echo
echo "To trigger the release, push the tag:"
print_color $GREEN "git push origin $tag_version"
echo
echo "Or push everything including the version commit:"
print_color $GREEN "git push origin $(git branch --show-current) && git push origin $tag_version"

read -p "Do you want to push the tag now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_color $BLUE "📤 Pushing tag..."
    git push origin $(git branch --show-current) 2>/dev/null || true  # Push current branch if possible
    git push origin $tag_version
    
    print_color $GREEN "✅ Tag pushed! Check GitHub Actions for the release workflow."
    print_color $BLUE "🔗 Monitor progress: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions"
else
    print_color $YELLOW "⏳ Tag created but not pushed. Run this when ready:"
    print_color $GREEN "git push origin $tag_version"
fi