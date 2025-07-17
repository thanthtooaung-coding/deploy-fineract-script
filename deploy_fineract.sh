#!/bin/bash

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root using sudo"
  exit 1
fi

echo "Stopping Tomcat..."
systemctl stop tomcat

echo "Removing old Fineract deployment..."
rm -rf /opt/tomcat/webapp/fineract /opt/tomcat/webapp/fineract.war

echo "Moving new WAR file..."
mv /home/ubuntu/fineract-provider.war /opt/tomcat/webapp/fineract.war

echo "Starting Tomcat..."
systemctl start tomcat

echo "Deployment complete."
