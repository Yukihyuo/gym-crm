import { useEffect } from 'react'
import { useSocketStore } from '@/store/socketStore'

const TERMINAL_ID = '6a078c6ba3841ec7932b0fbf' // ID de la terminal a la que te quieres conectar

export default function Page() {
  const isConnected = useSocketStore((state) => state.isConnected)
  const socket = useSocketStore((state) => state.socket)
  const emitEvent = useSocketStore((state) => state.emitEvent)
  const onEventWithData = useSocketStore((state) => state.onEventWithData)
  const joinTerminal = useSocketStore((state) => state.joinTerminal)
  const leaveTerminal = useSocketStore((state) => state.leaveTerminal)

  // 1. Primero: Unirse a la sala de la terminal
  useEffect(() => {
    if (!isConnected || !TERMINAL_ID) {
      return
    }

    // Te unes a la sala de la terminal
    joinTerminal(TERMINAL_ID)
    console.log(`✅ Unido a terminal: ${TERMINAL_ID}`)

    return () => {
      leaveTerminal(TERMINAL_ID)
      console.log(`❌ Salido de terminal: ${TERMINAL_ID}`)
    }
  }, [isConnected, joinTerminal, leaveTerminal])

  // 2. Segundo: Escuchar eventos específicos de esa terminal
  useEffect(() => {
    if (!isConnected || !socket) {
      return
    }

    // Escuchar el evento emitido por backend tras finger_print_match
    const offFingerprint = onEventWithData(
      'finger_print_matched',
      (payload) => {
        console.log('📨 Recibido finger_print_matched:', payload)

        // Manejo dinámico sin interfaz fija.
        const normalized = typeof payload === 'object' && payload !== null
          ? payload
          : { raw: payload }

        console.log('📦 Payload normalizado:', normalized)
      }
    )

    // Escuchar el evento 'verify_client' sin payload
    // const offVerify = onEvent('verify_client', () => {
    //   console.log('📨 Recibido verify_client')
    // })

    return () => {
      offFingerprint()
      // offVerify()
    }
  }, [isConnected, onEventWithData, socket])

  const emitNoData = () => {
    emitEvent('cancel_registration')
    console.log('✉️ Emitido cancel_registration')
  }

  const emitWithData = () => {
    emitEvent('finger_print_match', '69a8f99d6f292fecdd61082f')
    console.log('✉️ Emitido finger_print_match')
  }

  return (
    <div className='p-4 space-y-4 bg-red-500 min-h-screen'>
      <h1 className='text-xl font-semibold text-white'>Pruebas Socket - Terminal {TERMINAL_ID}</h1>

      <p className='text-white text-sm'>
        Estado: {isConnected ? '✅ Conectado' : '❌ Desconectado'}
      </p>

      <div className='flex gap-2'>
        <button
          type='button'
          onClick={emitNoData}
          className='px-4 py-2 rounded bg-white text-black hover:bg-gray-200'
        >
          Emitir: cancel_registration
        </button>

        <button
          type='button'
          onClick={emitWithData}
          className='px-4 py-2 rounded bg-black text-white border border-white hover:bg-gray-900'
        >
          Emitir: finger_print_match
        </button>
      </div>

      <div className='p-3 bg-black text-white rounded text-sm'>
        <p>📋 Flujo correcto:</p>
        <ol className='list-decimal ml-4 mt-2 space-y-1'>
          <li>✅ Se une a la terminal automáticamente</li>
          <li>✅ Escucha eventos: finger_print_matched</li>
          <li>✅ Emite eventos a la terminal</li>
          <li>Revisa la consola para ver los logs</li>
        </ol>
      </div>
    </div>
  )
}
