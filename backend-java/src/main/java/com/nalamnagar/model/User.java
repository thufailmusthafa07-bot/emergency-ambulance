package com.nalamnagar.model;

import java.util.Objects;
import java.util.UUID;

/**
 * User domain entity representing an authenticated user in the emergency dispatch system.
 * Demonstrates OOP Encapsulation: internal state is protected via private fields,
 * with controlled access and validation enforced through public getters and setters.
 */
public class User {
    // OOP Encapsulation: private member variables ensure internal state cannot be arbitrarily corrupted
    private String id;
    private String fullName;
    private String email;
    private String passwordHash;
    private String salt;
    private Role role;
    private int failedLoginAttempts;
    private long lockUntilEpochMs;

    public User(String id, String fullName, String email, String passwordHash, String salt, Role role) {
        validateFullName(fullName);
        validateEmail(email);
        this.id = (id != null && !id.trim().isEmpty()) ? id.trim() : UUID.randomUUID().toString();
        this.fullName = fullName.trim();
        this.email = email.trim();
        this.passwordHash = passwordHash;
        this.salt = salt;
        this.role = (role != null) ? role : Role.OPERATOR;
        this.failedLoginAttempts = 0;
        this.lockUntilEpochMs = 0L;
    }

    public User(String fullName, String email, String passwordHash, String salt, Role role) {
        this(UUID.randomUUID().toString(), fullName, email, passwordHash, salt, role);
    }

    // OOP Encapsulation: Validation helpers protect object integrity
    private void validateFullName(String fullName) {
        if (fullName == null || fullName.trim().isEmpty()) {
            throw new IllegalArgumentException("Full name cannot be null or empty");
        }
    }

    private void validateEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be null or empty");
        }
    }

    // Encapsulation: getters and setters with appropriate validation
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        validateFullName(fullName);
        this.fullName = fullName.trim();
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        validateEmail(email);
        this.email = email.trim();
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getSalt() {
        return salt;
    }

    public void setSalt(String salt) {
        this.salt = salt;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = (role != null) ? role : Role.OPERATOR;
    }

    public int getFailedLoginAttempts() {
        return failedLoginAttempts;
    }

    public void setFailedLoginAttempts(int failedLoginAttempts) {
        this.failedLoginAttempts = failedLoginAttempts;
    }

    public long getLockUntilEpochMs() {
        return lockUntilEpochMs;
    }

    public void setLockUntilEpochMs(long lockUntilEpochMs) {
        this.lockUntilEpochMs = lockUntilEpochMs;
    }

    /**
     * Checks if the user account is currently locked due to exceeded login failures.
     * @return true if current time is prior to lockUntilEpochMs
     */
    public boolean isLocked() {
        return lockUntilEpochMs > System.currentTimeMillis();
    }

    /**
     * Increments the count of failed login attempts.
     */
    public void incrementFailedAttempts() {
        this.failedLoginAttempts++;
    }

    /**
     * Resets failed login attempts count and clears any active lock.
     */
    public void resetFailedAttempts() {
        this.failedLoginAttempts = 0;
        this.lockUntilEpochMs = 0L;
    }

    /**
     * Locks the account for the specified duration in milliseconds.
     * @param durationMs duration to lock out in milliseconds
     */
    public void lockFor(long durationMs) {
        this.lockUntilEpochMs = System.currentTimeMillis() + durationMs;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(email != null ? email.toLowerCase() : null,
                user.email != null ? user.email.toLowerCase() : null);
    }

    @Override
    public int hashCode() {
        return Objects.hash(email != null ? email.toLowerCase() : null);
    }

    @Override
    public String toString() {
        return "User{" +
                "id='" + id + '\'' +
                ", fullName='" + fullName + '\'' +
                ", email='" + email + '\'' +
                ", role=" + role +
                ", isLocked=" + isLocked() +
                '}';
    }
}
