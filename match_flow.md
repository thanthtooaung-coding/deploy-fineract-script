# API Documentation by Process Steps

This document maps all APIs that use tables starting with `JBN_` to the 5-step process flow.

## Database Tables Used (JBN_ prefix)

### Core Process Tables:
- `JBN_CL_MATCH` - Match entity (Step 1)
- `JBN_FL_SERVICE_PROPOSAL` - Service proposals (Step 2)
- `JBN_FL_PROFILE_SUMMARY` - Profile summaries (Step 2)
- `JBN_CL_JOB_MATCH` - Project entity (Step 3)
- `JBN_CL_MATCH_CONTRACT` - Contract entity (Step 5)

### Supporting Tables:
- `JBN_CL_JOB` - Job/Service posting
- `JBN_FL_SERVICE` - Freelancer service
- `JBN_CL_PROFILE` - Client profile
- `JBN_FL_PROFILE` - Freelancer profile
- `JBN_CL_MATCH_MILESTONE` - Project milestones
- `JBN_CL_MATCH_PAYMENT` - Payments
- `JBN_CL_MATCH_REVIEW` - Reviews
- `JBN_CHAT_ROOM` - Chat rooms
- `JBN_CHAT_MESSAGE` - Chat messages

---

## Step 1: Match
**Purpose**: Match service, freelancer, and client together

### Primary APIs

#### Create Match
- **Endpoint**: `POST /api/v1/jbn-cl-match/save`
- **Request Body**:
  ```json
  {
    "freelancerProfileId": Long (required),
    "clientProfileId": Long (required),
    "serviceId": Long (optional),
    "jobId": Long (optional)
  }
  ```
- **Response**: `Long` (matchId)
- **Table**: `JBN_CL_MATCH`

#### Get Match by ID
- **Endpoint**: `GET /api/v1/jbn-cl-match/{matchId}`
- **Response**: `JBNClMatchResponse`
- **Table**: `JBN_CL_MATCH`

#### Get Matches by Profile
- **Endpoint**: `GET /api/v1/jbn-cl-match/profile/{profileId}?isClient={true|false}`
- **Query Parameters**:
  - `isClient`: boolean (required) - true for client profile, false for freelancer profile
- **Response**: `List<JBNClMatchResponse>`
- **Table**: `JBN_CL_MATCH`

#### Change Match Status
- **Endpoint**: `PATCH /api/v1/jbn-cl-match/change-status/{matchId}?status={status}`
- **Query Parameters**:
  - `status`: JBNClMatchStatus enum (required)
- **Response**: `String` (confirmation message)
- **Table**: `JBN_CL_MATCH`

#### Get Paginated Matches
- **Endpoint**: `POST /api/v1/jbn-cl-match/pageable`
- **Request Body**: `PageAndFilterDTO<JBNClMatchFilter>`
- **Response**: `PaginationDTO<JBNClMatchResponse>`
- **Table**: `JBN_CL_MATCH`

### Supporting APIs (for Match Inputs)

#### Get/Manage Client Profile
- **Endpoint**: `GET /api/v1/jbn-cl-profile/user/{userId}`
- **Endpoint**: `POST /api/v1/jbn-cl-profile/save`
- **Endpoint**: `PUT /api/v1/jbn-cl-profile/update/{id}`
- **Table**: `JBN_CL_PROFILE`

#### Get/Manage Freelancer Profile
- **Endpoint**: `GET /api/v1/jbn-fl-profile/user/{userId}`
- **Endpoint**: `POST /api/v1/jbn-fl-profile/save`
- **Endpoint**: `PUT /api/v1/jbn-fl-profile/update/{id}`
- **Table**: `JBN_FL_PROFILE`

#### Get/Manage Service
- **Endpoint**: `GET /api/v1/jbn-fl-service/{serviceId}`
- **Endpoint**: `POST /api/v1/jbn-fl-service/save`
- **Endpoint**: `PUT /api/v1/jbn-fl-service/update/{serviceId}`
- **Endpoint**: `GET /api/v1/jbn-fl-service/freelancer-profile/{freelancerProfileId}`
- **Table**: `JBN_FL_SERVICE`

#### Get/Manage Job
- **Endpoint**: `GET /api/v1/jbn-cl-job/{id}`
- **Endpoint**: `POST /api/v1/jbn-cl-job/save`
- **Endpoint**: `PUT /api/v1/jbn-cl-job/update/{id}`
- **Endpoint**: `GET /api/v1/jbn-cl-job/client-profile/{clientProfileId}`
- **Table**: `JBN_CL_JOB`

---

## Step 2: Send Proposal / Send Profile Summary
**Purpose**: Freelancer sends proposal or profile summary to client

### Send Proposal APIs

#### Create/Update Proposal
- **Endpoint**: `POST /api/v1/jbn-fl-service-proposal/save`
- **Endpoint**: `PUT /api/v1/jbn-fl-service-proposal/update/{proposalId}`
- **Request Body**:
  ```json
  {
    "serviceId": Long (required),
    "subject": String,
    "greeting": String,
    "openingLine": String,
    "mainBody": String,
    "closingLine": String,
    "signature": String,
    "description": String
  }
  ```
- **Response**: `JBNFlServiceProposalResponse`
- **Table**: `JBN_FL_SERVICE_PROPOSAL`

#### Get Proposal by ID
- **Endpoint**: `GET /api/v1/jbn-fl-service-proposal/{proposalId}`
- **Response**: `JBNFlServiceProposalResponse`
- **Table**: `JBN_FL_SERVICE_PROPOSAL`

#### Get Paginated Proposals
- **Endpoint**: `POST /api/v1/jbn-fl-service-proposal/pageable`
- **Request Body**: `PageAndFilterDTO<JBNFlServiceProposalRequest>`
- **Response**: `PaginationDTO<JBNFlServiceProposalResponse>`
- **Table**: `JBN_FL_SERVICE_PROPOSAL`

#### Delete Proposal
- **Endpoint**: `DELETE /api/v1/jbn-fl-service-proposal/{proposalId}`
- **Table**: `JBN_FL_SERVICE_PROPOSAL`

### Send Profile Summary APIs

#### Create/Update Profile Summary
- **Endpoint**: `POST /api/v1/jbn-fl-profile-summary/save`
- **Endpoint**: `PUT /api/v1/jbn-fl-profile-summary/update/{id}`
- **Request Body**: `JBNFlProfileSummaryRequest`
- **Response**: `JBNFlProfileSummaryResponse`
- **Table**: `JBN_FL_PROFILE_SUMMARY`

#### Get Profile Summary by ID
- **Endpoint**: `GET /api/v1/jbn-fl-profile-summary/{id}`
- **Response**: `JBNFlProfileSummaryResponse`
- **Table**: `JBN_FL_PROFILE_SUMMARY`

#### Get Paginated Profile Summaries
- **Endpoint**: `POST /api/v1/jbn-fl-profile-summary/pageable`
- **Request Body**: `PageAndFilterDTO<JBNFlProfileSummaryFilter>`
- **Response**: `PaginationDTO<JBNFlProfileSummaryResponse>`
- **Table**: `JBN_FL_PROFILE_SUMMARY`

#### Upload Profile Summary Image
- **Endpoint**: `POST /api/v1/jbn-fl-profile-summary/upload-image`
- **Content-Type**: `multipart/form-data`
- **Request**: `file` (MultipartFile)
- **Response**: `String` (imageUrl)
- **Table**: `JBN_FL_PROFILE_SUMMARY`

#### Delete Profile Summary
- **Endpoint**: `DELETE /api/v1/jbn-fl-profile-summary/{id}`
- **Table**: `JBN_FL_PROFILE_SUMMARY`

---

## Step 3: Create Project
**Purpose**: Create project with match id, description, title, start date, budget, end date

### Primary APIs

#### Create Project
- **Endpoint**: `POST /api/v1/jbn-cl-job-match/save`
- **Request Body**:
  ```json
  {
    "matchId": Long (required),
    "title": String (required, not empty),
    "description": String,
    "startDate": LocalDate,
    "endDate": LocalDate,
    "budget": BigDecimal (required, min: 1)
  }
  ```
- **Response**: `Long` (projectId)
- **Table**: `JBN_CL_JOB_MATCH`

#### Get Project by ID
- **Endpoint**: `GET /api/v1/jbn-cl-job-match/{projectId}`
- **Response**: `JBNClJobMatchResponse`
- **Table**: `JBN_CL_JOB_MATCH`

#### Get Project by Match ID
- **Endpoint**: `GET /api/v1/jbn-cl-job-match/match/{matchId}`
- **Response**: `JBNClJobMatchResponse`
- **Table**: `JBN_CL_JOB_MATCH`

#### Get Paginated Projects
- **Endpoint**: `POST /api/v1/jbn-cl-job-match/pageable`
- **Request Body**: `PageAndFilterDTO<JBNClJobMatchFilter>`
- **Response**: `PaginationDTO<JBNClJobMatchResponse>`
- **Table**: `JBN_CL_JOB_MATCH`

#### Change Project Status
- **Endpoint**: `PATCH /api/v1/jbn-cl-job-match/change-status/{projectId}?status={status}`
- **Query Parameters**:
  - `status`: JBNClJobMatchStatus enum (required)
- **Response**: `String` (confirmation message)
- **Table**: `JBN_CL_JOB_MATCH`

---

## Step 4: Negotiate
**Purpose**: Negotiate and update project details (title, description, start date, end date, budget)

### Primary APIs

#### Update Project (Negotiation)
- **Endpoint**: `PUT /api/v1/jbn-cl-job-match/update/{projectId}`
- **Request Body**:
  ```json
  {
    "matchId": Long (required),
    "title": String (required, not empty),
    "description": String,
    "startDate": LocalDate,
    "endDate": LocalDate,
    "budget": BigDecimal (required, min: 1)
  }
  ```
- **Response**: `Long` (projectId)
- **Table**: `JBN_CL_JOB_MATCH`
- **Note**: This endpoint allows updating all project details during negotiation

#### Change Project Status
- **Endpoint**: `PATCH /api/v1/jbn-cl-job-match/change-status/{projectId}?status={status}`
- **Query Parameters**:
  - `status`: JBNClJobMatchStatus enum (required)
- **Response**: `String` (confirmation message)
- **Table**: `JBN_CL_JOB_MATCH`

### Supporting APIs (for Negotiation Context)

#### Get Match Details
- **Endpoint**: `GET /api/v1/jbn-cl-match/{matchId}`
- **Table**: `JBN_CL_MATCH`

#### Get Project Details
- **Endpoint**: `GET /api/v1/jbn-cl-job-match/{projectId}`
- **Table**: `JBN_CL_JOB_MATCH`

#### Chat Room APIs (for negotiation communication)
- **Endpoint**: `GET /api/v1/jbn-chat-room/{id}`
- **Endpoint**: `POST /api/v1/jbn-chat-room/save`
- **Endpoint**: `GET /api/v1/jbn-chat-message/chat-room/{chatRoomId}`
- **Tables**: `JBN_CHAT_ROOM`, `JBN_CHAT_MESSAGE`

---

## Step 5: Create Contract
**Purpose**: Create contract after agreement is reached

### Primary APIs

#### Create Contract
- **Endpoint**: `POST /api/v1/jbn-cl-match-contract/save`
- **Request Body**:
  ```json
  {
    "matchId": Long (required),
    "projectId": Long (required),
    "terms": String,
    "signedDate": LocalDate
  }
  ```
- **Response**: `Long` (contractId)
- **Table**: `JBN_CL_MATCH_CONTRACT`

#### Get Contract by ID
- **Endpoint**: `GET /api/v1/jbn-cl-match-contract/{contractId}`
- **Response**: `JBNClMatchContractResponse`
- **Table**: `JBN_CL_MATCH_CONTRACT`

#### Get Contracts by Match ID
- **Endpoint**: `GET /api/v1/jbn-cl-match-contract/match/{matchId}`
- **Response**: `List<JBNClMatchContractResponse>`
- **Table**: `JBN_CL_MATCH_CONTRACT`

#### Get Contracts by Project ID
- **Endpoint**: `GET /api/v1/jbn-cl-match-contract/project/{projectId}`
- **Response**: `List<JBNClMatchContractResponse>`
- **Table**: `JBN_CL_MATCH_CONTRACT`

#### Get Paginated Contracts
- **Endpoint**: `POST /api/v1/jbn-cl-match-contract/pageable`
- **Request Body**: `PageAndFilterDTO<JBNClMatchContractFilter>`
- **Response**: `PaginationDTO<JBNClMatchContractResponse>`
- **Table**: `JBN_CL_MATCH_CONTRACT`

#### Change Contract Status
- **Endpoint**: `PATCH /api/v1/jbn-cl-match-contract/change-status/{contractId}?status={status}`
- **Query Parameters**:
  - `status`: JBNClMatchContractStatus enum (required)
- **Response**: `String` (confirmation message)
- **Table**: `JBN_CL_MATCH_CONTRACT`

### Supporting APIs (Contract Management)

#### Manage Milestones
- **Endpoint**: `POST /api/v1/jbn-cl-match-milestone/save`
- **Endpoint**: `PUT /api/v1/jbn-cl-match-milestone/update/{milestoneId}`
- **Endpoint**: `GET /api/v1/jbn-cl-match-milestone/{milestoneId}`
- **Endpoint**: `GET /api/v1/jbn-cl-match-milestone/match/{matchId}`
- **Endpoint**: `GET /api/v1/jbn-cl-match-milestone/project/{projectId}`
- **Endpoint**: `PATCH /api/v1/jbn-cl-match-milestone/change-status/{milestoneId}`
- **Table**: `JBN_CL_MATCH_MILESTONE`

#### Manage Payments
- **Endpoint**: `POST /api/v1/jbn-cl-match-payment/save`
- **Endpoint**: `PUT /api/v1/jbn-cl-match-payment/update/{paymentId}`
- **Endpoint**: `GET /api/v1/jbn-cl-match-payment/{paymentId}`
- **Endpoint**: `PATCH /api/v1/jbn-cl-match-payment/change-status/{paymentId}`
- **Table**: `JBN_CL_MATCH_PAYMENT`

#### Manage Reviews
- **Endpoint**: `POST /api/v1/jbn-cl-match-review/save`
- **Endpoint**: `PUT /api/v1/jbn-cl-match-review/update/{reviewId}`
- **Endpoint**: `GET /api/v1/jbn-cl-match-review/{reviewId}`
- **Endpoint**: `DELETE /api/v1/jbn-cl-match-review/delete/{reviewId}`
- **Table**: `JBN_CL_MATCH_REVIEW`

---

## Complete API Flow Example

### Typical Flow Sequence:

1. **Step 1 - Match**:
   ```
   POST /api/v1/jbn-cl-match/save
   → Returns: matchId
   ```

2. **Step 2 - Send Proposal/Profile Summary**:
   ```
   POST /api/v1/jbn-fl-service-proposal/save
   OR
   POST /api/v1/jbn-fl-profile-summary/save
   ```

3. **Step 3 - Create Project**:
   ```
   POST /api/v1/jbn-cl-job-match/save
   Body: { matchId, title, description, startDate, endDate, budget }
   → Returns: projectId
   ```

4. **Step 4 - Negotiate**:
   ```
   PUT /api/v1/jbn-cl-job-match/update/{projectId}
   Body: { matchId, title, description, startDate, endDate, budget }
   (Can be called multiple times to update project details)
   ```

5. **Step 5 - Create Contract**:
   ```
   POST /api/v1/jbn-cl-match-contract/save
   Body: { matchId, projectId, terms, signedDate }
   → Returns: contractId
   ```

---

## Additional Utility APIs

### Chat & Communication
- `POST /api/v1/jbn-chat-room/save` - Create chat room
- `GET /api/v1/jbn-chat-room/{id}` - Get chat room
- `POST /api/v1/jbn-chat-message/save` - Send message
- `GET /api/v1/jbn-chat-message/chat-room/{chatRoomId}` - Get messages

### Search & Filter
- All entities support pagination via `POST /api/v1/{entity}/pageable` endpoints
- Filtering available through `PageAndFilterDTO` request body

---

## Notes

1. **Base URL**: All APIs are prefixed with `/api/v1/`
2. **Authentication**: APIs likely require authentication (not shown in controllers)
3. **Validation**: Request DTOs include validation annotations
4. **Status Management**: Most entities support status changes via PATCH endpoints
5. **Soft Delete**: Entities use `is_enable` flag for soft deletion (SQLRestriction)
6. **Audit Fields**: All entities extend `Auditable` with created/updated timestamps

---

## Entity Relationships

```
JBN_CL_MATCH
  ├── JBN_CL_PROFILE (clientProfile)
  ├── JBN_FL_PROFILE (freelancerProfile)
  ├── JBN_FL_SERVICE (service) [optional]
  └── JBN_CL_JOB (job) [optional]

JBN_CL_JOB_MATCH (Project)
  └── JBN_CL_MATCH (match)

JBN_CL_MATCH_CONTRACT
  ├── JBN_CL_MATCH (match)
  └── JBN_CL_JOB_MATCH (project)

JBN_CL_MATCH_MILESTONE
  ├── JBN_CL_MATCH (match)
  └── JBN_CL_JOB_MATCH (project)

JBN_FL_SERVICE_PROPOSAL
  └── JBN_FL_SERVICE (service)
```
