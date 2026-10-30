package com.nalamnagar.model;

import java.util.Objects;

/**
 * Immutable session entity representing an authenticated user session.
 * Demonstrates OOP Immutability: state is set once at construction and cannot be mutated,
 * providing thread-safety and predictable token verification.
 * Used within HashMap<String, Session> for O(1) session lookup.
 */
public class Session {
    private final String token;
    private final String userEmail;
    private final long createdAtEpochMs;
    private final long expiresAtEpochMs;

    public Session(String token, String userEmail, long expiresAtEpochMs) {
        this.token = token;
        this.userEmail = userEmail;
        this.createdAtEpochMs = System.currentTimeMillis();
        this.expiresAtEpochMs = expiresAtEpochMs;
    }

    public String getToken() {
        return token;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public long getCreatedAtEpochMs() {
        return createdAtEpochMs;
    }

    public long getExpiresAtEpochMs() {
        return expiresAtEpochMs;
    }

    /**
     * Checks if the session has expired past its validity window.
     * @return true if current time exceeds expiresAtEpochMs
     */
    public boolean isExpired() {
        return System.currentTimeMillis() > expiresAtEpochMs;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Session session = (Session) o;
        return Objects.equals(token, session.token);
    }

    @Override
    public int hashCode() {
        return Objects.hash(token);
    }

    @Override
    public String toString() {
        return "Session{" +
                "token='" + token + '\'' +
                ", userEmail='" + userEmail + '\'' +
                ", createdAtEpochMs=" + createdAtEpochMs +
                ", expiresAtEpochMs=" + expiresAtEpochMs +
                ", expired=" + isExpired() +
                '}';
    }
}
