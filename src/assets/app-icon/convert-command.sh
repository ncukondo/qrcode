#!/bin/bash

echo "Converting... icon.svg => favicon.ico"
magick convert  -density 200 -background none icon.svg -define icon:auto-resize favicon.ico

for i in 512 192 180 144 96 48 32 16
do
echo "Converting... icon.svg => icon-$i.png"
magick convert -density 200 -background none icon.svg  -resize x$i icon-$i.png
done

exit 0