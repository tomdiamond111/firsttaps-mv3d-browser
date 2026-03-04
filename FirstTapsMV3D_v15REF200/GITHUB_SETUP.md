# GitHub Setup Guide for FirstTapsMV3D

## Prerequisites
- Git installed on your machine
- GitHub account created
- Access to this project folder: `C:\Users\tomdi\FirstTapsMV3D_v4b`

## Step-by-Step GitHub Setup

### 1. Initialize Git Repository (if not already done)
```powershell
# Navigate to project folder
cd C:\Users\tomdi\FirstTapsMV3D_v4b

# Initialize git (skip if already done)
git init

# Check status
git status
```

### 2. Create Repository on GitHub
1. Go to https://github.com
2. Click the "+" icon in top right → "New repository"
3. **Repository name**: `FirstTapsMV3D` (or your preferred name)
4. **Description**: "3D media organizer and furniture playlist app built with Flutter and Three.js"
5. **Visibility**: Choose Private or Public
6. **DO NOT** initialize with README, .gitignore, or license (you already have these)
7. Click "Create repository"

### 3. Configure Git User (if not already done)
```powershell
# Set your GitHub username
git config --global user.name "Your GitHub Username"

# Set your GitHub email
git config --global user.email "your-email@example.com"

# Verify configuration
git config --list
```

### 4. Review What Will Be Committed
```powershell
# Check what files will be added
git status

# The .gitignore file will exclude:
# - Build artifacts (/build/, /android/app/release, etc.)
# - IDE files (.idea/, *.iml)
# - Dart/Flutter caches (.dart_tool/, .pub/)
# - Log files (*.log)
```

### 5. Stage and Commit Your Code
```powershell
# Add all files (respecting .gitignore)
git add .

# Check what's staged
git status

# Create first commit
git commit -m "Initial commit: 3D media organizer with furniture sharing"
```

### 6. Connect to GitHub Repository
**Replace YOUR_USERNAME with your actual GitHub username:**
```powershell
# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/FirstTapsMV3D.git

# Verify remote was added
git remote -v
```

### 7. Push to GitHub
```powershell
# Push to main branch (GitHub's default branch name)
git branch -M main
git push -u origin main
```

**If you get an authentication error**, you'll need to use a Personal Access Token (PAT):
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` permissions
3. Use the token as your password when prompted

**Or use GitHub CLI for easier authentication:**
```powershell
# Install GitHub CLI: https://cli.github.com/
# Then authenticate:
gh auth login
```

### 8. Verify Upload
1. Go to https://github.com/YOUR_USERNAME/FirstTapsMV3D
2. You should see all your code files
3. Check that sensitive files (key.properties, build artifacts) are NOT visible

## Important Files to Protect

### Already Protected by .gitignore ✅
- `/build/` - Build artifacts
- `/android/app/release` - Release builds
- `.dart_tool/` - Dart tooling cache
- `*.log` - Log files

### CRITICAL: Check These Files Are NOT in Repository
Before pushing, verify these are excluded:
- `android/key.properties` - Signing keys
- `android/app/*.jks` - Keystore files
- Any API keys or secrets

## Future Git Workflow

### Daily Workflow
```powershell
# Pull latest changes (if working with others)
git pull

# Check what changed
git status

# Stage specific files
git add path/to/file.dart

# Or stage all changes
git add .

# Commit with descriptive message
git commit -m "Add furniture sharing feature"

# Push to GitHub
git push
```

### Create Branches for Features
```powershell
# Create and switch to new branch
git checkout -b feature/camera-controls

# Work on feature...

# Commit changes
git add .
git commit -m "Add directional camera controls"

# Push branch to GitHub
git push -u origin feature/camera-controls

# Merge to main when ready (on GitHub via Pull Request)
```

### Useful Git Commands
```powershell
# View commit history
git log --oneline

# See what changed in a file
git diff path/to/file.dart

# Undo unstaged changes
git checkout -- path/to/file.dart

# Undo last commit (keep changes)
git reset --soft HEAD~1

# View remote repository URL
git remote -v

# Create .gitignore for specific files
echo "android/key.properties" >> .gitignore
```

## Troubleshooting

### Error: "remote origin already exists"
```powershell
# Remove existing remote
git remote remove origin

# Add correct remote
git remote add origin https://github.com/YOUR_USERNAME/FirstTapsMV3D.git
```

### Error: "failed to push refs"
```powershell
# Pull first (if repository has files)
git pull origin main --allow-unrelated-histories

# Then push
git push -u origin main
```

### Large Files Warning
If you get warnings about large files:
```powershell
# Check file sizes
git ls-files | xargs du -h | sort -rh | head -20

# Use Git LFS for large assets (if needed)
git lfs install
git lfs track "*.mp4"
git lfs track "*.mp3"
git add .gitattributes
```

## Repository Best Practices

### Commit Message Guidelines
- **feat:** New feature (e.g., "feat: add furniture sharing")
- **fix:** Bug fix (e.g., "fix: resolve mp3 duplication bug")
- **docs:** Documentation (e.g., "docs: update README")
- **refactor:** Code restructuring (e.g., "refactor: extract share manager")
- **test:** Add tests (e.g., "test: add share URL validation")

### What to Commit
✅ **DO commit:**
- Source code (.dart files)
- Assets (images, HTML files, JS bundles)
- Documentation (.md files)
- Configuration files (pubspec.yaml, analysis_options.yaml)

❌ **DON'T commit:**
- Build artifacts (/build/)
- IDE-specific files (.idea/)
- API keys or secrets
- Large binary files (use Git LFS if needed)
- Local configuration (key.properties)

## Next Steps After Initial Push

1. **Add README.md** with project description
2. **Add LICENSE** file if making public
3. **Create GitHub Actions** for automated builds (optional)
4. **Set up branch protection** rules for main branch
5. **Add collaborators** if working with a team

## GitHub Features to Explore

- **Issues**: Track bugs and feature requests
- **Projects**: Kanban board for task management
- **Wiki**: Additional documentation
- **Releases**: Tag versions for distribution
- **Actions**: CI/CD automation

## Support

If you need help:
- Git documentation: https://git-scm.com/doc
- GitHub guides: https://guides.github.com/
- GitHub CLI: https://cli.github.com/manual/

---

**Ready to start!** Run the commands in order, and you'll have your code safely backed up on GitHub.
