package com.nalamnagar.model;

/**
 * Enumeration representing operator-assigned emergency triage severity levels.
 * Priority order: CRITICAL (highest) > SERIOUS > MINOR (lowest).
 */
public enum Severity {
    CRITICAL(1, "Critical - Immediate Life Threat"),
    SERIOUS(2, "Serious - Urgent Medical Need"),
    MINOR(3, "Minor - Non-Life Threatening");

    private final int rank;
    private final String description;

    Severity(int rank, String description) {
        this.rank = rank;
        this.description = description;
    }

    public int getRank() {
        return rank;
    }

    public String getDescription() {
        return description;
    }

    public static Severity fromString(String val) {
        if (val == null || val.trim().isEmpty()) {
            return MINOR;
        }
        String clean = val.trim().toUpperCase();
        for (Severity s : values()) {
            if (s.name().equals(clean) || s.description.toUpperCase().contains(clean)) {
                return s;
            }
        }
        return MINOR;
    }
}
