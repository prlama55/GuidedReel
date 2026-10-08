#!/bin/sh
# GuidedReel desktop installer for macOS and Linux (no developer tools needed).
#
#   curl -fsSL https://github.com/prlama55/GuidedReel/raw/main/scripts/install.sh | sh
#
# Options (append after "sh -s --" when piping, e.g. `| sh -s -- --version v0.2.0`):
#   --version <tag>   Install a specific release tag instead of the latest (e.g. v0.2.0)
#   --dir <path>      Install location (macOS default: /Applications or ~/Applications;
#                     Linux AppImage default: ~/.local/bin)
#   --file <path>     Install from a downloaded .dmg / .AppImage / .deb instead of fetching
#   --deb             Linux: install the .deb with the package manager (needs sudo)
#   --appimage        Linux: install the AppImage (default)
#   --no-open         Do not launch the app afterwards
#   -h, --help        Show this help
#
# Environment: GUIDEDREEL_VERSION, GUIDEDREEL_REPO_URL override the defaults.
set -eu

APP_NAME="GuidedReel"
REPO_URL="${GUIDEDREEL_REPO_URL:-https://github.com/prlama55/GuidedReel}"
VERSION="${GUIDEDREEL_VERSION:-latest}"
INSTALL_DIR=""
FILE=""
OPEN_APP=1
LINUX_FORMAT="appimage"

usage() { sed -n '2,17p' "$0" 2>/dev/null || printf 'See %s#readme\n' "$REPO_URL"; }
log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "'$1' is required but not installed."; }

while [ $# -gt 0 ]; do
  case "$1" in
    --version) VERSION="$2"; shift 2 ;;
    --version=*) VERSION="${1#*=}"; shift ;;
    --dir) INSTALL_DIR="$2"; shift 2 ;;
    --dir=*) INSTALL_DIR="${1#*=}"; shift ;;
    --file) FILE="$2"; shift 2 ;;
    --file=*) FILE="${1#*=}"; shift ;;
    --deb) LINUX_FORMAT="deb"; shift ;;
    --appimage) LINUX_FORMAT="appimage"; shift ;;
    --no-open) OPEN_APP=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown option: $1 (try --help)" ;;
  esac
done

OWNER_REPO="${REPO_URL#https://github.com/}"
OWNER_REPO="${OWNER_REPO%/}"
case "$OWNER_REPO" in */*) ;; *) fail "GUIDEDREEL_REPO_URL must look like https://github.com/owner/repo" ;; esac

OS="$(uname -s)"
case "$OS" in
  Darwin) OS="mac" ;;
  Linux) OS="linux" ;;
  *) fail "Unsupported system: $OS. Windows users: see $REPO_URL#download-the-desktop-app" ;;
esac

ARCH="$(uname -m)"
case "$ARCH" in
  arm64|aarch64) ARCH="arm64"; ARCH_PATTERN='arm64|aarch64' ;;
  x86_64|amd64) ARCH="x64"; ARCH_PATTERN='x64|x86_64|amd64' ;;
  *) fail "Unsupported CPU architecture: $ARCH" ;;
esac

TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t guidedreel)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT INT TERM

# ---------- download helpers ----------

http_get() {
  # $1 url, $2 output file ("-" for stdout)
  if command -v curl >/dev/null 2>&1; then
    if [ "$2" = "-" ]; then curl -fsSL "$1"; else curl -fL --progress-bar -o "$2" "$1"; fi
  elif command -v wget >/dev/null 2>&1; then
    if [ "$2" = "-" ]; then wget -qO- "$1"; else wget -q --show-progress -O "$2" "$1"; fi
  else
    fail "curl or wget is required."
  fi
}

release_assets() {
  api_base="https://api.github.com/repos/$OWNER_REPO/releases"
  if [ "$VERSION" = "latest" ]; then
    api="$api_base/latest"
    # /releases/latest ignores releases flagged "pre-release" (common for 0.x builds), so fall
    # back to the newest published release of any kind. Drafts never appear in the public list.
    json="$(http_get "$api" - 2>/dev/null)" || {
      tag="$(http_get "$api_base?per_page=20" - 2>/dev/null | grep -o '"tag_name": *"[^"]*"' | head -n 1 | sed 's/.*"\([^"]*\)"$/\1/')"
      [ -n "$tag" ] || fail "No published release found at $api.
Releases: $REPO_URL/releases"
      api="$api_base/tags/$tag"
      json="$(http_get "$api" - 2>/dev/null)" || fail "Could not read release $tag ($api)."
    }
  else
    case "$VERSION" in v*) tag="$VERSION" ;; *) tag="v$VERSION" ;; esac
    api="$api_base/tags/$tag"
    json="$(http_get "$api" - 2>/dev/null)" || fail "No published release found at $api.
Releases: $REPO_URL/releases"
  fi
  printf '%s\n' "$json" | grep -o '"browser_download_url": *"[^"]*"' | sed 's/.*"\(http[^"]*\)"/\1/'
}

pick_asset() {
  # $1 newline-separated urls, $2 extended regex (case-insensitive) on the file name
  printf '%s\n' "$1" | grep -i -E "$2" | head -n 1
}

# ---------- platform installers ----------

install_mac() {
  dmg="$1"
  need hdiutil
  if [ -z "$INSTALL_DIR" ]; then
    if [ -w /Applications ]; then INSTALL_DIR="/Applications"; else INSTALL_DIR="$HOME/Applications"; fi
  fi
  mkdir -p "$INSTALL_DIR"

  log "Opening disk image"
  mount_point="$(hdiutil attach -nobrowse -readonly -noautoopen "$dmg" | awk -F'\t' '/\/Volumes\//{print $NF}' | tail -n 1)"
  [ -n "$mount_point" ] || fail "Could not mount $dmg"
  app_src="$(find "$mount_point" -maxdepth 1 -name '*.app' | head -n 1)"
  [ -n "$app_src" ] || { hdiutil detach "$mount_point" -quiet || true; fail "No .app found inside the disk image."; }
  app_dst="$INSTALL_DIR/$(basename "$app_src")"

  if [ -d "$app_dst" ]; then
    log "Replacing existing $app_dst"
    if pgrep -x "$APP_NAME" >/dev/null 2>&1; then
      warn "$APP_NAME is running; quitting it first."
      osascript -e "tell application \"$APP_NAME\" to quit" >/dev/null 2>&1 || true
      sleep 2
    fi
    rm -rf "$app_dst"
  fi
  log "Copying to $INSTALL_DIR"
  ditto "$app_src" "$app_dst"
  hdiutil detach "$mount_point" -quiet || true

  # Beta builds are not notarized. macOS would refuse to open a quarantined, unsigned app,
  # so clear the flag on the copy you just chose to install.
  if xattr -p com.apple.quarantine "$app_dst" >/dev/null 2>&1; then
    log "Marking the app as trusted (clearing the quarantine flag; this build is not notarized)"
    xattr -dr com.apple.quarantine "$app_dst" 2>/dev/null || warn "Could not clear quarantine; right-click the app and choose Open."
  fi

  log "Installed $app_dst"
  [ "$OPEN_APP" -eq 1 ] && open "$app_dst"
  return 0
}

install_linux_appimage() {
  src="$1"
  [ -n "$INSTALL_DIR" ] || INSTALL_DIR="$HOME/.local/bin"
  mkdir -p "$INSTALL_DIR"
  dst="$INSTALL_DIR/$(printf '%s' "$APP_NAME" | tr -d ' ').AppImage"
  log "Installing AppImage to $dst"
  cp "$src" "$dst"
  chmod +x "$dst"

  slug="$(printf '%s' "$APP_NAME" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9\n' '-')"
  icon_dir="$HOME/.local/share/icons/hicolor/512x512/apps"
  mkdir -p "$icon_dir" "$HOME/.local/share/applications"
  icon_url="$REPO_URL/raw/main/apps/desktop/build/icon.png"
  if http_get "$icon_url" "$icon_dir/$slug.png" 2>/dev/null; then icon="$slug"; else icon="video-x-generic"; fi
  cat >"$HOME/.local/share/applications/$slug.desktop" <<DESKTOP
[Desktop Entry]
Name=$APP_NAME
Comment=Script-to-video creator
Exec="$dst" %U
Icon=$icon
Terminal=false
Type=Application
Categories=AudioVideo;Video;
StartupWMClass=$APP_NAME
DESKTOP
  command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true

  case ":$PATH:" in *":$INSTALL_DIR:"*) ;; *) warn "$INSTALL_DIR is not on your PATH; start the app from your application menu or run $dst" ;; esac
  log "Installed $dst (application menu entry added)"
  if [ "$OPEN_APP" -eq 1 ] && [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
    nohup "$dst" >/dev/null 2>&1 &
  fi
  printf 'If it does not start, install FUSE: sudo apt install libfuse2 (Ubuntu/Debian).\n'
}

install_linux_deb() {
  deb="$1"
  need sudo
  log "Installing package (sudo may ask for your password)"
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get install -y "$deb"
  elif command -v dpkg >/dev/null 2>&1; then
    sudo dpkg -i "$deb" || sudo apt-get -f install -y
  else
    fail "This system has no dpkg; use --appimage instead."
  fi
  log "Installed $APP_NAME"
  if [ "$OPEN_APP" -eq 1 ] && [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
    slug="$(printf '%s' "$APP_NAME" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9\n' '-')"
    command -v "$slug" >/dev/null 2>&1 && nohup "$slug" >/dev/null 2>&1 &
  fi
}

# ---------- main ----------

log "$APP_NAME installer for $OS ($ARCH)"

if [ -n "$FILE" ]; then
  [ -f "$FILE" ] || fail "File not found: $FILE"
  installer="$FILE"
else
  log "Looking up release ($VERSION) from $REPO_URL"
  assets="$(release_assets)"
  [ -n "$assets" ] || fail "The release has no downloadable files yet. See $REPO_URL/releases"
  case "$OS" in
    mac)
      url="$(pick_asset "$assets" "($ARCH_PATTERN)[^/]*\.dmg$")"
      # Older builds name the Intel image without an architecture suffix.
      [ -n "$url" ] || [ "$ARCH" != "x64" ] || url="$(printf '%s\n' "$assets" | grep -i -E '\.dmg$' | grep -i -v arm64 | head -n 1)"
      ;;
    linux)
      if [ "$LINUX_FORMAT" = "deb" ]; then
        url="$(pick_asset "$assets" "($ARCH_PATTERN)[^/]*\.deb$")"
      else
        url="$(pick_asset "$assets" "($ARCH_PATTERN)[^/]*\.AppImage$")"
        [ -n "$url" ] || url="$(pick_asset "$assets" '\.AppImage$')"
      fi
      ;;
  esac
  [ -n "$url" ] || fail "No installer for $OS/$ARCH in this release. Available files: $REPO_URL/releases"
  installer="$TMP_DIR/$(basename "$url")"
  log "Downloading $(basename "$url")"
  http_get "$url" "$installer"
fi

case "$installer" in
  *.dmg) [ "$OS" = "mac" ] || fail "A .dmg can only be installed on macOS."; install_mac "$installer" ;;
  *.AppImage) [ "$OS" = "linux" ] || fail "An AppImage can only be installed on Linux."; install_linux_appimage "$installer" ;;
  *.deb) [ "$OS" = "linux" ] || fail "A .deb can only be installed on Linux."; install_linux_deb "$installer" ;;
  *) fail "Unsupported installer file: $installer" ;;
esac

printf '\nDone. User guide: %s/blob/main/docs/user-guide/README.md\n' "$REPO_URL"
