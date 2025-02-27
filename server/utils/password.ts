import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  try {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    const hashedPassword = `${buf.toString("hex")}.${salt}`;
    console.log('Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    console.log('Comparing passwords:');
    console.log('Stored password format:', stored);

    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.error('Invalid stored password format');
      return false;
    }

    console.log('Extracted salt:', salt);
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;

    console.log('Hash comparison:');
    console.log('Stored hash length:', hashedBuf.length);
    console.log('Computed hash length:', suppliedBuf.length);

    const isMatch = hashedBuf.length === suppliedBuf.length && timingSafeEqual(hashedBuf, suppliedBuf);
    console.log(`Password comparison result: ${isMatch}`);
    return isMatch;
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}