#!/bin/bash
# Нарезка видео пролёта в кадры для прокрутки на скролле.
# Использование: bash tools/video2frames.sh путь/к/видео.mp4 [кадров=120]
#   W=1920 — ширина кадра (по умолчанию ширина исходника, без растягивания)
#   Q=88   — качество WebP
# Результат: site/assets/flythrough/0001.webp ... и manifest.json
set -euo pipefail
SRC="$1"; N="${2:-120}"; Q="${Q:-88}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/site/assets/flythrough"
TMP="$(mktemp -d)"
rm -rf "$OUT"; mkdir -p "$OUT"
SW=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$SRC")
W="${W:-$SW}"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
FPS=$(python3 -c "print(round($N/$DUR,4))")
# без искусственной резкости: на сжатом исходнике она даёт ореолы
ffmpeg -v error -i "$SRC" -vf "fps=$FPS,scale=$W:-2:flags=lanczos" "$TMP/%04d.png"
for f in "$TMP"/*.png; do cwebp -q "$Q" -m 6 -quiet "$f" -o "$OUT/$(basename "${f%.png}").webp"; done
rm -rf "$TMP"
COUNT=$(ls "$OUT"/*.webp | wc -l | tr -d ' ')
H=$(python3 -c "print(round($W*$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$SRC")/$SW))")
printf '{"count": %s, "width": %s, "height": %s, "pattern": "assets/flythrough/%%04d.webp"}\n' "$COUNT" "$W" "$H" > "$OUT/manifest.json"
du -sh "$OUT"; cat "$OUT/manifest.json"
