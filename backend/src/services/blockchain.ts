import { ethers } from 'ethers';
import 'dotenv/config';

const rpcUrl = process.env.BFA_TESTNET_RPC || process.env.WEB3_RPC_URL;
const privateKey = process.env.PRIVATE_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;

if (!rpcUrl || !privateKey || !contractAddress) {
  console.error("🚨 ERROR: Faltan variables WEB3_RPC_URL, PRIVATE_KEY o CONTRACT_ADDRESS en el .env");
  process.exit(1);
}

export const bfaProvider = new ethers.JsonRpcProvider(rpcUrl);

export const adminWallet = new ethers.Wallet(privateKey, bfaProvider);

// AÑADIDO: Incluimos balanceOf en el ABI para validaciones de lectura (Pre-flight checks)
const ABI = [
  "function emitirDeuda(address cuentaDestino, uint256 cantidad, string empresaOrigenNombre, string usuarioOperadorId, string comprobanteId) public",
  "function compensarDeuda(address cuentaOrigen, uint256 cantidad, string administradorId, string idCompensacionMensual) public",
  "function decimals() public view returns (uint8)",
  "function balanceOf(address account) public view returns (uint256)"
];

export const holdingContract = new ethers.Contract(contractAddress, ABI, adminWallet);

export const probarConexionBFA = async () => {
  try {
    console.log("⏳ [Web3] Conectando a la Blockchain...");
    const bloqueActual = await bfaProvider.getBlockNumber();
    const saldoWei = await bfaProvider.getBalance(adminWallet.address);
    
    console.log(`✅ [Web3] Conectado (Bloque: ${bloqueActual})`);
    console.log(`💰 [Web3] Saldo disponible Gas: ${ethers.formatEther(saldoWei)} ETH`);
    console.log(`📜 [Web3] Contrato enlazado en: ${contractAddress}`);
    return true;
  } catch (error) {
    console.error(`❌ [Web3] Error de conexión:`, error);
    return false;
  }
};

/**
 * Función robusta para destruir los activos digitales en la BFA.
 * Valida la precisión decimal y el saldo On-Chain real antes de gastar Gas.
 */
export const ejecutarQuemaSegura = async (
  cuentaAcreedor: string, 
  monto: number | string, 
  adminId: string, 
  idCompensacion: string
): Promise<ethers.ContractTransactionReceipt> => {
  try {
    // 1. Verificación básica de la Wallet
    if (!ethers.isAddress(cuentaAcreedor)) {
        throw new Error(`La wallet destino proporcionada (${cuentaAcreedor}) no es una dirección EVM válida.`);
    }

    // 2. Manejo estricto de decimales
    const montoFormateado = monto.toString();
    const montoBlockchain = ethers.parseUnits(montoFormateado, 2);

    // 3. PRE-FLIGHT CHECK: Leer el saldo real en la blockchain
    const saldoOnChain: bigint = await holdingContract.balanceOf(cuentaAcreedor);
    
    // 4. Abortar controladamente si el saldo es insuficiente
    if (saldoOnChain < montoBlockchain) {
      const saldoDecimal = ethers.formatUnits(saldoOnChain, 2);
      throw new Error(
        `Desincronización On-Chain detectada: Se intentó quemar ${montoFormateado} DEUDA de la wallet ${cuentaAcreedor}, pero su saldo real en la blockchain es de ${saldoDecimal}. La transacción fue abortada preventivamente para proteger la BD relacional y evitar el cobro de Gas fallido.`
      );
    }

    console.log(`🚀 [Web3] Pre-Flight OK. Saldo verificado. Quemando ${montoFormateado} tokens en ${cuentaAcreedor}...`);

    // 5. Ejecutar la operación real
    const tx = await holdingContract.compensarDeuda(
      cuentaAcreedor, 
      montoBlockchain, 
      adminId, 
      idCompensacion
    );
    
    const receipt = await tx.wait();
    return receipt;

  } catch (error: any) {
    console.error("🚨 [Web3] Transacción abortada en el Pre-Flight:", error.message || error);
    // Propagamos el error para que el controlador capture y detenga Prisma
    throw new Error(error.message || "Fallo en la comunicación descentralizada (Web3)."); 
  }
};