# Volunteer Entity ER Diagram

## Entity: Volunteer (တရားထောက်)

```mermaid
erDiagram
    VOLUNTEER {
        bigint id PK "Auto-generated"
        varchar name "ဘွဲ့/အမည်"
        varchar fatherName "ဖအမည်"
        varchar nrc "မှတ်ပုံတင်အမှတ်"
        varchar yogiId "ယောဂီ ID"
        date birthDate "မွက္ကရာဇ်"
        varchar yogiType "ယောဂီအမျိုးအစား"
        varchar phone "ဖုန်းနံပါတ်"
        varchar education "ပညာအရည်အချင်း"
        varchar address "နေရပ်လိပ်စာ"
        varchar remark "မှတ်ချက်"
        varchar genderType
        varchar healthStatus
        varchar foodNotEaten
        varchar otherMeditationCenter
        boolean blacklisted
        date blacklistedAt
        varchar blackListType "ENUM"
        boolean isCompleted
        varchar status
        datetime createdAt
        datetime updatedAt
        bigint createdById
        bigint updatedById
        bigint level_id FK
        bigint country_id FK
        bigint region_id FK
        bigint city_id FK
        bigint missionary_group_id FK
        bigint missionary_headquarters_id FK
    }
    
    LEVEL {
        bigint id PK
        varchar name
    }
    
    COUNTRY {
        bigint id PK
        varchar name
        varchar code
    }
    
    REGION {
        bigint id PK
        varchar nameMm
        varchar nameEn
        varchar code
    }
    
    CITY {
        bigint id PK
        varchar nameMm
        varchar nameEn
        bigint region_id FK
    }
    
    MISSIONARY_GROUP {
        bigint id PK
        varchar name
        varchar code
        boolean underControl
        int weight
    }
    
    VOLUNTEER }o--|| LEVEL : "has level"
    VOLUNTEER }o--|| COUNTRY : "resides in"
    VOLUNTEER }o--|| REGION : "resides in"
    VOLUNTEER }o--|| CITY : "resides in"
    VOLUNTEER }o--|| MISSIONARY_GROUP : "belongs to"
    VOLUNTEER }o--|| MISSIONARY_GROUP : "has headquarters"
    CITY }o--|| REGION : "belongs to"
```

## Field Inheritance

The VOLUNTEER entity inherits fields from two parent classes:

1. **From MasterYogi** (inherited fields shown in VOLUNTEER):
   - `name`, `fatherName`, `address`, `remark`
   - `genderType`, `healthStatus`, `foodNotEaten`
   - `otherMeditationCenter`, `blacklisted`, `blacklistedAt`, `isCompleted`

2. **From MasterData** (inherited fields shown in VOLUNTEER):
   - `id`, `status`, `createdAt`, `updatedAt`
   - `createdById`, `updatedById`
