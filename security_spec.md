# Security Specification - Sharks Olympic Academy

## Data Invariants
1. A Student Evaluation must be linked to a valid Student ID.
2. A Student Media record must be linked to a valid Student ID.
3. Coaches can only manage (create/update) students, bookings, and attendance if they are authenticated and authorized as a coach.
4. Admins have full access to all collections.
5. Users can only see their own attendance records (if they are coaches).
6. Students and their related data (media, evaluations) are generally viewable by all authenticated staff (coaches/admins).

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a student evaluation with a `coach_id` that doesn't match the requester's UID.
2. **Privilege Escalation**: Non-admin user trying to update their own role to 'admin' in the `users` collection.
3. **Orphaned Writes**: Creating a booking for a non-existent student ID.
4. **ID Poisoning**: Using a 2KB string as a document ID for a new student.
5. **State Shortcutting**: Updating a booking status to 'cancelled' without authorization.
6. **Immutable Field Tampering**: Changing the `createdAt` timestamp of a student record.
7. **Resource Exhaustion**: Sending a 1MB string in the `full_name` field of a student.
8. **PII Leakage**: Generic user attempting to list the `users` collection to scrape emails.
9. **Fake Attendance**: A coach trying to check out for a session they haven't checked into (or for another coach).
10. **Malicious Media**: Uploading a media record with a URL that is not a valid HTTPS string.
11. **Negative Salary**: Admin attempting to set a coach's salary to -500.
12. **Future Timestamps**: Setting `date` field to a future date in an evaluation.

## Test Runner (Logic Verification)
The following tests will be implemented in `firestore.rules.test.ts` (conceptually) and verified against the rules.

- [ ] REJECT: Unauthenticated read/write to any collection.
- [ ] REJECT: Non-admin trying to delete a student.
- [ ] REJECT: Coach trying to update another coach's profile.
- [ ] ALLOW: Admin reading all student evaluations.
- [ ] ALLOW: Coach creating a media record for an existing student.
- [ ] REJECT: Setting `role` to 'admin' unless the requester is already an admin.
