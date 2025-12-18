# Setup Guide

This guide will walk you through setting up the development environment for the application, including Oracle database, Keycloak, and all required services.

## Table of Contents

- [Prerequisites](#prerequisites)
- [1. Import Oracle Docker Image](#1-import-oracle-docker-image)
- [2. Create Database Users](#2-create-database-users)
- [3. Configure Keycloak](#3-configure-keycloak)
- [4. Configure JOBONIC_JWT_PUBLICKEY](#4-configure-jobonic_jwt_publickey)
- [5. Run Application Services](#5-run-application-services)
- [Verification Checklist](#verification-checklist)
- [Troubleshooting](#troubleshooting)
- [Notes](#notes)

---

## Prerequisites

- Docker installed and running
- Oracle Docker image file (`oracle12c.tar`)
- Access to run Docker commands

---

## 1. Import Oracle Docker Image

### Step 1.1: Create Docker Volume

Create a persistent volume for Oracle data:

```bash
docker volume create oracle-data
```

### Step 1.2: Load Oracle Image

Load the Oracle Docker image from the tar file:

```bash
docker load -i oracle12c.tar
```

### Step 1.3: Verify Image

Verify that the image was loaded successfully:

```bash
docker images | grep oracle
```

**Expected output:** You should see `k8ngkiat/oracle-12c` in the list.

### Step 1.4: Run Oracle Container

Start the Oracle database container:

```bash
docker run -d \
  --name oracle12c \
  -p 1521:1521 \
  -e ORACLE_PASSWORD=12345 \
  -e ORACLE_PDB=ORCLPDB1 \
  -v oracle-data:/u01/app/oracle/oradata \
  --shm-size=1g \
  k8ngkiat/oracle-12c
```

**Note:** The container will take a few minutes to initialize. Wait until it's fully started before proceeding.

---

## 2. Create Database Users

### Step 2.1: Access Oracle Container

Open a bash shell in the Oracle container:

```bash
docker exec -it oracle12c bash
```

### Step 2.2: Connect to Oracle Database

Connect to the Oracle database using SQL*Plus:

```bash
sqlplus system/12345@ORCLPDB1
```

### Step 2.3: Create Keycloak User

Create a database user for Keycloak:

```sql
CREATE USER keycloak IDENTIFIED BY keycloak;
GRANT ALL PRIVILEGES TO keycloak;
```

### Step 2.4: Create Authorize Server User

Create a database user for the Authorize Server:

```sql
CREATE USER authuser IDENTIFIED BY authpassword;
GRANT ALL PRIVILEGES TO authuser;
```

### Step 2.5: Create Jobonic User

Create a database user for Jobonic:

```sql
CREATE USER dbusername IDENTIFIED BY dbpassword;
GRANT ALL PRIVILEGES TO dbusername;
```

### Step 2.6: Exit SQL*Plus and Container

Exit SQL*Plus:

```sql
EXIT;
```

Exit the container:

```bash
exit
```

---

## 3. Configure Keycloak

### Step 3.1: Access Keycloak Administration Console

1. Open your browser and navigate to the Keycloak administration console (typically `http://localhost:8080` or the configured port)
2. Log in with your Keycloak administrator credentials

### Step 3.2: Create Admin User

1. Navigate to **Users** in the left sidebar
2. Click **Add user** button
3. Fill in the following details:
   - **Username:** `admin`
   - **Email:** `admin@gmail.com`
   - **Email verified:** `true` (toggle to enabled)
4. Click **Save**

### Step 3.3: Set User Password

1. Navigate to the **Credentials** tab (or **Password** tab)
2. Set the password to: `12345`
3. Toggle **Temporary** to `OFF` (so the password is permanent)
4. Click **Set Password** and confirm

### Step 3.4: Assign Roles to Admin User

1. Navigate to the **Role mapping** tab
2. Click the **Assign role** button
3. In the role assignment dialog, search for and select the following roles:
   - `default-roles-laconic`
   - `realm-management` → `view-clients`
   - `realm-management` → `manage-clients`
   - `realm-management` → `create-client`
   - `realm-management` → `query-clients`
4. Click **Assign** to confirm the role assignments
5. Verify that all roles appear in the role mapping table

**Note:** Make sure you are in the **LACONIC** realm when assigning these roles. The `realm-management` roles are client roles that need to be selected from the client roles section.

---

## 4. Configure JOBONIC_JWT_PUBLICKEY

### Step 4.1: Access Keycloak Realm Settings

1. Open the Keycloak administration console in your browser
2. In the top-left corner, click on the realm dropdown (it may show "master" or another realm name)
3. Select or change to the **LACONIC** realm

### Step 4.2: Navigate to Keys Section

1. In the left sidebar, click on **Realm settings**
2. Click on the **Keys** tab at the top of the page

### Step 4.3: Copy RS256 Public Key

1. In the Keys section, locate the **RS256** algorithm entry
2. Click on the **Public key** button or link for the RS256 key
3. Copy the entire public key that is displayed

### Step 4.4: Update Jobonic .env File

1. Navigate to the Jobonic directory:

```bash
cd Jobonic
```

2. Open or create the `.env` file in the Jobonic directory
3. Find or add the `JOBONIC_JWT_PUBLICKEY` variable
4. Paste the copied public key as the value:

```env
JOBONIC_JWT_PUBLICKEY=<paste the copied public key here>
```

**Note:** The public key should be a single line string. If it appears with line breaks in Keycloak, ensure you copy it as a continuous string or format it properly in the .env file.

---

## 5. Run Application Services

Start the following services in order:

### Step 5.1: Run Spring Cloud

Navigate to the spring-cloud directory and start the service:

```bash
cd spring-cloud
# Follow the service-specific startup instructions
```

### Step 5.2: Run Authorize Server

Navigate to the authorize-server directory and start the service:

```bash
cd authorize-server
# Follow the service-specific startup instructions
```

### Step 5.3: Run Jobonic

Navigate to the Jobonic directory and start the service:

```bash
cd Jobonic
# Follow the service-specific startup instructions
```

---

## Verification Checklist

- [ ] Oracle container is running (`docker ps | grep oracle12c`)
- [ ] Database users created (keycloak, authuser, dbusername)
- [ ] Keycloak admin user created with email `admin@gmail.com`
- [ ] Keycloak admin password set to `12345`
- [ ] Required roles assigned to admin user (default-roles-laconic, realm-management roles)
- [ ] LACONIC realm selected in Keycloak
- [ ] RS256 public key copied from Keycloak realm settings
- [ ] `JOBONIC_JWT_PUBLICKEY` configured in Jobonic .env file
- [ ] Spring Cloud service is running
- [ ] Authorize Server is running
- [ ] Jobonic service is running

---

## Troubleshooting

### Oracle Container Issues

- **Container won't start:** Check Docker logs with `docker logs oracle12c`
- **Connection refused:** Wait a few minutes for Oracle to fully initialize
- **Port already in use:** Ensure port 1521 is not being used by another service

### Database Connection Issues

- Verify the container is running: `docker ps`
- Check Oracle logs: `docker logs oracle12c`
- Ensure you're connecting to the correct PDB: `ORCLPDB1`

### Keycloak Issues

- Verify Keycloak is accessible in your browser
- Check that the admin user was created successfully
- Ensure email verification is enabled

---

## Notes

- The Oracle container may take 5-10 minutes to fully initialize on first startup
- Keep the Oracle container running while developing
- Database credentials are set as shown above - change them in production environments
- Ensure all services can reach the Oracle database on `localhost:1521`

