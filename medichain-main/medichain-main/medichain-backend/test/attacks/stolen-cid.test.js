/**
 * Attack Demo #1: Stolen CID Attack
 * 
 * Scenario: Attacker downloads ciphertext from IPFS using stolen CID
 * Expected Result: Cannot decrypt without recipient's private key
 * 
 * Run: npm run attack:stolen-cid
 */

const { expect } = require("chai");
const { describe, it } = require("mocha");
const { randomFillSync } = require("crypto");

describe("Attack Demo: Stolen CID", function () {
  let crypto;

  before(async function () {
    // Path from medichain-backend/test/attacks/ → ../../server/services/
    const { encryptRecord, decryptRecord } = await import("../../server/services/crypto-compat.js");
    const { wrapKey, unwrapKey } = await import("../../server/services/key-wrap-compat.js");
    
    crypto = { encryptRecord, decryptRecord, wrapKey, unwrapKey };
  });

  it("❌ ATTACK FAILS: Cannot decrypt with stolen CID alone", async function () {
    console.log("\n🎭 ATTACK SCENARIO: Stolen CID");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 1. Patient encrypts medical record
    console.log("\n1️⃣  Patient encrypts medical record...");
    const patientData = "Confidential: Patient has rare blood disorder";
    const recordId = "0x1234...";
    
    const plaintext = new TextEncoder().encode(patientData);
    const encrypted = await crypto.encryptRecord(plaintext, recordId);
    
    console.log(`   ✅ Record encrypted (${encrypted.ciphertext.length} bytes)`);
    console.log(`   📦 Ciphertext uploaded to IPFS`);
    const stolenCID = "QmTest123StolenCID"; // Attacker steals this
    console.log(`   🔗 CID: ${stolenCID}`);

    // 2. Attacker intercepts CID
    console.log("\n2️⃣  👿 ATTACKER intercepts CID from network traffic");
    console.log(`   👿 Stolen CID: ${stolenCID}`);
    console.log(`   👿 Downloads ciphertext from IPFS...`);
    
    const stolenCiphertext = encrypted.ciphertext; // Attacker downloads this
    console.log(`   👿 Downloaded ${stolenCiphertext.length} bytes of encrypted data`);

    // 3. Attacker attempts to decrypt
    console.log("\n3️⃣  👿 ATTACKER attempts to decrypt without key...");
    
    try {
      // Attacker tries with wrong key
      const attackerKey = new Uint8Array(32);
      randomFillSync(attackerKey); // random wrong key
      
      await crypto.decryptRecord(
        stolenCiphertext,
        encrypted.iv,
        attackerKey,
        recordId
      );
      
      // Should never reach here
      throw new Error("SECURITY BREACH: Decryption succeeded!");
      
    } catch (error) {
      console.log(`   ❌ Decryption FAILED: ${error.message}`);
      console.log(`   ✅ Ciphertext remains secure!`);
      
      expect(error.message).to.include("Authentication failed");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ATTACK DEFEATED: AES-GCM authentication prevents decryption");
    console.log("📝 Conclusion: Public IPFS storage is safe for ciphertext");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });

  it("✅ LEGITIMATE ACCESS: Authorized doctor can decrypt", async function () {
    console.log("\n🎭 LEGITIMATE SCENARIO: Authorized Access");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Setup
    const sodium = await import("libsodium-wrappers");
    await sodium.default.ready;

    const patientData = "Confidential: Patient has rare blood disorder";
    const recordId = "0x1234...";
    const plaintext = new TextEncoder().encode(patientData);

    // Patient encrypts
    console.log("\n1️⃣  Patient encrypts and grants access to doctor...");
    const encrypted = await crypto.encryptRecord(plaintext, recordId);
    
    // Generate doctor's keypair
    const doctorKeypair = sodium.default.crypto_box_keypair();
    
    // Wrap key for doctor
    const wrappedKey = await crypto.wrapKey(
      encrypted.recordKey,
      doctorKeypair.publicKey
    );
    console.log(`   ✅ Key wrapped for doctor`);

    // Doctor decrypts
    console.log("\n2️⃣  👨‍⚕️  Doctor unwraps key and decrypts...");
    const unwrappedKey = await crypto.unwrapKey(
      wrappedKey,
      doctorKeypair.publicKey,
      doctorKeypair.privateKey
    );
    
    const decrypted = await crypto.decryptRecord(
      encrypted.ciphertext,
      encrypted.iv,
      unwrappedKey,
      recordId
    );
    
    const decryptedText = new TextDecoder().decode(decrypted);
    console.log(`   ✅ Decryption successful!`);
    console.log(`   📄 Content: "${decryptedText}"`);

    expect(decryptedText).to.equal(patientData);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ AUTHORIZED ACCESS WORKS: Proper key unwrapping allows decryption");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });
});
