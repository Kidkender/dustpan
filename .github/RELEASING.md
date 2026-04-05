# Release Guide

Step-by-step instructions for publishing a new version of Dustpan.

---

## Prerequisites

- You have push access to the `main` branch and can create tags
- Your local `main` is up to date: `git pull origin main`

---

## Steps

### 1. Decide the version number

Follow [Semantic Versioning](https://semver.org/):

| Change type                              | Example            |
|------------------------------------------|--------------------|
| Bug fixes only                           | `0.1.0` → `0.1.1` |
| New features, backward-compatible        | `0.1.0` → `0.2.0` |
| Breaking changes / major redesign        | `0.1.0` → `1.0.0` |

---

### 2. Update CHANGELOG.md

Open `CHANGELOG.md` and add a new section above the previous release:

```markdown
## [0.2.0] — YYYY-MM-DD

### Added
- Description of new features

### Fixed
- Description of bug fixes

### Changed
- Description of changes to existing behavior

### Removed
- Description of removed features
```

Then update the comparison links at the bottom of the file:

```markdown
[Unreleased]: https://github.com/kidkender/dustpan/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/kidkender/dustpan/compare/v0.1.0...v0.2.0
```

---

### 3. Update the version number

Edit **two files**:

**`src-tauri/tauri.conf.json`** — line 2:
```json
"version": "0.2.0",
```

**`src-tauri/Cargo.toml`** — line 3:
```toml
version = "0.2.0"
```

---

### 4. Commit the changes

```bash
git add CHANGELOG.md src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "release: v0.2.0"
git push origin main
```

---

### 5. Create and push the tag

```bash
git tag v0.2.0
git push origin v0.2.0
```

This triggers the GitHub Actions workflow (`.github/workflows/release.yml`).

---

### 6. Wait for the build to finish

Go to **GitHub → Actions** and watch the `Release` workflow.
Build time is approximately **10–15 minutes**.

If the build fails, fix the issue, delete the tag, and re-tag:

```bash
# Delete tag locally and remotely
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0

# Fix the issue, commit, then re-tag
git tag v0.2.0
git push origin v0.2.0
```

---

### 7. Publish the release

1. Go to **GitHub → Releases**
2. Find the new **Draft** release named `Dustpan v0.2.0`
3. Review the release notes (edit if needed)
4. Click **Publish release**

The release will now be public with the `.msi` and `.exe` installers attached.

---

## Release checklist

```
[ ] CHANGELOG.md updated with new section
[ ] Version bumped in tauri.conf.json
[ ] Version bumped in src-tauri/Cargo.toml
[ ] Changes committed and pushed to main
[ ] Tag created and pushed (git tag vX.X.X && git push origin vX.X.X)
[ ] GitHub Actions build passed
[ ] Draft release reviewed and published
```

---

## Installer locations (after build)

| File | Description |
|------|-------------|
| `Dustpan_X.X.X_x64_en-US.msi` | Windows Installer (recommended) |
| `Dustpan_X.X.X_x64-setup.exe` | NSIS standalone installer |

Both files are automatically attached to the GitHub Release by the workflow.
