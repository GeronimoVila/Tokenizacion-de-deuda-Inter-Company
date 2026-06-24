import { ethers } from 'ethers';
import 'dotenv/config';

const rpcUrl = process.env.BFA_TESTNET_RPC;
const privateKey = process.env.PRIVATE_KEY;

if (!rpcUrl || !privateKey) {
  console.error("🚨 ERROR: Faltan variables BFA_TESTNET_RPC o PRIVATE_KEY en el .env");
  process.exit(1);
}

// 1. Conexión a la red (El tubo)
export const bfaProvider = new ethers.JsonRpcProvider(rpcUrl);

// 2. Tu Billetera Maestra (Las llaves para firmar)
export const adminWallet = new ethers.Wallet(privateKey, bfaProvider);

export const probarConexionBFA = async () => {
  try {
    console.log("⏳ [Web3] Conectando al nodo y leyendo billetera...");
    
    const bloqueActual = await bfaProvider.getBlockNumber();
    
    // Consultamos cuánta plata tiene nuestra billetera
    const saldoWei = await bfaProvider.getBalance(adminWallet.address);
    // Convertimos los ceros gigantes de la blockchain a un formato legible (ETH)
    const saldoEth = ethers.formatEther(saldoWei);
    
    console.log(`✅ [Web3] ¡Conexión exitosa a la Testnet (Bloque: ${bloqueActual})!`);
    console.log(`👛 [Web3] Billetera Admin: ${adminWallet.address}`);
    console.log(`💰 [Web3] Saldo disponible para Gas: ${saldoEth} ETH`);
    
    if (parseFloat(saldoEth) === 0) {
      console.warn("⚠️ ALERTA: Tu saldo es 0. Necesitás pedir fondos en un Faucet de Sepolia.");
    }
    
    return true;
  } catch (error) {
    console.error(`❌ [Web3] Error de conexión:`, error);
    return false;
  }
};