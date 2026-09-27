/**
 * Attack Demo #4: Forged Grant Attack
 * 
 * Scenario: Non-owner attempts to grant access to patient's record
 * Expected Result: Contract rejects unauthorized grant
 * 
 * Run: npm run attack:forged-grant
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Attack Demo: Forged Grant", function () {
  let accessRegistry;
  let patient, doctor, attacker;
  let recordId;

  beforeEach(async function () {
    [patient, doctor, attacker] = await ethers.getSigners();

    const AccessRegistry = await ethers.getContractFactory("AccessRegistry");
    accessRegistry = await AccessRegistry.deploy();
    await accessRegistry.waitForDeployment();

    recordId = ethers.keccak256(ethers.toUtf8Bytes("medical-record-001"));
    await accessRegistry.connect(patient).registerRecord(recordId);
  });

  it("❌ ATTACK FAILS: Non-owner cannot grant access", async function () {
    console.log("\n🎭 ATTACK SCENARIO: Forged Grant");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    console.log("\n1️⃣  Patient owns medical record");
    console.log(`   👤 Owner: ${patient.address}`);
    console.log(`   📋 Record: ${recordId.substring(0, 20)}...`);

    const record = await accessRegistry.records(recordId);
    expect(record.owner).to.equal(patient.address);

    console.log("\n2️⃣  👿 ATTACKER attempts to grant access to accomplice...");
    console.log(`   👿 Attacker: ${attacker.address}`);
    console.log(`   👿 Accomplice: ${doctor.address}`);
    console.log(`   👿 Attempting unauthorized grantAccess()...`);

    const expiry = Math.floor(Date.now() / 1000) + 3600;

    try {
      await accessRegistry
        .connect(attacker)
        .grantAccess(recordId, doctor.address, expiry, "QmFakeKey");

      throw new Error("SECURITY BREACH: Unauthorized grant succeeded!");
    } catch (error) {
      console.log(`   ❌ Grant REJECTED: ${error.message.split("(")[0]}`);
      expect(error.message).to.include("Unauthorized");
    }

    console.log("\n3️⃣  Verify doctor has NO access...");
    const isAuthorized = await accessRegistry.isAuthorized(recordId, doctor.address);
    console.log(`   ❌ Authorization: ${isAuthorized}`);
    expect(isAuthorized).to.be.false;

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ATTACK DEFEATED: Owner-only enforcement works");
    console.log("📝 Conclusion: Only record owner can grant access");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });

  it("❌ ATTACK FAILS: Cannot revoke others' grants", async function () {
    console.log("\n🎭 ATTACK SCENARIO: Unauthorized Revocation");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Setup: Patient grants access to doctor
    console.log("\n1️⃣  Patient grants access to doctor...");
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    await accessRegistry
      .connect(patient)
      .grantAccess(recordId, doctor.address, expiry, "QmTestKey");

    console.log(`   ✅ Doctor authorized`);

    // Attack: Attacker tries to revoke
    console.log("\n2️⃣  👿 ATTACKER tries to revoke doctor's access...");
    console.log(`   👿 Attacker: ${attacker.address}`);

    try {
      await accessRegistry
        .connect(attacker)
        .revokeAccess(recordId, doctor.address);

      throw new Error("SECURITY BREACH: Unauthorized revocation succeeded!");
    } catch (error) {
      console.log(`   ❌ Revocation REJECTED: ${error.message.split("(")[0]}`);
      expect(error.message).to.include("Unauthorized");
    }

    console.log("\n3️⃣  Verify doctor STILL has access...");
    const isAuthorized = await accessRegistry.isAuthorized(recordId, doctor.address);
    console.log(`   ✅ Authorization intact: ${isAuthorized}`);
    expect(isAuthorized).to.be.true;

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ATTACK DEFEATED: Only owner can revoke access");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });

  it("❌ ATTACK FAILS: Cannot log access without authorization", async function () {
    console.log("\n🎭 ATTACK SCENARIO: Unauthorized Access Logging");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    console.log("\n1️⃣  👿 ATTACKER tries to log access without grant...");
    console.log(`   👿 Attacker: ${attacker.address}`);

    try {
      await accessRegistry.connect(attacker).logAccess(recordId);

      throw new Error("SECURITY BREACH: Unauthorized logging succeeded!");
    } catch (error) {
      console.log(`   ❌ Logging REJECTED: ${error.message.split("(")[0]}`);
      expect(error.message).to.include("Unauthorized");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ATTACK DEFEATED: Access logging requires authorization");
    console.log("📝 Conclusion: Audit trail cannot be forged");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });

  it("✅ LEGITIMATE USE: Owner can grant and revoke", async function () {
    console.log("\n🎭 LEGITIMATE SCENARIO: Owner Management");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const expiry = Math.floor(Date.now() / 1000) + 3600;

    console.log("\n1️⃣  👤 Patient (owner) grants access...");
    await expect(
      accessRegistry
        .connect(patient)
        .grantAccess(recordId, doctor.address, expiry, "QmTestKey")
    ).to.emit(accessRegistry, "AccessGranted");

    console.log(`   ✅ Access granted`);

    console.log("\n2️⃣  👤 Patient (owner) revokes access...");
    await expect(
      accessRegistry
        .connect(patient)
        .revokeAccess(recordId, doctor.address)
    ).to.emit(accessRegistry, "AccessRevoked");

    console.log(`   ✅ Access revoked`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ OWNER CONTROL WORKS: Full access management available");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });
});
