import 'dotenv/config';
import express from "express";
import cors from "cors";
import { requireAuth, AuthRequest, createToken } from "./src/middleware/auth.ts";
import { db } from "./src/db/index.ts";
import { 
  users, properties, tenants, allocations, invoices, transactions, activityLogs 
} from "./src/db/schema.ts";
import { eq, and } from "drizzle-orm";
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function formatTitleCaseName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map(word => {
      if (!word) return '';
      return word
        .split('-')
        .map(subWord => subWord ? subWord.charAt(0).toUpperCase() + subWord.slice(1).toLowerCase() : '')
        .join('-');
    })
    .join(' ');
}

// Helper function to find user by email or phone number
async function findUserByEmailOrPhone(usernameInput: string) {
  if (!usernameInput) return null;
  const cleanInput = usernameInput.trim().toLowerCase();

  // 1 & 2. Try exact email or phone match in parallel
  const [usersByEmail, usersByPhone] = await Promise.all([
    db.select().from(users).where(eq(users.email, cleanInput)),
    db.select().from(users).where(eq(users.phone, usernameInput.trim()))
  ]);

  if (usersByEmail.length > 0) return usersByEmail[0];
  if (usersByPhone.length > 0) return usersByPhone[0];

  // 3. Try flexible digit matching for phone numbers (ignoring country code, spaces, leading zeros)
  const inputDigits = usernameInput.replace(/\D/g, '');
  if (inputDigits.length >= 7) {
    const allUsers = await db.select().from(users);
    const matched = allUsers.find(u => {
      if (!u.phone) return false;
      const uDigits = u.phone.replace(/\D/g, '');
      if (uDigits === inputDigits) return true;
      // Match by last 10 digits or last N digits (for mobile numbers without country code)
      const inputLast10 = inputDigits.slice(-10);
      const uLast10 = uDigits.slice(-10);
      if (inputLast10.length >= 7 && inputLast10 === uLast10) return true;
      return (uDigits.length >= 7 && uDigits.endsWith(inputDigits)) || 
             (inputDigits.length >= 7 && inputDigits.endsWith(uDigits));
    });
    if (matched) return matched;
  }

  return null;
}

// Helper to wipe all users and database records
async function wipeAllUsersAndData() {
  try {
    await db.delete(activityLogs);
    await db.delete(transactions);
    await db.delete(invoices);
    await db.delete(allocations);
    await db.delete(tenants);
    await db.delete(properties);
    await db.delete(users);
    console.log("Successfully wiped all users and kingdom data.");
  } catch (err) {
    console.error("Failed to wipe database records:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  app.use(express.json());

  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));
  app.options('*', cors());

  // Pre-warm database connection pool on boot for instant responses
  db.select().from(users).limit(1).then(() => {
    console.log("Database pool pre-warmed.");
  }).catch(() => {});

  // --- API Routes ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Custom Register Endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, phone, role, businessName, password, confirmPassword } = req.body;

      if (!name || !email || !role || !password || !confirmPassword) {
        return res.status(400).json({ error: "Missing required registration parameters." });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match." });
      }

      const emailLower = email.trim().toLowerCase();

      // Check if account already exists by email OR phone number
      const existingByEmail = await findUserByEmailOrPhone(emailLower);
      const existingByPhone = phone ? await findUserByEmailOrPhone(phone) : null;
      const existingUser = existingByEmail || existingByPhone;
      
      let uid;
      let userProfile;

      if (existingUser) {
        // If they have a password already, they are already registered
        if (existingUser.password) {
          return res.status(400).json({ 
            error: "An account with this email address or phone number is already registered. Please log in using the Gate Login tab." 
          });
        }
        
        // This is a pre-registered owner claiming their profile!
        uid = existingUser.id;
        await db.update(users)
          .set({
            name: formatTitleCaseName(name),
            email: emailLower,
            password: await hashPassword(password),
            phone: phone ? phone.trim() : existingUser.phone,
            businessName: businessName ? businessName.trim() : existingUser.businessName,
            status: "active" // Pre-registered/invited by admin, so auto-approve!
          })
          .where(eq(users.id, uid));

        const updatedUsers = await db.select().from(users).where(eq(users.id, uid));
        userProfile = updatedUsers[0];
      } else {
        // Standard registration
        // Check Admin uniqueness constraint: max 1 admin
        if (role === "admin") {
          const admins = await db.select().from(users).where(eq(users.role, "admin"));
          if (admins.length > 0) {
            return res.status(400).json({ 
              error: "An Imperial Administrator already presides over this kingdom. You must register as an Owner instead." 
            });
          }
        }

        uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newUser = {
          id: uid,
          email: emailLower,
          name: formatTitleCaseName(name),
          role,
          status: "active", // Active status for instant authentication access
          createdAt: new Date().toISOString(),
          businessName: businessName ? businessName.trim() : null,
          phone: phone ? phone.trim() : null,
          currency: "₹",
          password: await hashPassword(password)
        };

        await db.insert(users).values(newUser);
        userProfile = newUser;
      }

      // Log activity
      await db.insert(activityLogs).values({
        id: `log_reg_${Date.now()}`,
        userId: uid,
        userName: userProfile.name,
        userRole: userProfile.role,
        action: "User Registered",
        details: role === "admin" 
          ? `System initialized a new Administrator account for ${userProfile.name} (${userProfile.email}).`
          : `New Owner profile registered: ${userProfile.name} (${userProfile.email}).`,
        timestamp: new Date().toISOString()
      });

      // Generate session token
      const token = createToken({ uid, email: emailLower, role: userProfile.role });

      res.status(201).json({
        user: {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          role: userProfile.role,
          status: userProfile.status,
          businessName: userProfile.businessName,
          phone: userProfile.phone,
          currency: userProfile.currency
        },
        token
      });
    } catch (error: any) {
      console.error("Error in POST /api/auth/register:", error);
      res.status(500).json({ error: "Registration failed.", details: error.message });
    }
  });

  // Wipe All Data Endpoint
  app.post("/api/auth/wipe-database", async (req, res) => {
    try {
      await wipeAllUsersAndData();
      res.json({ success: true, message: "All users and system records have been permanently cleared." });
    } catch (err: any) {
      console.error("Error wiping database:", err);
      res.status(500).json({ error: "Failed to wipe database.", details: err.message });
    }
  });

  // Custom Login Endpoint (Email or Phone number + Password)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Email/Phone number and password are required." });
      }

      // Find user by email or phone (exact or digit match)
      const userProfile = await findUserByEmailOrPhone(username);

      if (!userProfile || !userProfile.password) {
        return res.status(401).json({ error: "Invalid email/phone number or password." });
      }

      // Verify password
      const passwordValid = await verifyPassword(password, userProfile.password);
      if (!passwordValid) {
        return res.status(401).json({ error: "Invalid email/phone number or password." });
      }

      if (userProfile.status === "suspended") {
        return res.status(403).json({ error: "Your account is suspended by the Imperial Administrator.", status: "suspended" });
      }

      // Generate session token
      const token = createToken({ uid: userProfile.id, email: userProfile.email, role: userProfile.role });

      res.json({
        user: {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          role: userProfile.role,
          status: userProfile.status,
          businessName: userProfile.businessName,
          phone: userProfile.phone,
          currency: userProfile.currency
        },
        token
      });
    } catch (error: any) {
      console.error("Error in POST /api/auth/login:", error);
      res.status(500).json({ error: "Authentication failed.", details: error.message });
    }
  });

  // Store active verification codes in memory for reset password
  const resetCodesMap = new Map<string, { code: string; expiresAt: number }>();

  // Custom Forgot Password Endpoint
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ error: "Registered email or phone number is required." });
      }

      // Find user by email or phone
      const userProfile = await findUserByEmailOrPhone(username);

      if (!userProfile) {
        return res.status(404).json({ error: "No registered account found with that email address or phone number." });
      }

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      resetCodesMap.set(userProfile.id, { code, expiresAt });

      // TODO: Integrate an email/SMS provider to actually deliver this code.
      // Never return the code in the API response in production.
      // For now, log to console so the developer can test:
      console.log(`[DEV ONLY] Password reset code for ${userProfile.email}: ${code}`);

      res.json({
        success: true,
        userId: userProfile.id,
        email: userProfile.email,
        phone: userProfile.phone,
        message: `Verification code sent to ${userProfile.email || userProfile.phone}`
      });
    } catch (error: any) {
      console.error("Error in POST /api/auth/forgot-password:", error);
      res.status(500).json({ error: "Failed to process request.", details: error.message });
    }
  });

  // Custom Reset Password Endpoint
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { userId, code, newPassword, confirmPassword } = req.body;

      if (!userId || !code || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: "Missing required parameters." });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match." });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long." });
      }

      const record = resetCodesMap.get(userId);
      if (!record || record.expiresAt < Date.now()) {
        return res.status(400).json({ error: "Verification code expired or invalid. Please request a new code." });
      }

      if (record.code !== code.trim()) {
        return res.status(400).json({ error: "Invalid verification code. Please check the 6-digit code." });
      }

      // Update password in database
      await db.update(users)
        .set({ password: await hashPassword(newPassword) })
        .where(eq(users.id, userId));

      // Clear code
      resetCodesMap.delete(userId);

      // Log activity
      const userList = await db.select().from(users).where(eq(users.id, userId));
      if (userList.length > 0) {
        const u = userList[0];
        await db.insert(activityLogs).values({
          id: `log_pwd_${Date.now()}`,
          userId: u.id,
          userName: u.name,
          userRole: u.role,
          action: "Password Reset",
          details: `Password updated successfully for account ${u.email}.`,
          timestamp: new Date().toISOString()
        });
      }

      res.json({ success: true, message: "Password updated successfully. You can now log in with your new credentials." });
    } catch (error: any) {
      console.error("Error in POST /api/auth/reset-password:", error);
      res.status(500).json({ error: "Failed to reset password.", details: error.message });
    }
  });

  // Custom User Profile & Password Update Endpoint
  app.post("/api/user/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized access." });
      }

      const { name, email, phone, businessName, currency, currentPassword, newPassword, confirmPassword } = req.body;

      // Find user in database
      const existingUsers = await db.select().from(users).where(eq(users.id, uid));
      if (existingUsers.length === 0) {
        return res.status(404).json({ error: "User profile not found in database." });
      }

      const currentUser = existingUsers[0];

      if (!name || !email) {
        return res.status(400).json({ error: "Name and Email are required fields." });
      }

      const emailLower = email.trim().toLowerCase();

      // Check if email changed and is taken by another user
      if (emailLower !== currentUser.email) {
        const checkEmail = await db.select().from(users).where(eq(users.email, emailLower));
        if (checkEmail.length > 0) {
          return res.status(400).json({ error: "Email address is already in use by another user account." });
        }
      }

      const updateData: any = {
        name: formatTitleCaseName(name),
        email: emailLower,
        phone: phone ? phone.trim() : currentUser.phone,
        businessName: businessName ? businessName.trim() : currentUser.businessName,
        currency: currency ? currency.trim() : currentUser.currency
      };

      // Handle password update if provided
      if (newPassword || confirmPassword || currentPassword) {
        if (!currentPassword || !currentPassword.trim()) {
          return res.status(400).json({ error: "Current password is required to authorize password change." });
        }

        if (!newPassword || !confirmPassword) {
          return res.status(400).json({ error: "Please enter both new password and confirm new password." });
        }

        if (newPassword !== confirmPassword) {
          return res.status(400).json({ error: "New password and confirm new password do not match." });
        }

        if (newPassword.length < 6) {
          return res.status(400).json({ error: "New password must be at least 6 characters long." });
        }

        if (newPassword === currentPassword) {
          return res.status(400).json({ error: "New password cannot be identical to your current password." });
        }

        if (currentUser.password) {
          const passwordValid = await verifyPassword(currentPassword, currentUser.password);
          if (!passwordValid) {
            return res.status(401).json({ error: "Current password is incorrect. Password change denied." });
          }
        }

        updateData.password = await hashPassword(newPassword);
      }

      // Perform update in database
      await db.update(users)
        .set(updateData)
        .where(eq(users.id, uid));

      // Fetch updated user profile
      const updatedUserList = await db.select().from(users).where(eq(users.id, uid));
      const updatedUser = updatedUserList[0];

      // Log activity
      await db.insert(activityLogs).values({
        id: `log_prof_${Date.now()}`,
        userId: uid,
        userName: updatedUser.name,
        userRole: updatedUser.role,
        action: "Profile Updated",
        details: `Account details and settings updated for ${updatedUser.name} (${updatedUser.email}).`,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: "Your profile details and credentials have been permanently updated in the database.",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          status: updatedUser.status,
          businessName: updatedUser.businessName,
          phone: updatedUser.phone,
          currency: updatedUser.currency
        }
      });
    } catch (error: any) {
      console.error("Error in POST /api/user/profile:", error);
      res.status(500).json({ error: "Failed to update profile settings.", details: error.message });
    }
  });

  // Get current user profile and full kingdom synchronization data
  app.get("/api/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(400).json({ error: "Missing session user identifier." });
      }

      // Find user in database
      const dbUsers = await db.select().from(users).where(eq(users.id, uid));
      const userProfile = dbUsers[0];

      if (!userProfile) {
        return res.status(401).json({ error: "User profile not found in registry." });
      }

      // If user is suspended, return access denied
      if (userProfile.status === "suspended") {
        return res.status(403).json({ error: "Your account is suspended by the Imperial Administrator.", status: "suspended" });
      }

      // Fetch other data based on roles in parallel
      if (userProfile.role === "admin") {
        // Imperial Admins see everything
        const [
          allUsers, 
          allProperties, 
          allTenants, 
          allAllocations, 
          allInvoices, 
          allTransactions, 
          allLogs
        ] = await Promise.all([
          db.select().from(users),
          db.select().from(properties),
          db.select().from(tenants),
          db.select().from(allocations),
          db.select().from(invoices),
          db.select().from(transactions),
          db.select().from(activityLogs)
        ]);

        return res.json({
          registered: true,
          user: userProfile,
          users: allUsers,
          properties: allProperties,
          tenants: allTenants,
          allocations: allAllocations,
          invoices: allInvoices,
          transactions: allTransactions,
          logs: allLogs
        });
      } else {
        // Noble Owners see only their own kingdom
        const [
          myProperties, 
          myTenants, 
          myAllocations, 
          myInvoices, 
          myTransactions, 
          myLogs
        ] = await Promise.all([
          db.select().from(properties).where(eq(properties.ownerId, uid)),
          db.select().from(tenants).where(eq(tenants.ownerId, uid)),
          db.select().from(allocations).where(eq(allocations.ownerId, uid)),
          db.select().from(invoices).where(eq(invoices.ownerId, uid)),
          db.select().from(transactions).where(eq(transactions.ownerId, uid)),
          db.select().from(activityLogs).where(eq(activityLogs.userId, uid))
        ]);

        return res.json({
          registered: true,
          user: userProfile,
          properties: myProperties,
          tenants: myTenants,
          allocations: myAllocations,
          invoices: myInvoices,
          transactions: myTransactions,
          logs: myLogs
        });
      }
    } catch (error: any) {
      console.error("Error in GET /api/sync:", error);
      res.status(500).json({ error: "Failed to synchronize kingdom data.", details: error.message });
    }
  });


  // Admin-only: Pre-register / Create Owner profile
  app.post("/api/admin/users", requireAuth, async (req: AuthRequest, res) => {
    try {
      const adminUid = req.user?.uid;
      if (!adminUid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check if requester is admin
      const adminProfile = await db.select().from(users).where(eq(users.id, adminUid));
      if (!adminProfile[0] || adminProfile[0].role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Imperial access required." });
      }

      const { name, email, phone, businessName, status } = req.body;
      if (!name || !email || !phone) {
        return res.status(400).json({ error: "Missing required owner registration parameters." });
      }

      const emailLower = email.trim().toLowerCase();

      // Check if user with this email already exists
      const existingEmail = await db.select().from(users).where(eq(users.email, emailLower));
      if (existingEmail.length > 0) {
        return res.status(400).json({ error: "A user with this email already exists in the registry." });
      }

      // Use a temporary unique ID that will be mapped when they sign in
      const tempId = `invited_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      const newUser = {
        id: tempId,
        email: emailLower,
        name: formatTitleCaseName(name),
        role: "owner" as const,
        status: status || "active", // Default pre-approved status
        createdAt: new Date().toISOString(),
        businessName: businessName ? businessName.trim() : null,
        phone: phone.trim(),
        currency: "₹"
      };

      await db.insert(users).values(newUser);

      // Log activity
      await db.insert(activityLogs).values({
        id: `log_admin_create_${Date.now()}`,
        userId: adminUid,
        userName: adminProfile[0].name,
        userRole: "admin",
        action: "Owner Pre-Registered",
        details: `Administrator manually pre-registered owner profile: ${newUser.name} (${newUser.email}) representing "${newUser.businessName}".`,
        timestamp: new Date().toISOString()
      });

      res.status(201).json(newUser);
    } catch (error: any) {
      console.error("Error in POST /api/admin/users:", error);
      res.status(500).json({ error: "Failed to pre-register owner.", details: error.message });
    }
  });

  // Admin status approval or suspension
  app.put("/api/users/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const adminUid = req.user?.uid;
      const targetUserId = req.params.id;
      const { status, reason } = req.body;

      if (!adminUid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check if requester is admin
      const adminProfile = await db.select().from(users).where(eq(users.id, adminUid));
      if (!adminProfile[0] || adminProfile[0].role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Imperial access required." });
      }

      // Update status
      await db.update(users)
        .set({ status, statusReason: reason || null })
        .where(eq(users.id, targetUserId));

      // Log action
      const targetUser = await db.select().from(users).where(eq(users.id, targetUserId));
      const targetName = targetUser[0]?.name || targetUserId;
      await db.insert(activityLogs).values({
        id: `log_status_${Date.now()}`,
        userId: adminUid,
        userName: adminProfile[0].name,
        userRole: "admin",
        action: "User Status Changed",
        details: `Administrator changed status of ${targetName} to ${status}. Reason: ${reason || "None specified"}.`,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating user status:", error);
      res.status(500).json({ error: "Failed to update user status.", details: error.message });
    }
  });

  // Create or Update Property
  app.post("/api/properties", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const propertyData = req.body;

      if (!uid) return res.status(401).json({ error: "Unauthorized" });

      const payload = {
        id: propertyData.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        ownerId: uid,
        title: propertyData.title || "Untitled Property",
        location: propertyData.location || "Location Unspecified",
        rooms: Number(propertyData.rooms) || 1,
        bhk: Number(propertyData.bhk) || 1,
        rent: Number(propertyData.rent) || 0,
        status: propertyData.status || "available",
        terms: propertyData.terms || "Standard leasing covenants apply.",
        details: propertyData.details || null,
        roomList: propertyData.roomList || null,
        amenities: propertyData.amenities || null,
      };

      await db.insert(properties)
        .values(payload)
        .onConflictDoUpdate({
          target: properties.id,
          set: payload
        });

      res.json({ success: true, property: payload });
    } catch (error: any) {
      console.error("Error upserting property:", error);
      res.status(500).json({ error: "Failed to save property.", details: error.message });
    }
  });

  // Delete Property
  app.delete("/api/properties/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const propertyId = req.params.id;

      if (!uid) return res.status(401).json({ error: "Unauthorized" });

      await db.delete(properties).where(and(eq(properties.id, propertyId), eq(properties.ownerId, uid)));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting property:", error);
      res.status(500).json({ error: "Failed to delete property.", details: error.message });
    }
  });

  // Create or Update Tenant
  app.post("/api/tenants", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const tenantData = req.body;

      if (!uid) return res.status(401).json({ error: "Unauthorized" });

      const payload = {
        id: tenantData.id || `ten_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        ownerId: uid,
        name: formatTitleCaseName(tenantData.name || "Unnamed Tenant"),
        email: (tenantData.email || "").toLowerCase().trim(),
        phone: tenantData.phone || "",
        nid: tenantData.nid || null,
        status: tenantData.status || "active",
        joinedAt: tenantData.joinedAt || new Date().toISOString()
      };

      await db.insert(tenants)
        .values(payload)
        .onConflictDoUpdate({
          target: tenants.id,
          set: payload
        });

      res.json({ success: true, tenant: payload });
    } catch (error: any) {
      console.error("Error upserting tenant:", error);
      res.status(500).json({ error: "Failed to save tenant.", details: error.message });
    }
  });

  // Delete Tenant
  app.delete("/api/tenants/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const tenantId = req.params.id;

      if (!uid) return res.status(401).json({ error: "Unauthorized" });

      await db.delete(tenants).where(and(eq(tenants.id, tenantId), eq(tenants.ownerId, uid)));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting tenant:", error);
      res.status(500).json({ error: "Failed to delete tenant.", details: error.message });
    }
  });

  // Create or Update Allocation
  app.post("/api/allocations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const data = req.body;

      if (!uid) return res.status(401).json({ error: "Unauthorized" });

      const payload = {
        id: data.id || `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        ownerId: uid,
        tenantId: data.tenantId,
        propertyId: data.propertyId,
        roomNo: String(data.roomNo || "Room 1"),
        rentOverride: data.rentOverride ? Number(data.rentOverride) : null,
        active: data.active !== undefined ? Boolean(data.active) : true,
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        endDate: data.endDate || null
      };

      await db.insert(allocations)
        .values(payload)
        .onConflictDoUpdate({
          target: allocations.id,
          set: payload
        });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error upserting allocation:", error);
      res.status(500).json({ error: "Failed to save allocation.", details: error.message });
    }
  });

  // Create or Update Invoice
  app.post("/api/invoices", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const data = req.body;

      if (!uid) return res.status(401).json({ error: "Unauthorized" });

      const payload = {
        id: data.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        ownerId: uid,
        tenantId: data.tenantId,
        propertyId: data.propertyId,
        allocationId: data.allocationId,
        invoiceNumber: data.invoiceNumber,
        month: data.month,
        amount: Number(data.amount) || 0,
        status: data.status || "pending",
        dueDate: data.dueDate,
        paidDate: data.paidDate || null,
        billingPeriod: data.billingPeriod
      };

      await db.insert(invoices)
        .values(payload)
        .onConflictDoUpdate({
          target: invoices.id,
          set: payload
        });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error upserting invoice:", error);
      res.status(500).json({ error: "Failed to save invoice.", details: error.message });
    }
  });

  // Create or Update Transaction
  app.post("/api/transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const data = req.body;

      if (!uid) return res.status(401).json({ error: "Unauthorized" });

      const payload = {
        id: data.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        ownerId: uid,
        tenantId: data.tenantId || null,
        propertyId: data.propertyId || null,
        invoiceId: data.invoiceId || null,
        type: data.type || "credit",
        category: data.category || "Rent Income",
        amount: Number(data.amount) || 0,
        date: data.date || new Date().toISOString().split('T')[0],
        description: data.description || "Ledger entry",
        referenceNo: data.referenceNo || null,
        billType: data.billType || null,
        monthYear: data.monthYear || null,
        roomNo: data.roomNo || null
      };

      await db.insert(transactions)
        .values(payload)
        .onConflictDoUpdate({
          target: transactions.id,
          set: payload
        });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error upserting transaction:", error);
      res.status(500).json({ error: "Failed to save transaction.", details: error.message });
    }
  });

  // Create Log
  app.post("/api/logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const data = req.body;

      if (!uid) return res.status(401).json({ error: "Unauthorized" });

      const payload = {
        id: data.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        userId: uid,
        userName: data.userName || "User",
        userRole: data.userRole || "owner",
        action: data.action || "Activity",
        details: data.details || "Activity logged",
        timestamp: data.timestamp || new Date().toISOString()
      };

      await db.insert(activityLogs).values(payload);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving log:", error);
      res.status(500).json({ error: "Failed to save log.", details: error.message });
    }
  });

  // --- End of API Routes ---

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
});
