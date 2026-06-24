import { ethers } from 'ethers';

async function generarCredencialesBFA() {
    console.log("⏳ Generando billetera criptográfica...\n");

    const wallet = ethers.Wallet.createRandom();

    const address = wallet.address;
    const privateKey = wallet.privateKey;

    const mensajeAFirmar = address; 
    const signature = await wallet.signMessage(mensajeAFirmar);

    console.log("=====================================================");
    console.log(" 📝 DATOS PARA PEGAR EN EL FORMULARIO DE LA BFA:");
    console.log("=====================================================");
    console.log(`📍 DIRECCIÓN (ADDRESS):`);
    console.log(address);
    console.log(`\n✍️  FIRMA (SIGNATURE):`);
    console.log(signature);
    console.log("=====================================================");
    console.log(" 🛑 DATO SÚPER SECRETO (GUARDAR EN TU .env):");
    console.log("=====================================================");
    console.log(`🔑 CLAVE PRIVADA:`);
    console.log(privateKey);
    console.log("=====================================================");
}

generarCredencialesBFA();