#!/bin/bash

# 1. Check sudo access
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root using sudo"
  exit 1
fi

# 2. DB credentials
DB_USER="root"
DB_PASS="mysql"
DB_NAME="fineract_unique"
BACKUP_DIR="/home/ubuntu/db_bckup"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# 3. Check if DB exists
echo "Checking if database '$DB_NAME' exists..."
DB_EXISTS=$(mysql -u"$DB_USER" -p"$DB_PASS" -e "SHOW DATABASES LIKE '${DB_NAME}';" | grep "$DB_NAME")

if [ -z "$DB_EXISTS" ]; then
  echo "Error: Database '$DB_NAME' does not exist."
  exit 1
fi

# 4. Filename with today's date
DATE=$(date +%F_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_$DATE.sql"

echo "Starting backup of database '$DB_NAME'..."

# 5. Run mysqldump with routines (procedures/functions) included
mysqldump -u"$DB_USER" -p"$DB_PASS" --routines --databases "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup completed successfully."
  echo "File saved at: $BACKUP_FILE"
else
  echo "Backup failed!"
  exit 1
fi
