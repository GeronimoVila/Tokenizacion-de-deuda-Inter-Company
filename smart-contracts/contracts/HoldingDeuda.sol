// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract HoldingDeuda is ERC20, Ownable {
    
    // ==========================================
    // TAREA 1.5: REGISTROS DE AUDITORÍA (EVENTS)
    // ==========================================
    // Estos eventos son el "Recibo Inmutable" que verán los auditores.
    // La palabra "indexed" permite que luego el frontend pueda filtrar las búsquedas rápido.

    event NuevaDeudaRegistrada(
        address indexed empresaDestinoWallet,
        uint256 cantidad,
        string empresaOrigenNombre, // Ej: "Subsidiaria Logística S.A."
        string usuarioOperadorId,   // Ej: "google-oauth2|104958..."
        string comprobanteId        // Ej: "REMITO-2024-001"
    );

    event DeudaCompensada(
        address indexed empresaOrigenWallet,
        uint256 cantidad,
        string administradorId,     // El ID de Google del Gerente que ejecutó el Netting
        string idCompensacionMensual // Un código único de la operación de cierre
    );

    constructor() ERC20("Deuda Intercompany ARS", "DEUDA") Ownable(msg.sender) {}

    function decimals() public view virtual override returns (uint8) {
        return 2; 
    }

    // ==========================================
    // TAREA 1.4: FUNCIONES FINANCIERAS MEJORADAS
    // ==========================================

    /**
     * @dev Ahora el backend está OBLIGADO a mandar el contexto de quién autorizó esto.
     */
    function emitirDeuda(
        address cuentaDestino, 
        uint256 cantidad,
        string memory empresaOrigenNombre,
        string memory usuarioOperadorId,
        string memory comprobanteId
    ) public onlyOwner {
        
        // 1. Efectuamos la creación del dinero
        _mint(cuentaDestino, cantidad);

        // 2. Disparamos el destello en la blockchain (El tatuaje inmutable)
        emit NuevaDeudaRegistrada(
            cuentaDestino, 
            cantidad, 
            empresaOrigenNombre, 
            usuarioOperadorId, 
            comprobanteId
        );
    }

    /**
     * @dev El backend debe justificar quién y por qué se queman los tokens.
     */
    function compensarDeuda(
        address cuentaOrigen, 
        uint256 cantidad,
        string memory administradorId,
        string memory idCompensacionMensual
    ) public onlyOwner {
        
        // 1. Efectuamos la destrucción del dinero compensado
        _burn(cuentaOrigen, cantidad);

        // 2. Dejamos el registro inmutable
        emit DeudaCompensada(
            cuentaOrigen, 
            cantidad, 
            administradorId, 
            idCompensacionMensual
        );
    }
}