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

const ABI = [
  "function emitirDeuda(address cuentaDestino, uint256 cantidad, string empresaOrigenNombre, string usuarioOperadorId, string comprobanteId) public",
  "function decimals() public view returns (uint8)"
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