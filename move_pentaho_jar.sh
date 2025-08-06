#!/bin/bash

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root using sudo"
  exit 1
fi

echo "Stopping Tomcat..."
systemctl stop tomcat

echo "Copying pentaho jar files..."
cp /opt/tomcat/webapps/FineractPentahoPlugin-1.10/MariaDB/libs/*.jar /opt/tomcat/webapps/fineract-provider/WEB-INF/lib/

echo "Starting Tomcat..."
systemctl start tomcat

echo "Jar files copied complete."
