# Notification System API Documentation

## Overview
This document describes the Notification System API for managing chat message notifications. The system provides endpoints to fetch unread notifications and supports real-time WebSocket notifications.

---

## API Endpoints

### 1. Get Unread Notifications

Retrieves all unread chat message notifications grouped by chat room for the authenticated user.

**Endpoint:** `GET /api/v1/notification/unread`

**Authentication:** Required (JWT Token)

**Response:**
```json
{
  "count": 2,
  "data": [
    {
      "chatRoomId": 1,
      "chatDbRoomId": "abcd",
      "chatMessages": [
        {
          "id": 1,
          "chatDbMessageId": "abcd"
        },
        {
          "id": 2,
          "chatDbMessageId": "efgh"
        }
      ]
    },
    {
      "chatRoomId": 2,
      "chatDbRoomId": "efgh",
      "chatMessages": [
        {
          "id": 1,
          "chatDbMessageId": "hijk"
        },
        {
          "id": 2,
          "chatDbMessageId": "lmno"
        }
      ]
    }
  ]
}
```

**Response Fields:**
- `count` (Integer): Total number of chat rooms with unread notifications
- `data` (Array): List of chat room notifications
  - `chatRoomId` (Long): Internal chat room ID
  - `chatDbRoomId` (String): External chat database room ID
  - `chatMessages` (Array): List of unread messages in this chat room
    - `id` (Long): Message ID
    - `chatDbMessageId` (String): External chat database message ID

**Status Codes:**
- `200 OK`: Successfully retrieved notifications
- `401 Unauthorized`: User not authenticated
- `500 Internal Server Error`: Server error

---

### 2. Mark Messages as Read

Marks all messages in a chat room as read.

**Endpoint:** `PATCH /api/v1/jbn-chat-message/mark-read/{chatRoomId}`

**Authentication:** Required (JWT Token)

**Path Parameters:**
- `chatRoomId` (Long, required): The ID of the chat room

**Response:**
```json
"Messages in chat room 1 have been marked as read"
```

**Status Codes:**
- `200 OK`: Messages successfully marked as read
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Chat room not found
- `500 Internal Server Error`: Server error

---

## WebSocket Notifications

### Topic Subscription

Subscribe to user-specific notification topic to receive real-time notifications when new messages are sent.

**Topic:** `/topic/user/{userId}/notifications`

**Message Format:**
```json
{
  "chatRoomId": 1,
  "messageId": 123,
  "chatDbMessageId": "abcd"
}
```

**Message Fields:**
- `chatRoomId` (Long): The chat room ID where the message was sent
- `messageId` (Long): The message ID
- `chatDbMessageId` (String): The external chat database message ID

**When Notifications are Sent:**
- Automatically sent when a new chat message is created
- Only sent to the receiver (not the sender)
- Sent in real-time via WebSocket

---

## Data Models

### NotificationListResponse

```json
{
  "count": 2,
  "data": [
    {
      "chatRoomId": 1,
      "chatDbRoomId": "abcd",
      "chatMessages": [
        {
          "id": 1,
          "chatDbMessageId": "abcd"
        }
      ]
    }
  ]
}
```

### ChatRoomNotificationResponse

```json
{
  "chatRoomId": 1,
  "chatDbRoomId": "abcd",
  "chatMessages": [
    {
      "id": 1,
      "chatDbMessageId": "abcd"
    }
  ]
}
```

### ChatMessageNotificationResponse

```json
{
  "id": 1,
  "chatDbMessageId": "abcd"
}
```

### ChatNotificationDTO (WebSocket)

```json
{
  "chatRoomId": 1,
  "messageId": 123,
  "chatDbMessageId": "abcd"
}
```

---

## Business Rules

1. **Notification Filtering:**
   - Only messages with status `SENT` or `DELIVERED` (not `READ`) are included
   - Only messages not sent by the current user are shown
   - Only messages from chat rooms where the user is a participant are included

2. **Real-time Updates:**
   - WebSocket notifications are automatically sent when new messages are created
   - Notifications are sent to the receiver's user-specific topic
   - The sender does not receive notifications for their own messages

3. **Authentication:**
   - All endpoints require JWT authentication
   - User ID is extracted from the JWT token

4. **Chat Room Access:**
   - Users can only see notifications from chat rooms where they are participants
   - Participants are determined by the match relationship (client or freelancer)

---

## Example Usage

### Fetch Unread Notifications

```bash
curl -X GET "https://api.example.com/api/v1/notification/unread" \
  -H "Authorization: Bearer {jwt_token}"
```

**Response:**
```json
{
  "count": 2,
  "data": [
    {
      "chatRoomId": 1,
      "chatDbRoomId": "room-123",
      "chatMessages": [
        {
          "id": 100,
          "chatDbMessageId": "msg-456"
        }
      ]
    }
  ]
}
```

### Mark Messages as Read

```bash
curl -X PATCH "https://api.example.com/api/v1/jbn-chat-message/mark-read/1" \
  -H "Authorization: Bearer {jwt_token}"
```

**Response:**
```
Messages in chat room 1 have been marked as read
```

### WebSocket Subscription (JavaScript/TypeScript)

```javascript
const stompClient = getStompClient();
const userId = getCurrentUserId();

stompClient.subscribe(`/topic/user/${userId}/notifications`, (message) => {
  const notification = JSON.parse(message.body);
  console.log('New notification:', notification);
  // Handle notification update
});
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "error": "User not authenticated"
}
```

### 404 Not Found

```json
{
  "error": "Chat room not found with id: 1"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

---

## Implementation Notes

### Backend Components

1. **DTOs:**
   - `NotificationListResponse`: Wrapper for notification list with count
   - `ChatRoomNotificationResponse`: Notification data grouped by chat room
   - `ChatMessageNotificationResponse`: Individual message notification
   - `ChatNotificationDTO`: WebSocket notification payload

2. **Services:**
   - `INotificationService`: Service interface for notification operations
   - `NotificationService`: Implementation for fetching and sending notifications
   - `IWebSocketService`: WebSocket service for real-time notifications
   - `JbnChatMessageService`: Automatically sends notifications on message creation

3. **Repository:**
   - `IJbnChatMessageRepo.findUnreadMessagesByUserId()`: Fetches unread messages for a user

### Database Considerations

Consider adding indexes on:
- `JBN_CHAT_MESSAGE.CHAT_ROOM_ID`
- `JBN_CHAT_MESSAGE.SENDER_USER_ID`
- `JBN_CHAT_MESSAGE.MESSAGE_STATUS`
- `JBN_CHAT_MESSAGE.MESSAGE_TIMESTAMP`

---

## Testing

### Test Scenarios

1. ✅ Fetch unread notifications returns correct grouped notifications
2. ✅ WebSocket notification is sent when a new message is created
3. ✅ Notifications are filtered by user (only show messages not sent by current user)
4. ✅ Notifications only include unread messages (status != READ)
5. ✅ Marking messages as read removes them from notification list
6. ✅ WebSocket connection and message delivery works correctly
7. ✅ Multiple chat rooms and multiple unread messages are handled correctly

---

## Frontend Integration

The frontend should:

1. **Subscribe to WebSocket:**
   - Subscribe to `/topic/user/{userId}/notifications` when user logs in
   - Handle incoming notifications in real-time

2. **Fetch Notifications:**
   - Call `GET /api/v1/notification/unread` when bell icon is clicked
   - Display notifications in a modal or dropdown

3. **Mark as Read:**
   - Call `PATCH /api/v1/jbn-chat-message/mark-read/{chatRoomId}` when a notification is clicked
   - Update the notification list after marking as read

4. **Real-time Updates:**
   - Update notification count when WebSocket messages are received
   - Refresh notification list when new messages arrive
