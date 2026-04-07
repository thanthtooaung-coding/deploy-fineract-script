# Mock Interview Q&A (Booking System - Java)

Use this as a rapid practice sheet before your interview. Keep answers short (45-90 seconds each), then expand only if asked.

## 1) "Can you walk me through your project in 2 minutes?"
**Suggested answer**
I built a booking system API using Spring Boot, JPA/Hibernate, PostgreSQL, Redis, Quartz, and Spring Security with JWT.  
Users can register, verify email, login, purchase country-specific packages, and book classes.  
The booking flow enforces business rules: country match, required credits, non-overlap time, cancellation refund rule, waitlist FIFO promotion, and check-in window.  
For concurrency, I use a Redis lock keyed by class schedule to prevent overbooking under simultaneous requests.  
Swagger documents the APIs, and I included an ER diagram and CI pipeline.

## 2) "How do you prevent overbooking when many users book at the same time?"
**Suggested answer**
I use a distributed lock in Redis per `classScheduleId`.  
Inside the lock, I re-fetch current schedule and package state from DB, verify slot availability, create booking, deduct credits, and increment booked slots in one transactional flow.  
This serializes booking attempts per class and prevents race conditions that would oversubscribe slots.

**In code — locking**
`RedisLockUtil` uses Redis `SET key NX` with TTL (`setIfAbsent`), so only one thread holds the lock per schedule. The helper wraps work in `try/finally` so the key is released after the lambda runs.

```26:79:src/main/java/com/alvin/bookingsystem/util/RedisLockUtil.java
    public String acquireLock(Long classScheduleId) {
        String lockKey = LOCK_PREFIX + classScheduleId;
        String lockValue = UUID.randomUUID().toString();
        
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(
                lockKey, 
                lockValue, 
                DEFAULT_LOCK_TIMEOUT.toSeconds(), 
                TimeUnit.SECONDS
        );
        // ...
    }
    public <T> T executeWithLock(Long classScheduleId, LockTask<T> task) {
        String lockValue = acquireLock(classScheduleId);
        if (lockValue == null) {
            throw new RuntimeException("Failed to acquire lock for class schedule: " + classScheduleId);
        }
        try {
            return task.execute();
        } finally {
            releaseLock(classScheduleId, lockValue);
        }
    }
```

**In code — booking**
`bookClass` validates outside the lock (cheap checks: country, credits, overlap), then calls `executeWithLock(classScheduleId, …)`. Inside the lock it **re-loads** `ClassSchedule` and `UserPackage`, checks `bookedSlots < maxSlots`, persists `Booking`, deducts credits, and increments `bookedSlots`.

```125:175:src/main/java/com/alvin/bookingsystem/service/impl/ScheduleServiceImpl.java
        // Use Redis lock for concurrent booking prevention
        return redisLockUtil.executeWithLock(classScheduleId, () -> {
            ClassSchedule currentClassSchedule = classScheduleRepository.findById(finalRequestClassScheduleId)
                    .orElseThrow(() -> new EntityNotFoundException("Class schedule not found"));
            if (currentClassSchedule.getBookedSlots() >= currentClassSchedule.getMaxSlots()) {
                throw new CustomException("Class is full. Please add to waitlist instead");
            }
            UserPackage currentUserPackage = userPackageRepository.findById(finalUserPackageId)
                    .orElseThrow(() -> new EntityNotFoundException("User package not found"));
            // ... save booking, deduct credits, bookedSlots++
        });
```

**Interview line:** Without the lock, two requests could both read “4/5 slots”, both pass the check, and both save → **6/5**. The lock forces those updates to happen **one after another** for the same schedule.

---

## 3) "Why did you use Redis here?"
**Suggested answer**
Redis is used in three places:
- distributed lock for concurrent booking protection,
- cache for CRUD response acceleration,
- temporary token storage for email verification and password reset.
It gives low-latency operations and helps ensure correctness under high concurrency.

**1) Distributed lock (booking / cancel / waitlist)**  
Same pattern as Q2: `RedisLockUtil` + `executeWithLock` in `ScheduleServiceImpl` for `bookClass`, `cancelBooking`, and `addToWaitlist`.

**2) Temporary auth tokens**  
`AuthTokenRedisService` stores JSON payloads under keys like `booking:auth:email-verify:{token}` and `booking:auth:pwd-reset:{token}` via `StringRedisTemplate`.

```27:37:src/main/java/com/alvin/bookingsystem/service/AuthTokenRedisService.java
    public void saveEmailVerification(String token, Long userId, LocalDateTime expiresAt) {
        var data = EmailVerificationTokenData.builder()
                .userId(userId)
                .expiresAt(expiresAt)
                .used(false)
                .verifiedAt(null)
                .build();
        stringRedisTemplate.opsForValue().set(
                EMAIL_PREFIX + token,
                writeJson(data),
                ttlUntilCleanup(expiresAt));
    }
```
*(Password reset uses `PWD_PREFIX` the same way.)*

**3) CRUD response cache**  
Spring Cache is backed by Redis (`spring.cache.type=redis` in `application.properties`). `BaseServiceImpl` + `CrudResponseCache` cache `findById`/CRUD responses per region; jobs evict when they batch-update packages or waitlists.

---

## 4) "Explain your cancellation refund rule."
**Suggested answer**
When a user cancels, I compare current time with class start time.  
If cancellation is earlier than 4 hours before start, credits are refunded; within 4 hours, no refund.  
Then the booking status is updated and slot is released. If waitlist exists, first waiting user is promoted.

**In code**
Class constant `CANCELLATION_REFUND_HOURS = 4` (line 41 in `ScheduleServiceImpl`). Refund when `classStart.isAfter(now.plusHours(4))` — i.e. cancellation happens when the class start is still **strictly more than 4 hours in the future**. Cancel runs inside the same Redis lock as booking for that schedule: mark `CANCELLED`, optionally refund credits to `UserPackage`, decrement `bookedSlots`, then `promoteWaitlist`.

```196:223:src/main/java/com/alvin/bookingsystem/service/impl/ScheduleServiceImpl.java
        ClassSchedule classSchedule = booking.getClassSchedule();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime classStart = classSchedule.getClassDateTime();
        boolean shouldRefund = classStart.isAfter(now.plusHours(CANCELLATION_REFUND_HOURS));

        redisLockUtil.executeWithLock(classSchedule.getId(), () -> {
            booking.setStatus(Booking.Status.CANCELLED);
            booking.setCancelledAt(now);
            bookingRepository.save(booking);

            if (shouldRefund && !booking.getCreditRefunded()) {
                UserPackage userPackage = booking.getUserPackage();
                userPackage.setRemainingCredits(userPackage.getRemainingCredits() + booking.getCreditsUsed());
                userPackageRepository.save(userPackage);
                evictUserPackageCache(userPackage.getId());
                booking.setCreditRefunded(true);
                bookingRepository.save(booking);
                log.info("Credits refunded for cancelled booking {}", bookingId);
            }

            classSchedule.setBookedSlots(Math.max(0, classSchedule.getBookedSlots() - 1));
            classScheduleRepository.save(classSchedule);

            promoteWaitlist(classSchedule);

            log.info("User {} cancelled booking {}", userId, bookingId);
            return null;
        });
```

---

## 5) "How does waitlist work?"
**Suggested answer**
If class is full, user joins waitlist with FIFO position.  
When an active booking is cancelled, the first waiting user is promoted to BOOKED.  
Credits are reserved at waitlist join; on promotion, no second deduction.  
If class ends while user is still WAITING, Quartz refund job returns reserved credits and marks waitlist as REFUNDED.

**In code — join (only when full + lock)**
`addToWaitlist` uses `executeWithLock`. It rejects if `bookedSlots < maxSlots` (must book normally). It assigns `position` from max+1, saves `Waitlist` with `WAITING`, then deducts `creditsReserved` from `UserPackage` (reserve at join).

```285:317:src/main/java/com/alvin/bookingsystem/service/impl/ScheduleServiceImpl.java
        return redisLockUtil.executeWithLock(classScheduleId, () -> {
            // ...
            if (currentClassSchedule.getBookedSlots() < currentClassSchedule.getMaxSlots()) {
                throw new CustomException("Class has available slots. Please book directly instead");
            }
            // ... save waitlist with position, creditsReserved ...
            currentUserPackage.setRemainingCredits(currentUserPackage.getRemainingCredits() - requiredCredits);
            userPackageRepository.save(currentUserPackage);
```

**In code — FIFO promotion**
After a cancel frees a slot, `promoteWaitlist` loads `findWaitingEntriesByClassScheduleIdOrderByPosition`, takes the first `WAITING` row, creates a `Booking` with `creditsUsed == creditsReserved`, marks waitlist `PROMOTED`, increments `bookedSlots` — **no second credit deduction** on the package.

```409:444:src/main/java/com/alvin/bookingsystem/service/impl/ScheduleServiceImpl.java
        List<Waitlist> waitingEntries = waitlistRepository.findWaitingEntriesByClassScheduleIdOrderByPosition(classSchedule.getId());
        Waitlist firstWaitlist = waitingEntries.getFirst();
        Booking booking = Booking.builder()
                // ...
                .creditsUsed(firstWaitlist.getCreditsReserved())
                .status(Booking.Status.BOOKED)
                // ...
        firstWaitlist.setStatus(Waitlist.Status.PROMOTED);
        classSchedule.setBookedSlots(classSchedule.getBookedSlots() + 1);
```

**In code — refund after class end (Quartz)**  
`WaitlistRefundJob` loads waitlists still `WAITING` whose class **end time** is before now (repository query + native SQL), adds `creditsReserved` back to the package, sets status `REFUNDED`.

```51:64:src/main/java/com/alvin/bookingsystem/job/WaitlistRefundJob.java
    public void execute(JobExecutionContext context) throws JobExecutionException {
        // ...
            List<Waitlist> waitlistsToRefund = waitlistRepository.findWaitlistsToRefund(LocalDateTime.now());
```

---

## 6) "How do you prevent users from booking overlapping classes?"
**Suggested answer**
Before booking, I calculate requested class start/end using class duration, then query user active bookings for time overlap.  
If overlap exists, booking is rejected with a clear error.

**In code — service**
Compute `[classStart, classEnd)` from `classDateTime` + `durationMinutes`, then call `bookingRepository.findOverlappingBookings(...)`, excluding the current schedule id.

```94:104:src/main/java/com/alvin/bookingsystem/service/impl/ScheduleServiceImpl.java
        LocalDateTime classStart = classSchedule.getClassDateTime();
        LocalDateTime classEnd = classStart.plusMinutes(classDefinition.getDurationMinutes());
        
        List<Booking> overlappingBookings = bookingRepository.findOverlappingBookings(
                userId, classStart, classEnd, classSchedule.getId());
        
        if (!overlappingBookings.isEmpty()) {
            throw new CustomException("You have an overlapping booking at this time");
        }
```

**In code — query**
Native SQL: other active bookings whose schedule interval **intersects** `[startTime, endTime)` (PostgreSQL interval arithmetic on `class_datetime` + `duration_minutes`).

```23:38:src/main/java/com/alvin/bookingsystem/domain/repository/BookingRepository.java
    @Query(value = """
        SELECT b.* FROM bookings b
        JOIN class_schedules cs ON b.class_schedule_id = cs.id
        JOIN class_definitions cd ON cs.class_definition_id = cd.id
        WHERE b.user_id = :userId
          AND b.status IN ('BOOKED', 'CHECKED_IN')
          AND cs.id != :excludeScheduleId
          AND cs.class_datetime < :endTime
          AND (cs.class_datetime + (cd.duration_minutes || ' minutes')::INTERVAL) > :startTime
        """, nativeQuery = true)
    List<Booking> findOverlappingBookings( ... );
```

## 7) "How is authentication implemented?"
**Suggested answer**
Public endpoints allow register/login/verify/reset flows.  
After login, API uses Bearer JWT with Spring Security filter.  
The filter validates token and sets authenticated user context for protected `/api/**` endpoints.

## 8) "How did you handle email verification and payment?"
**Suggested answer**
Per test requirements, external integrations are mocked.  
I implemented mock functions for sending verify email and charging payment, with success/failure paths handled by service-level exception logic.

## 9) "What database design decisions did you make?"
**Suggested answer**
Main entities are `users`, `credit_packages`, `user_packages`, `class_definitions`, `class_schedules`, `bookings`, and `waitlists`.  
Packages/classes are country-scoped, bookings and waitlists link to user package for credit accounting, and audit fields are included.  
I added indexes on frequent filters like status, country, and schedule datetime.

## 10) "How do scheduled jobs help this system?"
**Suggested answer**
Quartz jobs automate background consistency tasks, such as:
- expiring user packages,
- refunding waitlist credits for unpromoted users after class end.
This keeps user balances and statuses correct without manual intervention.

**In code — Quartz `Job` classes**
Both jobs implement `org.quartz.Job`, are `@Component`, and use `@DisallowConcurrentExecution` so one run does not overlap itself. Each checks a feature flag from properties (`quartz.job.*.enabled`) before doing work.

**Expired packages — `ExpiredUserPackageJob`**
Loads active packages past `expiresAt`, marks them `EXPIRED` (and related batch/cache eviction in the rest of the class).

```28:64:src/main/java/com/alvin/bookingsystem/job/ExpiredUserPackageJob.java
@Component
@DisallowConcurrentExecution
public class ExpiredUserPackageJob implements Job {
    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        if (!jobEnabled) {
            log.info("ExpiredUserPackageJob is disabled. Skipping execution.");
            return;
        }
        // ...
            List<UserPackage> expiredPackages = userPackageRepository.findExpiredActivePackages(LocalDateTime.now());
            if (expiredPackages.isEmpty()) {
                log.info("No expired packages found. Job completed.");
                return;
            }
```

**Waitlist refunds — `WaitlistRefundJob`**
Finds `WAITING` rows whose class has already ended (`findWaitlistsToRefund(now)`), credits the package back, sets waitlist to `REFUNDED`, optionally evicts Redis CRUD cache for that user package and waitlist.

```28:68:src/main/java/com/alvin/bookingsystem/job/WaitlistRefundJob.java
@Component
@DisallowConcurrentExecution
public class WaitlistRefundJob implements Job {
    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        if (!jobEnabled) {
            log.info("WaitlistRefundJob is disabled. Skipping execution.");
            return;
        }
        // ...
            List<Waitlist> waitlistsToRefund = waitlistRepository.findWaitlistsToRefund(LocalDateTime.now());
            if (waitlistsToRefund.isEmpty()) {
                log.info("No waitlists to refund. Job completed.");
                return;
            }
```

**Interview line:** “The API handles synchronous user flows; Quartz handles **time-based reconciliation** so we don’t rely on a user action after the class ends.”

## 11) "How did you test your implementation?"
**Suggested answer**
I validated key flows manually through Swagger using an E2E checklist:
register -> verify -> login -> purchase -> book -> cancel -> waitlist -> promote -> refund job.  
I also tested concurrency-sensitive behavior by forcing low slot limits and simulating competing bookings.

## 12) "What would you improve if given more time?"
**Suggested answer**
- Add more integration/load tests (especially for concurrency and schedule edge cases).
- Add observability (metrics/tracing, lock contention metrics, job execution metrics).
- Harden idempotency and retry strategies for distributed operations.
- Add role-based admin controls for CRUD endpoints.

## 13) "What was the hardest part?"
**Suggested answer**
The hardest part was balancing correctness and performance in booking concurrency and waitlist credit lifecycle.  
I solved it by using Redis lock + transactional updates, then refining credit reserve/refund behavior to avoid double deduction or inflated balance.

**How to say it with code (STAR-style)**

- **Situation:** Many users can hit “book” or “waitlist” at once; credits must stay consistent.
- **Task:** No overbooking; waitlist users must not get free credits or lose paid credits incorrectly.
- **Action:**  
  - **Concurrency:** `RedisLockUtil.executeWithLock(scheduleId)` around the critical section that reads `bookedSlots`/`maxSlots` and updates DB (`ScheduleServiceImpl`).  
  - **Waitlist credits:** Deduct when joining waitlist (same as holding a slot in spirit); on FIFO **promotion**, **do not** deduct again — `promoteWaitlist` only creates `Booking` and bumps `bookedSlots`.  
  - **Cleanup:** `WaitlistRefundJob` refunds `creditsReserved` if still `WAITING` after class end.
- **Result:** Correct slot counts under contention; credit ledger matches “reserved → booked OR refunded”.

**Tradeoff to mention:** Redis lock TTL (5s) — if work runs longer than TTL, another thread could acquire the lock (you can mention you’d monitor this and tune TTL or use Redlock-style patterns in production if needed).

**Files to reference if pressed:**  
`RedisLockUtil.java`, `ScheduleServiceImpl.java` (`bookClass`, `addToWaitlist`, `cancelBooking`, `promoteWaitlist`), `WaitlistRefundJob.java`.

## 14) "If Redis is down, what happens?"
**Suggested answer**
Current lock-based booking flow depends on Redis for safe concurrent control.  
In production, I would add fallback strategy (or fail-safe mode), alerts, and possibly DB-level locking alternative for graceful degradation.

## 15) "Why this stack?"
**Suggested answer**
It maps directly to the assignment requirements and is production-proven:
Spring Boot for fast API development, JPA/PostgreSQL for relational consistency, Redis for performance and lock, Quartz for scheduling, and Swagger for easy verification.

---

## Quick 60-second pitch (memorize)
I built a Java Spring Boot booking API with PostgreSQL, JPA, Redis, Quartz, JWT, and Swagger.  
It supports full user, package, and schedule modules with strict business rules: country-based booking, credit deduction/refund, overlap prevention, FIFO waitlist promotion, and check-in.  
I handled concurrency with Redis distributed locking to prevent overbooking during simultaneous requests.  
I also added ER documentation, mock external integrations, and CI to keep it testable and review-friendly.

## Interview tips (practical)
- Keep answers structured: **problem -> approach -> result**.
- Mention tradeoffs honestly (e.g., Redis dependency).
- Use one concrete example with numbers (credits before/after).
- If unsure, say what you'd validate in production (metrics, tests, fallback).
