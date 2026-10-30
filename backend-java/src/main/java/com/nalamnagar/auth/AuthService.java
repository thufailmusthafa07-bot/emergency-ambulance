package com.nalamnagar.auth;

import com.nalamnagar.exception.AuthException;
import com.nalamnagar.model.Role;
import com.nalamnagar.model.Session;
import com.nalamnagar.model.User;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.*;

/**
 * AuthService — handles user registration, login, logout, session management and password changes.
 *
 * Data structures used (justify each):
 *   HashMap<String, User> usersByEmail — O(1) lookup by email during login/signup.
 *   HashMap<String, Session> sessionsByToken — O(1) session validation on every API request.
 *
 * Security:
 *   PBKDF2WithHmacSHA256 with 65536 iterations and 256-bit key for password hashing.
 *   16-byte random salt per user (SecureRandom).
 *   Constant-time comparison via MessageDigest.isEqual to prevent timing attacks.
 *   Account lockout after 5 failed attempts for 2 minutes.
 *   Never stores or logs plain-text passwords.
 *
 * OOP: Encapsulation — all fields private, service methods enforce business rules.
 */
public class AuthService {

    // HashMap for O(1) user lookup by email
    private final Map<String, User> usersByEmail = new HashMap<>();

    // HashMap for O(1) session lookup by token
    private final Map<String, Session> sessionsByToken = new HashMap<>();

    private static final long SESSION_DURATION_MS = 2L * 60 * 60 * 1000; // 2 hours
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCK_DURATION_MS = 2L * 60 * 1000; // 2 minutes
    private static final int PBKDF2_ITERATIONS = 65536;
    private static final int KEY_LENGTH = 256;
    private static final String HASH_ALGORITHM = "PBKDF2WithHmacSHA256";

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Constructor seeds one ADMIN account so the system always has an administrator.
     */
    public AuthService() {
        try {
            byte[] salt = generateSalt();
            String saltBase64 = Base64.getEncoder().encodeToString(salt);
            String hash = hashPassword("Admin@123", salt);
            User admin = new User("admin-001", "System Administrator",
                    "admin@nalamnagar.gov", hash, saltBase64, Role.ADMIN);
            usersByEmail.put(admin.getEmail().toLowerCase(), admin);
            System.out.println("  [AUTH] Seeded ADMIN account: admin@nalamnagar.gov");
        } catch (Exception e) {
            System.err.println("  [AUTH] Failed to seed admin: " + e.getMessage());
        }
    }

    // ───────── Password Hashing (PBKDF2WithHmacSHA256) ─────────

    /**
     * Generates a 16-byte cryptographically secure random salt.
     */
    public byte[] generateSalt() {
        byte[] salt = new byte[16];
        secureRandom.nextBytes(salt);
        return salt;
    }

    /**
     * Hashes a password using PBKDF2WithHmacSHA256 with the given salt.
     * Returns the Base64-encoded hash string.
     */
    public String hashPassword(String password, byte[] salt) {
        try {
            PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, PBKDF2_ITERATIONS, KEY_LENGTH);
            SecretKeyFactory factory = SecretKeyFactory.getInstance(HASH_ALGORITHM);
            byte[] hash = factory.generateSecret(spec).getEncoded();
            spec.clearPassword(); // Security: clear password from memory
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new RuntimeException("Password hashing failed", e);
        }
    }

    /**
     * Verifies a password against a stored hash using constant-time comparison.
     * Prevents timing-based side-channel attacks.
     */
    private boolean verifyPassword(String password, String storedHash, String saltBase64) {
        byte[] salt = Base64.getDecoder().decode(saltBase64);
        String computedHash = hashPassword(password, salt);
        // Constant-time comparison to prevent timing attacks
        return MessageDigest.isEqual(
                computedHash.getBytes(),
                storedHash.getBytes()
        );
    }

    // ───────── Signup ─────────

    /**
     * Registers a new user with OPERATOR role.
     * Validates: email format, password strength (>= 8 chars, letter + digit), passwords match, unique email.
     */
    public synchronized User signup(String fullName, String email, String password, String confirmPassword) {
        // Validate full name
        if (fullName == null || fullName.trim().isEmpty()) {
            throw new AuthException("Full name is required");
        }

        // Validate email format
        if (email == null || email.trim().isEmpty()) {
            throw new AuthException("Email is required");
        }
        email = email.trim().toLowerCase();
        if (!email.contains("@") || !email.contains(".")) {
            throw new AuthException("Invalid email format");
        }

        // Validate password strength
        if (password == null || password.length() < 8) {
            throw new AuthException("Password must be at least 8 characters");
        }
        boolean hasLetter = false, hasDigit = false;
        for (char c : password.toCharArray()) {
            if (Character.isLetter(c)) hasLetter = true;
            if (Character.isDigit(c)) hasDigit = true;
        }
        if (!hasLetter || !hasDigit) {
            throw new AuthException("Password must contain at least one letter and one digit");
        }

        // Passwords must match
        if (confirmPassword == null || !password.equals(confirmPassword)) {
            throw new AuthException("Passwords do not match");
        }

        // Email uniqueness check
        if (usersByEmail.containsKey(email)) {
            throw new AuthException("An account with this email already exists");
        }

        // Hash password with random salt
        byte[] salt = generateSalt();
        String saltBase64 = Base64.getEncoder().encodeToString(salt);
        String hash = hashPassword(password, salt);

        // New users always get OPERATOR role — no self-signup as admin
        User user = new User(fullName.trim(), email, hash, saltBase64, Role.OPERATOR);
        usersByEmail.put(email, user);

        System.out.println("  [AUTH] New signup: " + email + " (OPERATOR)");
        return user;
    }

    // ───────── Login ─────────

    /**
     * Authenticates a user and creates a session.
     * Generic error message: "Email or password is incorrect" — never reveals which one is wrong.
     * Locks account after 5 failed attempts for 2 minutes.
     */
    public synchronized Session login(String email, String password) {
        if (email == null || email.trim().isEmpty() || password == null) {
            throw new AuthException("Email or password is incorrect");
        }
        email = email.trim().toLowerCase();

        User user = usersByEmail.get(email);

        // User not found — generic message (never reveal that the email doesn't exist)
        if (user == null) {
            throw new AuthException("Email or password is incorrect");
        }

        // Check account lock
        if (user.isLocked()) {
            long remainingSec = (user.getLockUntilEpochMs() - System.currentTimeMillis()) / 1000;
            throw new AuthException("Account is locked. Try again in " + remainingSec + " seconds");
        }

        // Verify password
        if (!verifyPassword(password, user.getPasswordHash(), user.getSalt())) {
            user.incrementFailedAttempts();
            if (user.getFailedLoginAttempts() >= MAX_FAILED_ATTEMPTS) {
                user.lockFor(LOCK_DURATION_MS);
                throw new AuthException("Account locked after " + MAX_FAILED_ATTEMPTS +
                        " failed attempts. Try again in 2 minutes");
            }
            throw new AuthException("Email or password is incorrect");
        }

        // Success — reset counters and create session
        user.resetFailedAttempts();
        String token = UUID.randomUUID().toString();
        long expiresAt = System.currentTimeMillis() + SESSION_DURATION_MS;
        Session session = new Session(token, user.getEmail(), expiresAt);
        sessionsByToken.put(token, session);

        System.out.println("  [AUTH] Login: " + email + " [" + user.getRole() + "]");
        return session;
    }

    // ───────── Logout ─────────

    /**
     * Invalidates a session by removing the token from the session map.
     */
    public synchronized void logout(String token) {
        if (token != null) {
            Session removed = sessionsByToken.remove(token);
            if (removed != null) {
                System.out.println("  [AUTH] Logout: " + removed.getUserEmail());
            }
        }
    }

    // ───────── Session Validation ─────────

    /**
     * Validates a session token and returns the authenticated user.
     * Removes expired sessions automatically.
     */
    public synchronized User validateSession(String token) {
        if (token == null || token.trim().isEmpty()) {
            throw new AuthException("Authentication required");
        }

        Session session = sessionsByToken.get(token);
        if (session == null) {
            throw new AuthException("Invalid or expired session");
        }

        if (session.isExpired()) {
            sessionsByToken.remove(token);
            throw new AuthException("Session expired. Please log in again");
        }

        User user = usersByEmail.get(session.getUserEmail());
        if (user == null) {
            sessionsByToken.remove(token);
            throw new AuthException("User account not found");
        }

        return user;
    }

    /**
     * Extracts the Bearer token from an Authorization header.
     * Expected format: "Bearer <token>"
     */
    public String getSessionFromHeader(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new AuthException("Authentication required");
        }
        return authHeader.substring(7).trim();
    }

    // ───────── Password Change ─────────

    /**
     * Changes a user's password after verifying the current password.
     */
    public synchronized void changePassword(String email, String currentPassword, String newPassword) {
        User user = usersByEmail.get(email.toLowerCase());
        if (user == null) {
            throw new AuthException("User not found");
        }

        // Verify current password
        if (!verifyPassword(currentPassword, user.getPasswordHash(), user.getSalt())) {
            throw new AuthException("Current password is incorrect");
        }

        // Validate new password
        if (newPassword == null || newPassword.length() < 8) {
            throw new AuthException("New password must be at least 8 characters");
        }
        boolean hasLetter = false, hasDigit = false;
        for (char c : newPassword.toCharArray()) {
            if (Character.isLetter(c)) hasLetter = true;
            if (Character.isDigit(c)) hasDigit = true;
        }
        if (!hasLetter || !hasDigit) {
            throw new AuthException("New password must contain at least one letter and one digit");
        }

        // Hash and store new password
        byte[] salt = generateSalt();
        user.setSalt(Base64.getEncoder().encodeToString(salt));
        user.setPasswordHash(hashPassword(newPassword, salt));

        System.out.println("  [AUTH] Password changed: " + email);
    }

    // ───────── Accessors ─────────

    public synchronized User getUserByEmail(String email) {
        return usersByEmail.get(email.toLowerCase());
    }

    public synchronized Collection<User> getAllUsers() {
        return Collections.unmodifiableList(new ArrayList<>(usersByEmail.values()));
    }

    public synchronized int getActiveSessionCount() {
        // Clean expired sessions and return count
        sessionsByToken.entrySet().removeIf(e -> e.getValue().isExpired());
        return sessionsByToken.size();
    }
}
