# Code Locations That Update OM_OE_ORDER.STATUS Column

This document lists all the code locations that modify the `OM_OE_ORDER.STATUS` column. These updates will trigger the `OM_OE_ORDER_STATUS_TRG` trigger.

## 1. OM_OE_EO_PKG Package

### Procedure: ACTION_EXPECTED_ORDER
**File:** `source/database/Procs/OM_OE_EO_PKG.pkb`  
**Lines:** 322-325  
**Status Values:** 'X' (when i_function_mode = 'CLOSE')
```sql
UPDATE OM_OE_ORDER   -- Order
SET STATUS = l_status
WHERE EO_ID = i_eo_id
AND    EO_REVISION = i_eo_revision;
```

### Procedure: MODIFY_ORDER
**File:** `source/database/Procs/OM_OE_EO_PKG.pkb`  
**Lines:** 863-867  
**Status Values:** 'X' (when i_mode = 'CANCEL-ORDER')
```sql
UPDATE OM_OE_ORDER
SET STATUS = 'X',
    CANCEL_DATE = SYSDATE,
    CANCEL_BY = i_login_name
WHERE ORDER_ID = i_or_id;
```

### Procedure: SAVE_EO_STATUS
**File:** `source/database/Procs/OM_OE_EO_PKG.pkb`  
**Multiple updates based on i_function_mode:**

- **Line 2824-2828:** STATUS = 'S' (when i_function_mode = 'SEND-TO-PC')
```sql
UPDATE OM_OE_ORDER
SET  STATUS = 'S',
     SEND_OUT_BY = i_login_name,
     SEND_OUT_DATE = SYSDATE
WHERE EO_ID = i_eo_id;
```

- **Line 2872-2876:** STATUS = 'D' (when i_function_mode = 'DELETE')
```sql
UPDATE OM_OE_ORDER
SET   STATUS = 'D',
      DELETE_BY = i_login_name,
      DEDETE_DATE = SYSDATE
WHERE EO_ID = i_eo_id;
```

- **Line 2880-2884:** STATUS = 'C' (when i_function_mode = 'RETURN')
```sql
UPDATE OM_OE_ORDER
SET   STATUS = 'C',
      PC_RETURNED_BY = i_login_name,
      PC_RETURNED_DATE = SYSDATE
WHERE EO_ID = i_eo_id;
```

- **Line 2888-2892:** STATUS = 'S' (when i_function_mode = 'CONFIRM_RETURN')
```sql
UPDATE OM_OE_ORDER
SET   STATUS = 'S',
      RETURNED_BY = i_login_name,
      RETURNED_DATE = SYSDATE
WHERE EO_ID = i_eo_id;
```

- **Line 2914-2918:** STATUS = 'O' (when i_function_mode = 'SEND-TO-SALES')
```sql
UPDATE OM_OE_ORDER
SET   STATUS = 'O',
      PC_CONFIRMED_BY = i_login_name,
      PC_CONFIRMED_DATE = SYSDATE
WHERE EO_ID = i_eo_id;
```

- **Line 2967-2975:** STATUS = 'F' (when i_function_mode = 'CONFIRM' or 'QUICK-CONFIRM')
```sql
UPDATE OM_OE_ORDER
SET   STATUS = 'F',
      MFG_DISABLE_FLAG  = i_not_mfg,
      ORDER_ID = o_order_id,
      CONFIRMED_BY =   i_login_name ,
      CONFIRMATION_DATE = SYSDATE,
      CONFIRM_BY = i_login_name,
      CONFIRM_DATE = SYSDATE
WHERE EO_ID = i_eo_id;
```

### Procedure: CLOSE_EO
**File:** `source/database/Procs/OM_OE_EO_PKG.pkb`  
**Lines:** 3192-3196  
**Status Values:** 'X'
```sql
UPDATE OM_OE_ORDER
SET STATUS = 'X',
    CLOSE_DATE = SYSDATE,
    CLOSE_BY = i_login_name
WHERE ORDER_ID = i_order_id;
```

### Procedure: RE_OPEN_EO
**File:** `source/database/Procs/OM_OE_EO_PKG.pkb`  
**Lines:** 3226-3228  
**Status Values:** 'F'
```sql
UPDATE OM_OE_ORDER
SET STATUS = 'F'
WHERE ORDER_ID = i_order_id;
```

## 2. MFG_IO_PKG Package

### Procedure: SAVE_STATUS
**File:** `source/database/Procs/MFG_IO_PKG.pkb`  
**Lines:** 644-648, 652-654  
**Status Values:** 
- 'A' or 'F' (when i_function_mode = 'CONFIRM', based on l_io_require_approval_flag)
- 'D' (when i_function_mode = 'DELETE')

```sql
-- Line 644-648
UPDATE OM_OE_ORDER
SET STATUS = DECODE(l_io_require_approval_flag, 'Y', 'A', 'F'),
    CONFIRMED_BY =   i_login_name ,
    CONFIRMATION_DATE = SYSDATE
WHERE ORDER_ID = i_order_id ;

-- Line 652-654
UPDATE OM_OE_ORDER
SET   STATUS = 'D'
WHERE ORDER_ID = i_order_id ;
```

### Procedure: SAVE_ORDER_STATUS
**File:** `source/database/Procs/MFG_IO_PKG.pkb`  
**Lines:** 681-684, 690-693  
**Status Values:** 
- 'R' (when i_mode = 'REJECT')
- 'F' (when i_mode != 'REJECT')

```sql
-- Line 681-684 (REJECT mode)
UPDATE OM_OE_ORDER
SET STATUS = 'R',
    OE_REMARK = i_remark
WHERE ORDER_ID = i_order_id;

-- Line 690-693 (Non-REJECT mode)
UPDATE OM_OE_ORDER
SET STATUS = 'F',
    OE_REMARK = i_remark
WHERE ORDER_ID = i_order_id;
```

### Procedure: MODIFY_IO_RETURN
**File:** `source/database/Procs/MFG_IO_PKG.pkb`  
**Lines:** 727-729  
**Status Values:** 'O'
```sql
UPDATE OM_OE_ORDER
SET STATUS = 'O'
WHERE  ORDER_ID = (SELECT ORDER_ID FROM OM_OE_ORDER_DETAIL WHERE ORDER_DETAIL_ID = i_order_detail_id);
```

## 3. MOD_CUSTOMER_PKG Package

### Procedure: SAVE_CUSTOMER_ORDER_STATUS
**File:** `source/database/Procs/MOD_CUSTOMER_PKG.pkb`  
**Lines:** 2381-2383  
**Note:** This procedure updates `DN_NO` column, NOT STATUS. Included for reference only.

## 4. FM_AR_SEND_TO_FM_PKG Package

### Procedure: (Unnamed/Context)
**File:** `source/database/Procs/FM_AR_SEND_TO_FM_PKG.pkb`  
**Lines:** 618-620  
**Status Values:** Updates `DEPOSIT_STATUS` (not STATUS column)
**Note:** This updates `DEPOSIT_STATUS`, NOT the `STATUS` column. Included for reference only.

## 5. OM_ORDER_BOOKING_PKG Package

### Procedure: (Unnamed/Context)
**File:** `source/database/Procs/OM_ORDER_BOOKING_PKG.pkb`  
**Lines:** 199-201  
**Note:** This procedure updates `PASS_BOOKING` column, NOT STATUS. Included for reference only.

## Summary

The following procedures/functions update `OM_OE_ORDER.STATUS`:

1. **OM_OE_EO_PKG.ACTION_EXPECTED_ORDER** - Sets 'X' on CLOSE
2. **OM_OE_EO_PKG.MODIFY_ORDER** - Sets 'X' on CANCEL-ORDER
3. **OM_OE_EO_PKG.SAVE_EO_STATUS** - Sets 'S', 'D', 'C', 'O', or 'F' based on function mode
4. **OM_OE_EO_PKG.CLOSE_EO** - Sets 'X'
5. **OM_OE_EO_PKG.RE_OPEN_EO** - Sets 'F'
6. **MFG_IO_PKG.SAVE_STATUS** - Sets 'A', 'F', or 'D'
7. **MFG_IO_PKG.SAVE_ORDER_STATUS** - Sets 'R' or 'F'
8. **MFG_IO_PKG.MODIFY_IO_RETURN** - Sets 'O'

All of these updates will fire the `OM_OE_ORDER_STATUS_TRG` trigger.
