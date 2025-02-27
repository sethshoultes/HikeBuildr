import { hashPassword } from "../utils/password";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function createAdminUser() {
  const newPasswordHash = await hashPassword("5268970Sage!");

  try {
    const [user] = await db.insert(users)
      .values({ 
        username: "seth",
        password: newPasswordHash,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log("Admin user created successfully:", user.username);
  } catch (error) {
    console.error("Failed to create admin user:", error);
  }
}

createAdminUser();