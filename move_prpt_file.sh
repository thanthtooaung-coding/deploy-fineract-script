#!/bin/bash

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root using sudo"
  exit 1
fi

SOURCE_DIR="/home/ubuntu"
TARGET_DIR="/opt/tomcat/webapps/FineractPentahoPlugin-1.10/MariaDB/pentahoReports"

for file in "$SOURCE_DIR"/*.prpt; do
    filename=$(basename "$file")

    if [ -f "$TARGET_DIR/$filename" ]; then
        echo "Removing existing $filename in target directory"
        rm -f "$TARGET_DIR/$filename"
    fi

    echo "Moving $filename to $TARGET_DIR"
    mv "$file" "$TARGET_DIR/"
done

echo "Done."
