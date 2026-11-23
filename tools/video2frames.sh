#!/bin/bash
# Нарезка видео пролёта в кадры для прокрутки на скролле.
# Использование: bash tools/video2frames.sh путь/к/видео.mp4 [кадров=120]
# Результат: site/assets/flythrough/0001.jpg ... и manifest.json
set -euo pipefail
SRC="$1"; N="${2:-90}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/site/assets/flythrough"
rm -rf "$OUT"; mkdir -p "$OUT"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
FPS=$(python3 -c "print(round($N/$DUR,4))")
# 1600 по ширине, mjpeg q:v 6 (≈ 80–120 КБ кадр)
ffmpeg -v error -i "$SRC" -vf "fps=$FPS,scale=1600:-2:flags=lanczos" -q:v 6 "$OUT/%04d.jpg"
COUNT=$(ls "$OUT"/*.jpg | wc -l | tr -d ' ')
W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$OUT/0001.jpg")
H=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$OUT/0001.jpg")
printf '{"count": %s, "width": %s, "height": %s, "pattern": "assets/flythrough/%%04d.jpg"}\n' "$COUNT" "$W" "$H" > "$OUT/manifest.json"
du -sh "$OUT"; cat "$OUT/manifest.json"
