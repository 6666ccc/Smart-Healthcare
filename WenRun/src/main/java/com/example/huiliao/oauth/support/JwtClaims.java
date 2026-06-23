package com.example.huiliao.oauth.support;

public final class JwtClaims {

    public static final String USERNAME = "username";
    public static final String ACCOUNT_TYPE = "account_type";
    public static final String PORTAL_TYPE = "portal_type";
    public static final String ROLES = "roles";
    public static final String STAFF_ID = "staff_id";
    public static final String PATIENT_ID = "patient_id";
    public static final String CLIENT_ID = "client_id";
    public static final String TOKEN_TYPE = "token_type";
    public static final String SCOPE = "scope";

    public static final String TOKEN_TYPE_USER = "user";
    public static final String TOKEN_TYPE_CLIENT = "client";

    private JwtClaims() {
    }
}
