import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Hardhat Ignition usa un formato "Declarativo". 
// Solo le decimos QUÉ contrato queremos, y él se encarga del CÓMO.
const HoldingDeudaModule = buildModule("HoldingDeudaModule", (m) => {
  
  // "HoldingDeuda" es el nombre exacto de nuestro contrato en Solidity
  const holdingDeuda = m.contract("HoldingDeuda");

  return { holdingDeuda };
});

export default HoldingDeudaModule;