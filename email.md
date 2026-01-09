# Email Sending Guide for Laconic ERP System

## Overview

The Laconic ERP system has a built-in email functionality that uses:
- **Database-driven email queue**: Emails are stored in `EML_PENDING_MAIL` table
- **Background threads**: Two threads process emails automatically
- **SMTP server**: Currently configured to use `laconic.ipage.com` (port 587)

## System Architecture

### Components

1. **Email Queue Table**: `EML_PENDING_MAIL`
   - Stores pending emails with fields: EMAIL_ID, FROM_ADDR, TO_ADDR, SUBJECT, CONTENT, CREATION_DATE, SENT_FLAG

2. **Background Threads**:
   - `EmailGenerateThread`: Runs every 30 minutes, creates email alerts from scheduled reports
   - `EmailAlertThread`: Runs every 30 seconds, sends pending emails from the queue

3. **Database Package**: `EML_REPORT_PKG`
   - Contains procedures to create and manage emails

4. **SMTP Configuration**: Located in `EmailAlertThread.java`
   - Host: `laconic.ipage.com`
   - Port: `587`
   - Username: `joe.c@laconic.co.th`
   - Password: `@Joe1234`
   - Authentication: Enabled

## How to Send Emails

### Method 1: Using Database Procedure (Recommended)

Use the `EML_REPORT_PKG.CREATE_MANUAL_EMAIL_NOTICE` procedure to create emails:

```sql
DECLARE
    v_return_code NUMBER;
    v_return_message VARCHAR2(4000);
BEGIN
    EML_REPORT_PKG.CREATE_MANUAL_EMAIL_NOTICE(
        i_recipient_login_name => 'USER_LOGIN_NAME',  -- Login name from MOD_LOGIN table
        i_notice_subject => 'Your Email Subject',
        i_notice_content => 'Your email content here (HTML supported)',
        i_sql_command => NULL,  -- Optional: SQL query to append results to email
        o_return_code => v_return_code,
        o_return_message => v_return_message
    );
    
    DBMS_OUTPUT.PUT_LINE('Return Code: ' || v_return_code);
    DBMS_OUTPUT.PUT_LINE('Return Message: ' || v_return_message);
END;
/
```

**Parameters:**
- `i_recipient_login_name`: The login name of the recipient (must exist in MOD_LOGIN table)
- `i_notice_subject`: Email subject line
- `i_notice_content`: Email body content (HTML supported, optional)
- `i_sql_command`: Optional SQL query that returns VARCHAR2 results to append to email
- `o_return_code`: Returns 0 on success, -1 on error
- `o_return_message`: Returns status message

**Example:**
```sql
DECLARE
    v_return_code NUMBER;
    v_return_message VARCHAR2(4000);
BEGIN
    EML_REPORT_PKG.CREATE_MANUAL_EMAIL_NOTICE(
        i_recipient_login_name => 'admin',
        i_notice_subject => 'System Notification',
        i_notice_content => '<h1>Hello</h1><p>This is a test email.</p>',
        i_sql_command => NULL,
        o_return_code => v_return_code,
        o_return_message => v_return_message
    );
END;
/
```

### Method 2: Direct Insert into Email Queue

You can directly insert into `EML_PENDING_MAIL` table:

```sql
INSERT INTO EML_PENDING_MAIL (
    EMAIL_ID,
    FROM_ADDR,
    TO_ADDR,
    SUBJECT,
    CONTENT,
    CREATION_DATE,
    SENT_FLAG
) VALUES (
    EML_PENDING_MAIL_SEQ.NEXTVAL,
    'ERP@laconic.com',  -- From address
    'recipient@example.com',  -- To address
    'Email Subject',
    'Email content (HTML supported)',
    SYSDATE,
    'N'  -- N = not sent, Y = sent
);
COMMIT;
```

**Note**: The `EmailAlertThread` will automatically pick up and send emails where `SENT_FLAG = 'N'`.

## Email Configuration

### Enable/Disable Email System

Edit `source/laconic/web/WEB-INF/web.xml`:

```xml
<context-param>
    <param-name>enableEmail</param-name>
    <param-value>true</param-value>  <!-- Set to true to enable -->
</context-param>

<listener>
    <listener-class>com.laconic.listener.servlet.ServletEmailAlert</listener-class>
</listener>
```

Currently, the email system is **disabled** (set to `false` and listener is commented out).

### SMTP Configuration

To change SMTP settings, edit `source/laconic/src/com/laconic/listener/thread/EmailAlertThread.java`:

**Current Configuration (lines 186-224):**
```java
String host = "laconic.ipage.com";
final String username = "joe.c@laconic.co.th";
final String password = "@Joe1234";
properties.put("mail.smtp.auth", "true");
properties.put("mail.smtp.host", "laconic.ipage.com");
properties.put("mail.smtp.port", "587");
```

**Alternative: Gmail SMTP (commented out in code):**
```java
final String username = "addminlaconic@gmail.com";
final String password = "adminlaconic001";
properties.put("mail.smtp.host", "smtp.gmail.com");
properties.put("mail.smtp.port", "587");
properties.put("mail.smtp.auth", "true");
properties.put("mail.smtp.starttls.enable", "true");
```

### Email Parameters (Database)

The system uses `EML_PARAMETER` table for configuration:
- `FROM-ADDRESS`: Default sender email (defaults to 'ERP@laconic.com')
- `DEFAULT-HEADER`: Email header template
- `DEFAULT-FOOTER`: Email footer template

## Email Processing Flow

1. **Email Creation**: Emails are inserted into `EML_PENDING_MAIL` with `SENT_FLAG = 'N'`
2. **Email Generation**: `EmailGenerateThread` runs every 30 minutes and calls `EML_REPORT_PKG.CREATE_EMAIL_ALERT` to create scheduled report emails
3. **Email Sending**: `EmailAlertThread` runs every 30 seconds:
   - Queries `EML_PENDING_MAIL` for unsent emails (`SENT_FLAG = 'N'`)
   - Sends emails via SMTP
   - Marks emails as sent by calling `EML_REPORT_PKG.MARK_EMAIL_SENT`
4. **Email Tracking**: Sent emails have `SENT_FLAG = 'Y'`

## Scheduled Email Reports

The system supports scheduled email reports through:
- `EML_REPORT_VIEW`: View that defines scheduled reports
- `EML_REPORT_RCV_LIST`: List of recipients for each report
- Reports are generated based on `PERIOD` and `LAST_REPORT_TIME` settings

## Troubleshooting

### Check Pending Emails
```sql
SELECT * FROM EML_PENDING_MAIL 
WHERE SENT_FLAG = 'N' 
ORDER BY CREATION_DATE DESC;
```

### Check Email Status
```sql
SELECT 
    EMAIL_ID,
    FROM_ADDR,
    TO_ADDR,
    SUBJECT,
    CREATION_DATE,
    SENT_FLAG
FROM EML_PENDING_MAIL
ORDER BY CREATION_DATE DESC;
```

### Verify Email Threads are Running
Check Tomcat logs for:
- `***** email threads enabled` - Email system is active
- `Sent message successfully....` - Emails are being sent
- `createEmailAlert success` - Email generation is working

### Common Issues

1. **Emails not sending**: 
   - Check if `enableEmail` is set to `true` in web.xml
   - Verify listener is uncommented in web.xml
   - Check SMTP credentials are correct
   - Verify network connectivity to SMTP server

2. **Emails stuck in queue**:
   - Check if `EmailAlertThread` is running
   - Verify SMTP server is accessible
   - Check Tomcat logs for errors

3. **Recipient not found**:
   - Ensure login name exists in `MOD_LOGIN` table
   - Verify employee has email in `HR_PSNL_EMPLOYEE.EMAIL_1` or `EMAIL_2`

## Security Notes

⚠️ **Important**: The SMTP password is hardcoded in `EmailAlertThread.java`. Consider:
- Moving credentials to configuration file
- Using environment variables
- Implementing secure credential storage

## Files Reference

- **Email Thread**: `source/laconic/src/com/laconic/listener/thread/EmailAlertThread.java`
- **Email Generator**: `source/laconic/src/com/laconic/listener/thread/EmailGenerateThread.java`
- **Email Servlet**: `source/laconic/src/com/laconic/listener/servlet/ServletEmailAlert.java`
- **Email Content**: `source/laconic/src/com/laconic/listener/component/LcnEmailContent.java`
- **Database Package**: `source/database/Procs/EML_REPORT_PKG.pkb`
- **Email Table**: `source/database/Table/create/EML_PENDING_MAIL.sql`
- **Web Config**: `source/laconic/web/WEB-INF/web.xml`
