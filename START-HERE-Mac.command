#!/bin/bash
cd "$(dirname "$0")" || exit 1
clear
echo
echo "  ============================================================"
echo "    PDF Flipbook"
echo "  ============================================================"
echo

pause_and_exit() {
  echo
  read -r -p "  Press Enter to close this window..."
  exit "$1"
}

if [ ! -f package.json ]; then
  echo "  This file must stay inside the pdf-flipbook folder."
  echo "  Please unzip the ZIP file first, then try again."
  pause_and_exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "  Node.js is not installed on this computer yet."
  echo
  echo "  1. A website will open now. Click the big green button that says LTS."
  echo "  2. Open the file that downloads and click Continue until it finishes."
  echo "  3. Then double-click this START-HERE file again."
  open "https://nodejs.org"
  pause_and_exit 1
fi

if [ ! -d node_modules ]; then
  echo "  First-time setup: downloading what the app needs."
  echo "  This can take 2 to 5 minutes. Please wait and do not close this window."
  echo
  if ! npm install; then
    echo
    echo "  Something went wrong during the first-time setup."
    echo "  Check that you are connected to the internet and try again."
    echo "  If it still fails, take a screenshot of this window and send it"
    echo "  to the person who shared this with you."
    pause_and_exit 1
  fi
fi

npm start
echo
echo "  The app has stopped. You can close this window."
pause_and_exit 0
