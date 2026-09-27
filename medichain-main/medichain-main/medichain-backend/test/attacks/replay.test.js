/**
 * Attack Demo #3: Signature Replay Attack
 * 
 * Scenario: Attacker intercepts and replays EIP-712 grant signature
 * Expected Result: Contract rejects due to nonce increment
 * 
 * Run: npm run attack:replay
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Attack Demo: Signature Replay", function () {
  let accessRegistry;
  let patient, doctor;
  let recordId;
  let domain, types;

  beforeEach(async function () {
    [patient, doctor] = await ethers.getSigners();

    const AccessRegistry = await ethers.getContractFactory("AccessRegistry");
    accessRegistry = await AccessRegistry.deploy();
    await accessRegistry.waitForDeployment();

    recordId = ethers.keccak256(ethers.toUtf8Bytes("medical-record-001"));
    await accessRegistry.connect(patient).registerRecord(recordId);

    // EIP-712 domain
    domain = {
      name: "MediChain Shield",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await accessRegistry.getAddress(),
    };

    types = {
      GrantPermit: [
        { name: "recordId", type: "bytes32" },
        { name: "grantee", type: "address" },
        { name: "expiry", type: "uint256" },
        { name: "wrappedKeyCid", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
  });

  it("❌ ATTACK FAILS: Cannot replay used signature", async function () {
    console.log("\n🎭 ATTACK SCENARIO: Signature Replay");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 1. Patient signs grant
    console.log("\n1️⃣  Patient signs EIP-712 grant message...");
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24h — must outlast EVM block timestamp
    const nonce = await accessRegistry.nonces(patient.address);

    const value = {
      recordId,
      grantee: doctor.address,
      expiry,
      wrappedKeyCid: "QmTestKey",
      nonce,
      deadline,
    };

    const signature = await patient.signTypedData(domain, types, value);
    const sig = ethers.Signature.from(signature);

    console.log(`   ✅ Signature created`);
    console.log(`   🔢 Nonce: ${nonce}`);

    // 2. Attacker intercepts signature
    console.log("\n2️⃣  👿 ATTACKER intercepts signature from network...");
    console.log(`   👿 Stolen signature: ${signature.substring(0, 20)}...`);
    console.log(`   👿 Stolen nonce: ${nonce}`);

    // 3. Legitimate use of signature
    console.log("\n3️⃣  Legitimate relayer submits transaction...");
    await accessRegistry.grantAccessWithSig(
      recordId,
      doctor.address,
      expiry,
      "QmTestKey",
      deadline,
      sig.v,
      sig.r,
      sig.s
    );
    console.log(`   ✅ Grant successful (nonce consumed)`);

    const newNonce = await accessRegistry.nonces(patient.address);
    console.log(`   🔢 New nonce: ${newNonce}`);
    expect(newNonce).to.equal(nonce + 1n);

    // 4. Attacker tries to replay
    console.log("\n4️⃣  👿 ATTACKER attempts replay attack...");
    console.log(`   👿 Reusing same signature with old nonce ${nonce}...`);

    // Need to revoke first to allow re-grant
    await accessRegistry.connect(patient).revokeAccess(recordId, doctor.address);

    try {
      await accessRegistry.grantAccessWithSig(
        recordId,
        doctor.address,
        expiry,
        "QmTestKey",
        deadline,
        sig.v,
        sig.r,
        sig.s
      );
      throw new Error("SECURITY BREACH: Replay succeeded!");
    } catch (error) {
      console.log(`   ❌ Replay REJECTED: ${error.message.split("(")[0]}`);
      expect(error.message).to.include("InvalidSignature");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ATTACK DEFEATED: Nonce increment prevents replay");
    console.log("📝 Conclusion: EIP-712 signatures are one-time use");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });

  it("❌ ATTACK FAILS: Cannot use expired signature", async function () {
    console.log("\n🎭 ATTACK SCENARIO: Expired Signature");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    console.log("\n1️⃣  Patient signs with past deadline...");
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const pastDeadline = Math.floor(Date.now() / 1000) - 1; // Already expired
    const nonce = await accessRegistry.nonces(patient.address);

    const value = {
      recordId,
      grantee: doctor.address,
      expiry,
      wrappedKeyCid: "QmTestKey",
      nonce,
      deadline: pastDeadline,
    };

    const signature = await patient.signTypedData(domain, types, value);
    const sig = ethers.Signature.from(signature);

    console.log(`   ✅ Signature created with expired deadline`);

    console.log("\n2️⃣  👿 ATTACKER tries to submit expired signature...");
    
    try {
      await accessRegistry.grantAccessWithSig(
        recordId,
        doctor.address,
        expiry,
        "QmTestKey",
        pastDeadline,
        sig.v,
        sig.r,
        sig.s
      );
      throw new Error("SECURITY BREACH: Expired signature accepted!");
    } catch (error) {
      console.log(`   ❌ Submission REJECTED: ${error.message.split("(")[0]}`);
      expect(error.message).to.include("SignatureExpired");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ATTACK DEFEATED: Deadline check prevents stale signatures");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });

  it("✅ LEGITIMATE USE: Valid signature with correct nonce works", async function () {
    console.log("\n🎭 LEGITIMATE SCENARIO: Proper Signature Use");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24h — must outlast EVM block timestamp
    const nonce = await accessRegistry.nonces(patient.address);

    console.log(`\n1️⃣  Current nonce: ${nonce}`);

    const value = {
      recordId,
      grantee: doctor.address,
      expiry,
      wrappedKeyCid: "QmTestKey",
      nonce,
      deadline,
    };

    const signature = await patient.signTypedData(domain, types, value);
    const sig = ethers.Signature.from(signature);

    console.log(`   ✅ Valid signature created`);

    console.log("\n2️⃣  Submitting with correct nonce...");
    await expect(
      accessRegistry.grantAccessWithSig(
        recordId,
        doctor.address,
        expiry,
        "QmTestKey",
        deadline,
        sig.v,
        sig.r,
        sig.s
      )
    ).to.emit(accessRegistry, "AccessGranted");

    console.log(`   ✅ Grant successful`);

    const newNonce = await accessRegistry.nonces(patient.address);
    console.log(`   🔢 Nonce incremented: ${nonce} → ${newNonce}`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ VALID SIGNATURE WORKS: Proper nonce allows grant");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });
});
