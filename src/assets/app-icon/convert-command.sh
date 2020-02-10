#!/bin/bash

echo "magick convert  -density 200 -background none icon.svg -define icon:auto-resize favicon.ico"
magick convert  -density 200 -background none icon.svg -define icon:auto-resize favicon.ico

for i in 512 192 180 144 96 48 32 16
do
echo "magick convert -density 200 -background none icon.svg  -resize x$i icon-$i.png"
magick convert -density 200 -background none icon.svg  -resize x$i icon-$i.png
done

exit 0