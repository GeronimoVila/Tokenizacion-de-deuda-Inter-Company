import hre from "hardhat";

// Truco para Hardhat v3 + TypeScript: 
// Extraemos 'ethers' dinámicamente y forzamos el tipo 'any' para que TS no moleste.
const ethers = (hre as any).ethers;

async function main() {
  console.log("🚀 Iniciando el despliegue del Smart Contract...");

  // 1. Obtenemos la cuenta que va a pagar el Gas y ser el "Owner" (La de tu .env)
  const [deployer] = await ethers.getSigners();
  console.log(`👛 Billetera Administradora (Backend): ${deployer.address}`);

  // Consultamos el saldo para asegurarnos de que tenemos la nafta necesaria
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Saldo disponible para Gas: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error("🚨 ERROR: No tenés saldo en la billetera. Recargá en el Faucet.");
    return;
  }

  // 2. Leemos el archivo compilado de tu contrato
  console.log("⏳ Preparando el contrato 'HoldingDeuda'...");
  const HoldingDeudaFactory = await ethers.getContractFactory("HoldingDeuda");

  // 3. Enviamos la transacción de creación a la blockchain
  console.log("✈️  Enviando a la red (esto puede tardar unos segundos o minutos)...");
  const contrato = await HoldingDeudaFactory.deploy();

  // 4. Esperamos a que los mineros validen la transacción y creen el bloque
  await contrato.waitForDeployment();

  // 5. Extraemos la dirección pública (El "CBU" de tu contrato)
  const direccionContrato = await contrato.getAddress();

  console.log("=====================================================");
  console.log(`✅ ¡ÉXITO! Contrato desplegado correctamente`);
  console.log("=====================================================");
  console.log(`📍 DIRECCIÓN DEL CONTRATO:`);
  console.log(`   ${direccionContrato}`);
  console.log("=====================================================");
  console.log("⚠️ GUARDÁ ESTA DIRECCIÓN. Tu Backend de Node.js la va a necesitar en el Sprint 2.");
}

// Ejecutamos la función maestra y atajamos cualquier error
main().catch((error) => {
  console.error("❌ Error crítico durante el despliegue:", error);
  process.exitCode = 1;
});