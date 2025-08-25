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
  echo "❌ Error: Database '$DB_NAME' does not exist."
  exit 1
fi

# 4. Check if at least one table name is provided
if [ $# -eq 0 ]; then
  echo "Usage: sudo $0 <table1> [table2 ...]"
  exit 1
fi

TABLES_TO_BACKUP=()
for TABLE in "$@"; do
  echo "Checking if table '$TABLE' exists in database '$DB_NAME'..."
  TABLE_EXISTS=$(mysql -u"$DB_USER" -p"$DB_PASS" -D "$DB_NAME" -e "SHOW TABLES LIKE '${TABLE}';" | grep "$TABLE")
  
  if [ -z "$TABLE_EXISTS" ]; then
    echo "⚠️  Warning: Table '$TABLE' does not exist in '$DB_NAME'. Skipping..."
  else
    TABLES_TO_BACKUP+=("$TABLE")
  fi
done

# If no valid tables found, exit
if [ ${#TABLES_TO_BACKUP[@]} -eq 0 ]; then
  echo "❌ No valid tables found to backup. Exiting."
  exit 1
fi

# 5. Build safe filename with table names + date
DATE=$(date +%F_%H-%M-%S)
TABLE_NAMES=$(echo "${TABLES_TO_BACKUP[@]}" | tr ' ' '_')   # replace spaces with underscores
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TABLE_NAMES}_backup_$DATE.sql"

echo "Starting backup of tables: ${TABLES_TO_BACKUP[*]} from database '$DB_NAME'..."

# 6. Run mysqldump for specific tables
mysqldump -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" "${TABLES_TO_BACKUP[@]}" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup of tables [${TABLES_TO_BACKUP[*]}] completed successfully."
  echo "📂 File saved at: $BACKUP_FILE"
else
  echo "❌ Backup failed!"
  exit 1
fi
