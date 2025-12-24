### ER Diagram (Mermaid)

```mermaid
erDiagram

    JBN_CL_MATCH_TERMINATION {
        BIGINT termination_id PK
        BIGINT contract_id FK
        VARCHAR initiator
        TEXT reason
        BIGINT client_id FK
        BIGINT freelancer_id FK
        DOUBLE client_share_percent
        DOUBLE freelancer_share_percent
        DECIMAL client_refund_amount
        DECIMAL freelancer_payout_amount
        VARCHAR status
        BOOLEAN is_enable
        BIGINT created_by
        TIMESTAMP created_date
        BIGINT last_modified_by
        TIMESTAMP last_modified_date
    }

    JBN_CL_MATCH_CONTRACT {
        BIGINT contract_id PK
    }

    JBN_USER {
        BIGINT user_id PK
    }

    JBN_CL_MATCH_CONTRACT ||--o{ JBN_CL_MATCH_TERMINATION : "has"
    JBN_USER ||--o{ JBN_CL_MATCH_TERMINATION : "initiates/receives"
    JBN_USER ||--o{ JBN_CL_MATCH_TERMINATION : "initiates/receives"
```

---

### Relationship Explanation

* **JBN_CL_MATCH_CONTRACT → JBN_CL_MATCH_TERMINATION**

  * One contract can have **many terminations**
  * `contract_id` is a foreign key

* **CLIENT → JBN_CL_MATCH_TERMINATION**

  * A client can be involved in **many terminations**
  * Referenced by `client_id`

* **FREELANCER → JBN_CL_MATCH_TERMINATION**

  * A freelancer can be involved in **many terminations**
  * Referenced by `freelancer_id`
  
