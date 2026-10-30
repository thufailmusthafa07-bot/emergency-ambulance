package com.nalamnagar.auth;

import com.nalamnagar.exception.AuthException;
import com.nalamnagar.model.Role;
import com.nalamnagar.model.Session;
import com.nalamnagar.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class AuthServiceTest {
    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService();
    }

    @Test
    void signupStoresSaltedHashAndAssignsOperatorRole() {
        User registered = authService.signup(
                "Test Operator", "operator@example.com", "SecurePass1", "SecurePass1");
        User stored = authService.getUserByEmail("operator@example.com");

        assertEquals(Role.OPERATOR, registered.getRole());
        assertNotEquals("SecurePass1", stored.getPasswordHash());
        assertEquals(16, Base64.getDecoder().decode(stored.getSalt()).length);
    }

    @Test
    void signupRejectsDuplicateEmailIgnoringCase() {
        authService.signup("Test Operator", "operator@example.com", "SecurePass1", "SecurePass1");

        assertThrows(AuthException.class, () -> authService.signup(
                "Another Operator", "OPERATOR@example.com", "SecurePass2", "SecurePass2"));
    }

    @Test
    void loginCreatesSessionAndLogoutRevokesIt() {
        authService.signup("Test Operator", "operator@example.com", "SecurePass1", "SecurePass1");

        Session session = authService.login("operator@example.com", "SecurePass1");
        assertEquals("operator@example.com", authService.validateSession(session.getToken()).getEmail());

        authService.logout(session.getToken());
        assertThrows(AuthException.class, () -> authService.validateSession(session.getToken()));
    }

    @Test
    void loginUsesGenericErrorForIncorrectPassword() {
        authService.signup("Test Operator", "operator@example.com", "SecurePass1", "SecurePass1");

        AuthException error = assertThrows(AuthException.class,
                () -> authService.login("operator@example.com", "WrongPass1"));
        assertEquals("Email or password is incorrect", error.getMessage());
    }

    @Test
    void repeatedFailedLoginsLockTheAccount() {
        authService.signup("Test Operator", "operator@example.com", "SecurePass1", "SecurePass1");

        for (int attempt = 0; attempt < 4; attempt++) {
            assertThrows(AuthException.class,
                    () -> authService.login("operator@example.com", "WrongPass1"));
        }
        AuthException lockout = assertThrows(AuthException.class,
                () -> authService.login("operator@example.com", "WrongPass1"));
        assertTrue(lockout.getMessage().toLowerCase().contains("locked"));
        assertThrows(AuthException.class,
                () -> authService.login("operator@example.com", "SecurePass1"));
    }
}