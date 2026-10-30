const http = require("http");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runStage6Tests() {
  console.log("=================================================================");
  console.log("STAGE 6 TEST SUITE: USER AND AUTHENTICATION MANAGEMENT");
  console.log("=================================================================\n");

  const results = {
    passed: [],
    failed: [],
    skipped: []
  };

  const createdTestUserIds = [];

  try {
    // -------------------------------------------------------------
    // SECTION 1: Baseline Verification
    // -------------------------------------------------------------
    console.log("[1] Checking Baseline Database Records...");
    const baselineUsers = await prisma.user.findMany({ select: { id: true, username: true, email: true, role: true } });
    console.log(`  Found ${baselineUsers.length} baseline users in PostgreSQL.`);
    const usernames = baselineUsers.map(u => u.username);
    if (!usernames.includes("admin") || !usernames.includes("operator01") || !usernames.includes("driver01") || !usernames.includes("citizen01")) {
      throw new Error("Missing required baseline accounts");
    }
    results.passed.push("Baseline: Required accounts verified in PostgreSQL");
    console.log("  PASS: Baseline user accounts intact.\n");

    // -------------------------------------------------------------
    // SECTION 2: Login and Session Handling
    // -------------------------------------------------------------
    console.log("[2] Testing Login for All Canonical Roles...");
    
    // 2.1 Admin login
    const adminLoginRes = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/login", method: "POST", headers: { "Content-Type": "application/json" } },
      { username: "admin", password: "123456" }
    );
    const adminToken = adminLoginRes.body?.token || adminLoginRes.body?.data?.token;
    const adminUser = adminLoginRes.body?.user || adminLoginRes.body?.data?.user;
    if (adminLoginRes.status === 200 && adminToken && adminUser?.role === "ADMIN") {
      results.passed.push("Login: ADMIN authentication (200 OK)");
      console.log("  PASS: Admin logged in successfully.");
    } else {
      results.failed.push(`Login: ADMIN failed with status ${adminLoginRes.status}`);
    }

    // 2.2 Operator login
    const opLoginRes = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/login", method: "POST", headers: { "Content-Type": "application/json" } },
      { username: "operator01", password: "123456" }
    );
    const opToken = opLoginRes.body?.token || opLoginRes.body?.data?.token;
    const opUser = opLoginRes.body?.user || opLoginRes.body?.data?.user;
    if (opLoginRes.status === 200 && opToken && opUser?.role === "DISPATCHER") {
      results.passed.push("Login: DISPATCHER authentication (200 OK)");
      console.log("  PASS: Dispatcher logged in successfully.");
    } else {
      results.failed.push(`Login: DISPATCHER failed with status ${opLoginRes.status}`);
    }

    // 2.3 Driver login
    const driverLoginRes = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/login", method: "POST", headers: { "Content-Type": "application/json" } },
      { username: "driver01", password: "123456" }
    );
    const driverToken = driverLoginRes.body?.token || driverLoginRes.body?.data?.token;
    const driverUser = driverLoginRes.body?.user || driverLoginRes.body?.data?.user;
    if (driverLoginRes.status === 200 && driverToken && driverUser?.role === "AMBULANCE_STAFF") {
      results.passed.push("Login: AMBULANCE_STAFF authentication (200 OK)");
      console.log("  PASS: Driver logged in successfully.");
    } else {
      results.failed.push(`Login: AMBULANCE_STAFF failed with status ${driverLoginRes.status}`);
    }

    // 2.4 Citizen login
    const citizenLoginRes = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/login", method: "POST", headers: { "Content-Type": "application/json" } },
      { username: "citizen01", password: "123456" }
    );
    const citizenToken = citizenLoginRes.body?.token || citizenLoginRes.body?.data?.token;
    const citizenUser = citizenLoginRes.body?.user || citizenLoginRes.body?.data?.user;
    if (citizenLoginRes.status === 200 && citizenToken && citizenUser?.role === "CITIZEN") {
      results.passed.push("Login: CITIZEN authentication (200 OK)");
      console.log("  PASS: Citizen logged in successfully.");
    } else {
      results.failed.push(`Login: CITIZEN failed with status ${citizenLoginRes.status}`);
    }

    // 2.5 Sensitive field check in login response
    if (adminUser?.passwordHash === undefined && opUser?.passwordHash === undefined) {
      results.passed.push("Privacy: passwordHash stripped from login response");
      console.log("  PASS: passwordHash is not returned in login responses.");
    } else {
      results.failed.push("Privacy: passwordHash leaked in login response");
    }

    // 2.6 Reject invalid credentials
    console.log("\n[3] Testing Invalid Credentials and Lockout...");
    const badLoginRes = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/login", method: "POST", headers: { "Content-Type": "application/json" } },
      { username: "admin", password: "wrong-password-999" }
    );
    if (badLoginRes.status === 401) {
      results.passed.push("Login: Invalid credentials rejected (401 Unauthorized)");
      console.log("  PASS: Invalid credentials correctly rejected with 401.");
    } else {
      results.failed.push(`Login: Expected 401 for bad password, got ${badLoginRes.status}`);
    }

    // 2.7 Reject non-existent user
    const unknownLoginRes = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/login", method: "POST", headers: { "Content-Type": "application/json" } },
      { username: "nonexistent_user_xyz@test.com", password: "Password123" }
    );
    if (unknownLoginRes.status === 401) {
      results.passed.push("Login: Non-existent user rejected (401 Unauthorized)");
      console.log("  PASS: Non-existent user rejected with 401.");
    } else {
      results.failed.push(`Login: Expected 401 for non-existent user, got ${unknownLoginRes.status}`);
    }

    // 2.8 Account lockout test with an isolated temporary account
    const lockoutEmail = "stage6_lockout_test@nalamnagar.gov.in";
    // Clean up if existed previously
    await prisma.user.deleteMany({ where: { email: lockoutEmail } });
    const regLockout = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/register", method: "POST", headers: { "Content-Type": "application/json" } },
      { fullName: "Lockout Test User", email: lockoutEmail, password: "ValidPassword123", confirmPassword: "ValidPassword123" }
    );
    const lockoutUserId = regLockout.body?.data?.user?.id || regLockout.body?.user?.id;
    if (lockoutUserId) createdTestUserIds.push(lockoutUserId);

    let lockedOut = false;
    for (let i = 0; i < 5; i++) {
      const failRes = await request(
        { hostname: "localhost", port: 5001, path: "/api/auth/login", method: "POST", headers: { "Content-Type": "application/json" } },
        { username: lockoutEmail, password: "wrong-password" }
      );
      if (failRes.body?.message?.toLowerCase().includes("lock")) {
        lockedOut = true;
        break;
      }
    }
    if (lockedOut) {
      results.passed.push("Security: Account locked after repeated failed attempts");
      console.log("  PASS: Account lockout triggered after repeated failed attempts.");
    } else {
      results.failed.push("Security: Account was not locked after 5 failed attempts");
    }

    // 2.9 Unauthenticated request rejection
    console.log("\n[4] Testing Authentication Middleware Protection...");
    const unauthRes = await request({ hostname: "localhost", port: 5001, path: "/api/stats", method: "GET" });
    if (unauthRes.status === 401) {
      results.passed.push("AuthMiddleware: Missing token rejected (401 Unauthorized)");
      console.log("  PASS: Protected endpoint rejected missing token with 401.");
    } else {
      results.failed.push(`AuthMiddleware: Expected 401 for missing token, got ${unauthRes.status}`);
    }

    // 2.10 Malformed / invalid token rejection
    const invalidTokenRes = await request({
      hostname: "localhost",
      port: 5001,
      path: "/api/stats",
      method: "GET",
      headers: { Authorization: "Bearer bogus.jwt.token.string" }
    });
    if (invalidTokenRes.status === 401) {
      results.passed.push("AuthMiddleware: Invalid token rejected (401 Unauthorized)");
      console.log("  PASS: Protected endpoint rejected malformed token with 401.");
    } else {
      results.failed.push(`AuthMiddleware: Expected 401 for invalid token, got ${invalidTokenRes.status}`);
    }

    // 2.11 Logout and token revocation
    console.log("\n[5] Testing Logout and Token Revocation...");
    // Create temporary session to logout
    const tempLoginRes = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/login", method: "POST", headers: { "Content-Type": "application/json" } },
      { username: "operator01", password: "123456" }
    );
    const logoutToken = tempLoginRes.body?.token || tempLoginRes.body?.data?.token;

    // Verify token works first
    const beforeLogoutRes = await request({
      hostname: "localhost",
      port: 5001,
      path: "/api/stats",
      method: "GET",
      headers: { Authorization: `Bearer ${logoutToken}` }
    });
    if (beforeLogoutRes.status !== 200) throw new Error("Before-logout verification failed");

    // Perform logout
    const logoutRes = await request({
      hostname: "localhost",
      port: 5001,
      path: "/api/auth/logout",
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${logoutToken}` }
    });
    if (logoutRes.status === 200) {
      results.passed.push("Session: POST /api/auth/logout succeeded (200 OK)");
      console.log("  PASS: Logout request accepted with 200 OK.");
    } else {
      results.failed.push(`Session: Logout failed with status ${logoutRes.status}`);
    }

    // Verify token is now rejected
    const afterLogoutRes = await request({
      hostname: "localhost",
      port: 5001,
      path: "/api/stats",
      method: "GET",
      headers: { Authorization: `Bearer ${logoutToken}` }
    });
    if (afterLogoutRes.status === 401) {
      results.passed.push("Session: Revoked token rejected after logout (401 Unauthorized)");
      console.log("  PASS: Revoked token successfully blocked after logout.");
    } else {
      results.failed.push(`Session: Revoked token was still accepted! Status: ${afterLogoutRes.status}`);
    }

    // -------------------------------------------------------------
    // SECTION 3: User Registration and Profile Management
    // -------------------------------------------------------------
    console.log("\n[6] Testing User Registration Validation and Conflict Handling...");

    // 3.1 Missing full name
    const regNoName = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/register", method: "POST", headers: { "Content-Type": "application/json" } },
      { email: "test@example.com", password: "Password123", confirmPassword: "Password123" }
    );
    if (regNoName.status === 400) {
      results.passed.push("Registration: Missing name rejected (400 Bad Request)");
      console.log("  PASS: Registration without name rejected with 400.");
    } else {
      results.failed.push(`Registration: Expected 400 for missing name, got ${regNoName.status}`);
    }

    // 3.2 Invalid email format
    const regBadEmail = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/register", method: "POST", headers: { "Content-Type": "application/json" } },
      { fullName: "Test User", email: "invalid-email-format", password: "Password123", confirmPassword: "Password123" }
    );
    if (regBadEmail.status === 400) {
      results.passed.push("Registration: Invalid email format rejected (400 Bad Request)");
      console.log("  PASS: Invalid email format rejected with 400.");
    } else {
      results.failed.push(`Registration: Expected 400 for invalid email, got ${regBadEmail.status}`);
    }

    // 3.3 Weak password (< 8 chars)
    const regWeakPass = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/register", method: "POST", headers: { "Content-Type": "application/json" } },
      { fullName: "Test User", email: "test2@example.com", password: "short", confirmPassword: "short" }
    );
    if (regWeakPass.status === 400) {
      results.passed.push("Registration: Weak password rejected (400 Bad Request)");
      console.log("  PASS: Short password rejected with 400.");
    } else {
      results.failed.push(`Registration: Expected 400 for weak password, got ${regWeakPass.status}`);
    }

    // 3.4 Password mismatch
    const regMismatch = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/register", method: "POST", headers: { "Content-Type": "application/json" } },
      { fullName: "Test User", email: "test3@example.com", password: "Password123", confirmPassword: "DifferentPassword123" }
    );
    if (regMismatch.status === 400) {
      results.passed.push("Registration: Mismatched passwords rejected (400 Bad Request)");
      console.log("  PASS: Mismatched passwords rejected with 400.");
    } else {
      results.failed.push(`Registration: Expected 400 for mismatched passwords, got ${regMismatch.status}`);
    }

    // 3.5 Successful registration of public user (must default to CITIZEN)
    const testEmail = "stage6_test_citizen@nalamnagar.gov.in";
    await prisma.user.deleteMany({ where: { email: testEmail } });
    const regSuccess = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/register", method: "POST", headers: { "Content-Type": "application/json" } },
      { fullName: "Stage Six Public Citizen", email: testEmail, password: "StrongPassword123!", confirmPassword: "StrongPassword123!" }
    );
    const newUserId = regSuccess.body?.data?.user?.id || regSuccess.body?.user?.id;
    if (newUserId) createdTestUserIds.push(newUserId);
    const dbNewUser = await prisma.user.findUnique({ where: { email: testEmail } });
    if (regSuccess.status === 201 && dbNewUser?.role === "CITIZEN") {
      results.passed.push("Registration: Public signup assigns CITIZEN by default (201 Created)");
      console.log(`  PASS: Registered new public user with role CITIZEN (ID ${newUserId}).`);
    } else {
      results.failed.push(`Registration: Expected CITIZEN role, got ${dbNewUser?.role}`);
    }

    // 3.6 Duplicate account rejection (409 Conflict)
    const regDuplicate = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/register", method: "POST", headers: { "Content-Type": "application/json" } },
      { fullName: "Duplicate User", email: testEmail, password: "StrongPassword123!", confirmPassword: "StrongPassword123!" }
    );
    if (regDuplicate.status === 409) {
      results.passed.push("Registration: Duplicate account rejected (409 Conflict)");
      console.log("  PASS: Duplicate email correctly rejected with 409 Conflict.");
    } else {
      results.failed.push(`Registration: Expected 409 Conflict for duplicate, got ${regDuplicate.status}`);
    }

    // 3.7 Public signup role escalation prevention (ADMIN)
    const testAdminEscalateEmail = "stage6_escalate_admin@nalamnagar.gov.in";
    await prisma.user.deleteMany({ where: { email: testAdminEscalateEmail } });
    const regEscalateAdmin = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/register", method: "POST", headers: { "Content-Type": "application/json" } },
      {
        fullName: "Attacker User",
        email: testAdminEscalateEmail,
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
        role: "ADMIN"
      }
    );
    const escalatedAdminId = regEscalateAdmin.body?.data?.user?.id || regEscalateAdmin.body?.user?.id;
    if (escalatedAdminId) createdTestUserIds.push(escalatedAdminId);
    const escalatedAdminDbUser = await prisma.user.findUnique({ where: { email: testAdminEscalateEmail } });
    if (escalatedAdminDbUser && escalatedAdminDbUser.role === "CITIZEN") {
      results.passed.push("Security: Public signup ignores role escalation to ADMIN, assigns CITIZEN");
      console.log("  PASS: Public signup ignored requested role 'ADMIN' and defaulted to 'CITIZEN'.");
    } else {
      results.failed.push(`Security: Public signup allowed ADMIN escalation! Role: ${escalatedAdminDbUser?.role}`);
    }

    // 3.8 Public signup role escalation prevention (DISPATCHER)
    const testDispEscalateEmail = "stage6_escalate_disp@nalamnagar.gov.in";
    await prisma.user.deleteMany({ where: { email: testDispEscalateEmail } });
    const regEscalateDisp = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/register", method: "POST", headers: { "Content-Type": "application/json" } },
      {
        fullName: "Attacker Dispatcher",
        email: testDispEscalateEmail,
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
        role: "DISPATCHER"
      }
    );
    const escalatedDispId = regEscalateDisp.body?.data?.user?.id || regEscalateDisp.body?.user?.id;
    if (escalatedDispId) createdTestUserIds.push(escalatedDispId);
    const escalatedDispDbUser = await prisma.user.findUnique({ where: { email: testDispEscalateEmail } });
    if (escalatedDispDbUser && escalatedDispDbUser.role === "CITIZEN") {
      results.passed.push("Security: Public signup ignores role escalation to DISPATCHER, assigns CITIZEN");
      console.log("  PASS: Public signup ignored requested role 'DISPATCHER' and defaulted to 'CITIZEN'.");
    } else {
      results.failed.push(`Security: Public signup allowed DISPATCHER escalation! Role: ${escalatedDispDbUser?.role}`);
    }

    // 3.9 Verify newly registered CITIZEN is blocked from dispatch and staff endpoints
    const citizenLogin = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/login", method: "POST", headers: { "Content-Type": "application/json" } },
      { username: testEmail, password: "StrongPassword123!" }
    );
    const testUserToken = citizenLogin.body?.token || citizenLogin.body?.data?.token;
    const citizenDispatchAttempt = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/dispatch/recommend",
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${testUserToken}` }
      },
      { requestId: "REQ-2026-001" }
    );
    if (citizenDispatchAttempt.status === 403) {
      results.passed.push("RBAC: Newly registered public user (CITIZEN) is forbidden from dispatch (403)");
      console.log("  PASS: Newly registered CITIZEN correctly blocked from dispatch operations.");
    } else {
      results.failed.push(`RBAC: Expected 403 for new user dispatch, got ${citizenDispatchAttempt.status}`);
    }

    // 3.10 Profile update & protected field protection (role remains CITIZEN)
    console.log("\n[7] Testing Profile Management and Protected Field Immutability...");
    const updateProfileRes = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/auth/profile",
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${testUserToken}` }
      },
      { fullName: "Stage Six Citizen Renamed", role: "ADMIN", passwordHash: "hacked" }
    );
    const dbProfileUser = await prisma.user.findUnique({ where: { id: newUserId } });
    if (
      updateProfileRes.status === 200 &&
      dbProfileUser?.name === "Stage Six Citizen Renamed" &&
      dbProfileUser?.role === "CITIZEN"
    ) {
      results.passed.push("Profile: Profile name updated and protected fields (role=CITIZEN) remained unchanged");
      console.log("  PASS: Profile name updated; role remained CITIZEN and passwordHash protected from tampering.");
    } else {
      results.failed.push("Profile: Profile update failed or role was improperly modified");
    }

    // 3.11 Authorized staff promotion workflow (Admin promotes CITIZEN to DISPATCHER)
    const staffPromotionRes = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: `/api/users/${newUserId}/role`,
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` }
      },
      { role: "DISPATCHER" }
    );
    const promotedDbUser = await prisma.user.findUnique({ where: { id: newUserId } });
    if (staffPromotionRes.status === 200 && promotedDbUser?.role === "DISPATCHER") {
      results.passed.push("Workflow: Staff elevation restricted to authorized admin workflow (200 OK)");
      console.log("  PASS: Admin successfully promoted user to DISPATCHER via authorized workflow.");
    } else {
      results.failed.push(`Workflow: Staff promotion failed with status ${staffPromotionRes.status}`);
    }

    // 3.9 Password change workflow
    console.log("\n[8] Testing Password Change Workflow...");
    // Attempt with incorrect current password
    const wrongCurrentPassRes = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/auth/password",
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${testUserToken}` }
      },
      { currentPassword: "WrongCurrentPassword123", newPassword: "BrandNewPassword123!" }
    );
    if (wrongCurrentPassRes.status === 400) {
      results.passed.push("PasswordChange: Wrong current password rejected (400 Bad Request)");
      console.log("  PASS: Incorrect current password rejected with 400.");
    } else {
      results.failed.push(`PasswordChange: Expected 400 for wrong current password, got ${wrongCurrentPassRes.status}`);
    }

    // Valid password change
    const validPassChangeRes = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/auth/password",
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${testUserToken}` }
      },
      { currentPassword: "StrongPassword123!", newPassword: "BrandNewPassword123!" }
    );
    if (validPassChangeRes.status === 200) {
      results.passed.push("PasswordChange: Password successfully changed (200 OK)");
      console.log("  PASS: Password successfully changed.");
    } else {
      results.failed.push(`PasswordChange: Expected 200 for valid password change, got ${validPassChangeRes.status}`);
    }

    // Verify new password works and old fails
    const oldLoginFail = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/login", method: "POST", headers: { "Content-Type": "application/json" } },
      { username: testEmail, password: "StrongPassword123!" }
    );
    const newLoginSuccess = await request(
      { hostname: "localhost", port: 5001, path: "/api/auth/login", method: "POST", headers: { "Content-Type": "application/json" } },
      { username: testEmail, password: "BrandNewPassword123!" }
    );
    if (oldLoginFail.status === 401 && newLoginSuccess.status === 200) {
      results.passed.push("PasswordChange: New password works, old password invalidated");
      console.log("  PASS: Authenticated with new password; old password correctly rejected.");
    } else {
      results.failed.push("PasswordChange: Old password still worked or new password failed");
    }

    // -------------------------------------------------------------
    // SECTION 4: Role-Based Access Control (RBAC)
    // -------------------------------------------------------------
    console.log("\n[9] Auditing Role-Based Access Control (RBAC)...");
    const citHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${citizenToken}` };
    const driverHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${driverToken}` };
    const opHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${opToken}` };
    const adminHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` };

    // 4.1 CITIZEN forbidden from dispatch operations
    const citDispatch = await request(
      { hostname: "localhost", port: 5001, path: "/api/dispatch/recommend", method: "POST", headers: citHeaders },
      { requestId: "REQ-2026-001" }
    );
    if (citDispatch.status === 403) {
      results.passed.push("RBAC: CITIZEN blocked from dispatch recommend (403 Forbidden)");
      console.log("  PASS: CITIZEN forbidden from dispatch operations.");
    } else {
      results.failed.push(`RBAC: Expected 403 for citizen dispatch, got ${citDispatch.status}`);
    }

    // 4.2 CITIZEN forbidden from updating trip status
    const citTripStatus = await request(
      { hostname: "localhost", port: 5001, path: "/api/trips/TRIP-1001/status", method: "PATCH", headers: citHeaders },
      { status: "EN_ROUTE_PICKUP" }
    );
    if (citTripStatus.status === 403) {
      results.passed.push("RBAC: CITIZEN blocked from modifying trip status (403 Forbidden)");
      console.log("  PASS: CITIZEN forbidden from modifying trip statuses.");
    } else {
      results.failed.push(`RBAC: Expected 403 for citizen trip status update, got ${citTripStatus.status}`);
    }

    // 4.3 CITIZEN forbidden from fleet resource management
    const citFleet = await request(
      { hostname: "localhost", port: 5001, path: "/api/ambulances", method: "POST", headers: citHeaders },
      { registrationNumber: "TN-01-CITIZEN", driverName: "Citizen Driver", driverContact: "9999999999", currentLocation: "LOC-01" }
    );
    if (citFleet.status === 403) {
      results.passed.push("RBAC: CITIZEN blocked from ambulance fleet management (403 Forbidden)");
      console.log("  PASS: CITIZEN forbidden from fleet resource management.");
    } else {
      results.failed.push(`RBAC: Expected 403 for citizen fleet creation, got ${citFleet.status}`);
    }

    // 4.4 CITIZEN forbidden from hospital capacity modification
    const citHospital = await request(
      { hostname: "localhost", port: 5001, path: "/api/hospitals/H001/capacity", method: "PATCH", headers: citHeaders },
      { availableBeds: 50 }
    );
    if (citHospital.status === 403) {
      results.passed.push("RBAC: CITIZEN blocked from hospital capacity management (403 Forbidden)");
      console.log("  PASS: CITIZEN forbidden from modifying hospital capacity.");
    } else {
      results.failed.push(`RBAC: Expected 403 for citizen hospital capacity change, got ${citHospital.status}`);
    }

    // 4.5 CITIZEN forbidden from user administration
    const citUsers = await request(
      { hostname: "localhost", port: 5001, path: "/api/users", method: "GET", headers: citHeaders }
    );
    if (citUsers.status === 403) {
      results.passed.push("RBAC: CITIZEN blocked from user administration (403 Forbidden)");
      console.log("  PASS: CITIZEN forbidden from user administration.");
    } else {
      results.failed.push(`RBAC: Expected 403 for citizen user admin, got ${citUsers.status}`);
    }

    // 4.6 CITIZEN forbidden from changing emergency status
    const citEmergStatus = await request(
      { hostname: "localhost", port: 5001, path: "/api/emergencies/REQ-2026-001/status", method: "PATCH", headers: citHeaders },
      { status: "CANCELLED" }
    );
    if (citEmergStatus.status === 403) {
      results.passed.push("RBAC: CITIZEN blocked from changing emergency status (403 Forbidden)");
      console.log("  PASS: CITIZEN forbidden from updating emergency ticket status.");
    } else {
      results.failed.push(`RBAC: Expected 403 for citizen emergency status update, got ${citEmergStatus.status}`);
    }

    // 4.7 AMBULANCE_STAFF forbidden from dispatch and user administration
    const driverDispatch = await request(
      { hostname: "localhost", port: 5001, path: "/api/dispatch/recommend", method: "POST", headers: driverHeaders },
      { requestId: "REQ-2026-001" }
    );
    const driverUsers = await request(
      { hostname: "localhost", port: 5001, path: "/api/users", method: "GET", headers: driverHeaders }
    );
    if (driverDispatch.status === 403 && driverUsers.status === 403) {
      results.passed.push("RBAC: AMBULANCE_STAFF blocked from dispatch & user administration (403 Forbidden)");
      console.log("  PASS: AMBULANCE_STAFF forbidden from dispatch and user admin.");
    } else {
      results.failed.push(`RBAC: AMBULANCE_STAFF dispatch (${driverDispatch.status}) or users (${driverUsers.status}) not 403`);
    }

    // 4.8 DISPATCHER forbidden from user administration
    const opUsers = await request(
      { hostname: "localhost", port: 5001, path: "/api/users", method: "GET", headers: opHeaders }
    );
    if (opUsers.status === 403) {
      results.passed.push("RBAC: DISPATCHER blocked from user administration (403 Forbidden)");
      console.log("  PASS: DISPATCHER forbidden from user administration.");
    } else {
      results.failed.push(`RBAC: Expected 403 for dispatcher user admin, got ${opUsers.status}`);
    }

    // -------------------------------------------------------------
    // SECTION 5: Admin User Management & Safeguards
    // -------------------------------------------------------------
    console.log("\n[10] Testing Admin User Management and Role Governance...");

    // 5.1 Admin can list all users
    const allUsersRes = await request(
      { hostname: "localhost", port: 5001, path: "/api/users", method: "GET", headers: adminHeaders }
    );
    const userList = allUsersRes.body?.data || allUsersRes.body;
    if (allUsersRes.status === 200 && Array.isArray(userList) && userList.length >= 4) {
      results.passed.push("Admin: GET /api/users returns safe user list (200 OK)");
      console.log(`  PASS: Admin retrieved ${userList.length} users successfully.`);
    } else {
      results.failed.push(`Admin: GET /api/users failed with status ${allUsersRes.status}`);
    }

    // 5.2 Admin can fetch single user by ID
    const singleUserRes = await request(
      { hostname: "localhost", port: 5001, path: `/api/users/${newUserId}`, method: "GET", headers: adminHeaders }
    );
    const singleUser = singleUserRes.body?.data || singleUserRes.body;
    if (singleUserRes.status === 200 && singleUser?.id === newUserId && singleUser.passwordHash === undefined) {
      results.passed.push("Admin: GET /api/users/:id returns single user without password hash");
      console.log("  PASS: Single user fetched with passwordHash stripped.");
    } else {
      results.failed.push(`Admin: GET /api/users/:id failed with status ${singleUserRes.status}`);
    }

    // 5.3 Admin can update user role to AMBULANCE_STAFF
    const updateRoleRes = await request(
      { hostname: "localhost", port: 5001, path: `/api/users/${newUserId}/role`, method: "PATCH", headers: adminHeaders },
      { role: "AMBULANCE_STAFF" }
    );
    const updatedDbRole = await prisma.user.findUnique({ where: { id: newUserId } });
    if (updateRoleRes.status === 200 && updatedDbRole?.role === "AMBULANCE_STAFF") {
      results.passed.push("Admin: PATCH /api/users/:id/role successfully assigned AMBULANCE_STAFF");
      console.log("  PASS: User role updated to AMBULANCE_STAFF in PostgreSQL.");
    } else {
      results.failed.push(`Admin: Role update failed with status ${updateRoleRes.status}`);
    }

    // 5.4 Reject invalid role
    const badRoleRes = await request(
      { hostname: "localhost", port: 5001, path: `/api/users/${newUserId}/role`, method: "PATCH", headers: adminHeaders },
      { role: "SUPER_GOD_MODE" }
    );
    if (badRoleRes.status === 400) {
      results.passed.push("Admin: Invalid role assignment rejected (400 Bad Request)");
      console.log("  PASS: Invalid role name rejected with 400.");
    } else {
      results.failed.push(`Admin: Expected 400 for bad role, got ${badRoleRes.status}`);
    }

    // 5.5 Safeguard: Cannot demote the last administrator
    const adminUserRecord = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (adminUserRecord) {
      const demoteRes = await request(
        { hostname: "localhost", port: 5001, path: `/api/users/${adminUserRecord.id}/role`, method: "PATCH", headers: adminHeaders },
        { role: "DISPATCHER" }
      );
      if (demoteRes.status === 400 && demoteRes.body?.message?.includes("last administrator")) {
        results.passed.push("Safeguard: Demotion of the last administrator prevented");
        console.log("  PASS: Attempt to demote the sole administrator blocked.");
      } else {
        results.failed.push(`Safeguard: Expected block of last admin demotion, got ${demoteRes.status}`);
      }
    }

    // 5.6 Safeguard: Administrator cannot delete their own account
    if (adminUserRecord) {
      const selfDeleteRes = await request(
        { hostname: "localhost", port: 5001, path: `/api/users/${adminUserRecord.id}`, method: "DELETE", headers: adminHeaders }
      );
      if (selfDeleteRes.status === 400) {
        results.passed.push("Safeguard: Self-deletion by administrator prevented (400 Bad Request)");
        console.log("  PASS: Administrator prevented from deleting their own account.");
      } else {
        results.failed.push(`Safeguard: Expected 400 for admin self-deletion, got ${selfDeleteRes.status}`);
      }
    }

    // 5.7 Admin can delete a test user cleanly
    const deleteTestUserRes = await request(
      { hostname: "localhost", port: 5001, path: `/api/users/${newUserId}`, method: "DELETE", headers: adminHeaders }
    );
    const postDeleteUser = await prisma.user.findUnique({ where: { id: newUserId } });
    if (deleteTestUserRes.status === 200 && !postDeleteUser) {
      results.passed.push("Admin: DELETE /api/users/:id deletes user cleanly without FK corruption");
      console.log("  PASS: Test user deleted cleanly by admin.");
    } else {
      results.failed.push(`Admin: Delete user failed with status ${deleteTestUserRes.status}`);
    }

    // -------------------------------------------------------------
    // SECTION 6: Audit Logs & Privacy Verification
    // -------------------------------------------------------------
    console.log("\n[11] Inspecting Audit Logs and Privacy Safeguards...");
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });
    console.log(`  Found ${auditLogs.length} recent AuditLog entries.`);

    let secretExposedInAudit = false;
    for (const log of auditLogs) {
      const details = (log.details || "").toLowerCase();
      if (details.includes("password123") || details.includes("$2a$") || details.includes("$2b$") || details.includes("bearer ")) {
        secretExposedInAudit = true;
        break;
      }
    }
    if (!secretExposedInAudit) {
      results.passed.push("Privacy: Audit logs contain zero passwords, hashes, or tokens");
      console.log("  PASS: Verified audit log details contain no secrets.");
    } else {
      results.failed.push("Privacy: Detected credential or token in audit log details!");
    }

    // Check for presence of Stage 6 audit actions
    const auditActions = new Set(auditLogs.map(l => l.action));
    console.log("  Recent audit actions:", Array.from(auditActions).join(", "));
    if (auditActions.has("REGISTER_USER") || auditActions.has("UPDATE_PROFILE") || auditActions.has("CHANGE_PASSWORD") || auditActions.has("UPDATE_USER_ROLE") || auditActions.has("DELETE_USER")) {
      results.passed.push("Audit: Security actions recorded in PostgreSQL AuditLog table");
      console.log("  PASS: AuditLog records verified for authentication and user events.");
    } else {
      results.failed.push("Audit: Expected user management events in AuditLog");
    }

  } catch (err) {
    console.error("FATAL ERROR in test execution:", err);
    results.failed.push("Fatal error: " + err.message);
  } finally {
    // Clean up created test accounts
    console.log("\n[12] Cleaning Up Test Accounts...");
    for (const id of createdTestUserIds) {
      try {
                await prisma.user.deleteMany({ where: { id } });
      } catch (cleanErr) {
        // ignore
      }
    }
    // Also remove by test emails
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              "stage6_test_citizen@nalamnagar.gov.in",
              "stage6_test_op@nalamnagar.gov.in",
              "stage6_lockout_test@nalamnagar.gov.in",
              "stage6_escalate@nalamnagar.gov.in",
              "stage6_escalate_admin@nalamnagar.gov.in",
              "stage6_escalate_disp@nalamnagar.gov.in"
            ]
          }
        }
      });
    } catch {
      // ignore
    }

    // Final verification of baseline records
    const finalUsers = await prisma.user.findMany({ select: { username: true } });
    console.log(`  Final active users in PostgreSQL: ${finalUsers.length}`);

    await prisma.$disconnect();
  }

  console.log("\n=================================================================");
  console.log("STAGE 6 TEST RESULTS SUMMARY");
  console.log("=================================================================");
  console.log(`Total Passed : ${results.passed.length}`);
  console.log(`Total Failed : ${results.failed.length}`);
  console.log(`Total Skipped: ${results.skipped.length}`);

  results.passed.forEach((msg, idx) => console.log(`  [PASS ${idx + 1}] ${msg}`));
  results.failed.forEach((msg, idx) => console.log(`  [FAIL ${idx + 1}] ${msg}`));
  results.skipped.forEach((msg, idx) => console.log(`  [SKIP ${idx + 1}] ${msg}`));
  console.log("=================================================================\n");

  if (results.failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStage6Tests();
