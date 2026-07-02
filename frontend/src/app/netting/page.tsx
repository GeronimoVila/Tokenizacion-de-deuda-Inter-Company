export default function NettingPage() {
  return (
    <div className="flex h-screen bg-gray-50 items-center justify-center">
      <div className="bg-white p-10 rounded-xl shadow-lg max-w-2xl text-center border-t-4 border-blue-600">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Módulo de Compensación (Netting)
        </h1>
        <p className="text-gray-600 mb-6">
          ¡Bienvenido, Admin de Holding! Has pasado exitosamente la barrera de seguridad del middleware.
        </p>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-left">
          <p className="text-sm text-yellow-700">
            <strong>Próximamente:</strong> Aquí construiremos el motor matemático para calcular y liquidar la deuda Inter-Company en la Blockchain.
          </p>
        </div>
      </div>
    </div>
  );
}