package com.nalamnagar.exception;

// Custom exception for authentication/authorization failures
public class AuthException extends NalamNagarException {
    public AuthException(String message) {
        super(message);
    }
}
