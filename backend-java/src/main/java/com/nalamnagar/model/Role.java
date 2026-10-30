package com.nalamnagar.model;

// Enum: Operator vs Admin role (OOP: enum with controlled values)
public enum Role {
    ADMIN, OPERATOR;

    public static Role fromString(String s) {
        if (s == null) return OPERATOR;
        try { return valueOf(s.toUpperCase()); }
        catch (IllegalArgumentException e) { return OPERATOR; }
    }
}
