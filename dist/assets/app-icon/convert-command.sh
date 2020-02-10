#!/bin/bash

magick convert  -density 200 -background none icon.svg -define icon:auto-resize favicon.ico
for i in 512 192 144 96 48 32 16
do
echo "magick convert  -density 200 -background none icon.svg -resize x$i -write icon-$i.png"
magick convert  -density 200 -background none icon.svg -resize x$i -write icon-$i.png
done

exit 0