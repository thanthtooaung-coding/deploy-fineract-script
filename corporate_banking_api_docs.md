Got it 👍
I’ll **write the APIs for all the forms & management flows** in a **clean, consistent Fly-Pay API style**, matching the two APIs you already defined.

Below is a **complete API contract** (endpoints, request, response) you can directly use for backend + frontend alignment.

---

## 1. Create / Edit User (Create User Form)

### Create User

**POST**
`/api/v1/fly-pay/users`

**Request**

```json
{
  "name": "John Doe",
  "role": "INITIATOR",
  "ruleId": 1
}
```

**Response**

```json
{
  "status": 201,
  "data": {
    "id": 1,
    "name": "John Doe",
    "role": "INITIATOR",
    "rule": {
      "id": 1,
      "ruleName": "Approval Rule A"
    }
  },
  "message": "User created successfully"
}
```

---

### Edit User

**PUT**
`/api/v1/fly-pay/users/{id}`

**Request**

```json
{
  "name": "John Doe Updated",
  "role": "AUTHORIZER",
  "ruleId": 2
}
```

**Response**

```json
{
  "status": 200,
  "data": {
    "id": 1,
    "name": "John Doe Updated",
    "role": "AUTHORIZER",
    "rule": {
      "id": 2,
      "ruleName": "Approval Rule B"
    }
  },
  "message": "User updated successfully"
}
```

---

## 2. Create / Edit Payment Type

### Create Payment Type

**POST**
`/api/v1/fly-pay/payment-types`

**Request**

```json
{
  "name": "Merchant",
  "maxCount": 100
}
```

**Response**

```json
{
  "status": 201,
  "data": {
    "id": 1,
    "name": "Merchant",
    "maxCount": 100
  },
  "message": "Payment type created successfully"
}
```

---

### Edit Payment Type

**PUT**
`/api/v1/fly-pay/payment-types/{id}`

**Request**

```json
{
  "name": "Merchant Updated",
  "maxCount": 150
}
```

---

## 3. Create / Edit Rule (Approval Rule)

### Create Rule

**POST**
`/api/v1/fly-pay/rules`

**Request**

```json
{
  "ruleName": "Approval Rule A",
  "ruleCode": "APR_001",
  "fromAmount": 0,
  "toAmount": 1000000,
  "maxCountPerMonth": 20
}
```

**Response**

```json
{
  "status": 201,
  "data": {
    "id": 1,
    "ruleName": "Approval Rule A",
    "ruleCode": "APR_001",
    "fromAmount": 0,
    "toAmount": 1000000,
    "maxCountPerMonth": 20
  },
  "message": "Rule created successfully"
}
```

---

### Edit Rule

**PUT**
`/api/v1/fly-pay/rules/{id}`

---

## 4. User — Rule Mapping

### Assign Rule to User

**POST**
`/api/v1/fly-pay/users/{userId}/rules/{ruleId}`

**Response**

```json
{
  "status": 200,
  "message": "Rule assigned to user successfully"
}
```

---

## 5. Create / Edit Payroll Form

### Create Payroll

**POST**
`/api/v1/fly-pay/payrolls`

**Request**

```json
{
  "fileName": "September Payroll File",
  "paymentTypeId": 1,
  "fileId": 10
}
```

**Response**

```json
{
  "status": 201,
  "data": {
    "id": 1,
    "fileName": "September Payroll File",
    "paymentType": {
      "id": 1,
      "name": "Merchant"
    },
    "status": "IN_PROGRESS"
  },
  "message": "Payroll created successfully"
}
```

---

## 6. Create / Edit Group

### Create Group

**POST**
`/api/v1/fly-pay/groups`

**Request**

```json
{
  "name": "Finance Group",
  "paymentTypeId": 1,
  "limit": 5000000,
  "role": "INITIATOR"
}
```

**Response**

```json
{
  "status": 201,
  "data": {
    "id": 1,
    "name": "Finance Group",
    "paymentType": {
      "id": 1,
      "name": "Merchant"
    },
    "limit": 5000000,
    "role": "INITIATOR"
  },
  "message": "Group created successfully"
}
```

---

### Edit Group

**PUT**
`/api/v1/fly-pay/groups/{id}`

---

## 7. Manage Group Members

### Add Members

**POST**
`/api/v1/fly-pay/groups/{id}/manage-members`

**Request**

```json
{
  "userIds": [1, 2, 3]
}
```

**Response**

```json
{
  "status": 200,
  "message": "Members added successfully"
}
```

---

### Remove Member

**DELETE**
`/api/v1/fly-pay/groups/{groupId}/members/{userId}`

---

## 8. Upload Payroll Excel File ✅

**POST**
`/api/v1/fly-pay/files/upload/payroll-excel`

**Request**

* `fileDisplayName` (String)
* `file` (MultipartFile)

**Response**

```json
{
  "status": 201,
  "data": {
    "id": 1,
    "fileDisplayName": "September Payroll File",
    "originalFileName": "sept_payroll.xlsx",
    "downloadUrl": "https://xxx.com/file/yyy.xlsx",
    "status": "IN_PROGRESS"
  },
  "message": "File Submitted Successfully"
}
```

---

## 9. Retrieve Transactions from Payroll File ✅

**GET**
`/api/v1/fly-pay/transactions/files/{id}/pageable?page=0&size=10`

```json
{
	"status": 200,
	"data": {
		"fileDetails": {
			"id": 1,
			"fileDisplayName": "September Payroll File",
			"originalFileName": "sept_payroll.xlsx",
			"downloadUrl": "https://xxx.com/file/yyy.xlsx",
			"status": "IN_PROGRESS"
		},
		"transactions": {
			"content": [
				{
				  "id": 1,
				  "transactionId": "jdfkd-dfdf-dfdf",
				  "amount": "100,000",
				  "account": {
				    "id": 1,
				    "accountNumber": "FP_000000001"
				  },
				  "transactionDate": "2026-01-01"
				},
				{
				  "id": 2,
				  "transactionId": "jdfkd-dfdf-dfdf",
				  "amount": "120,000",
				  "account": {
				    "id": 2,
				    "accountNumber": "FP_000000002"
				  },
				  "transactionDate": "2026-01-01"
				}
			],
			"pageNumber": 0,
			"pageSize": 10,
			"totalElements": 52,
			"totalPages": 6,
			"last": false
		}
	},
	"message": "Transactions retrieved successfully"
}
```
---


