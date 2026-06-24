import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  // @ton/core는 내부적으로 Buffer.alloc(0) 등을 모듈 로드 시점(top-level)에 바로 실행한다.
  // Vite는 webpack과 달리 Node 전역(Buffer, process 등)을 자동으로 폴리필하지 않기 때문에,
  // 브라우저에서 "Buffer is not defined" ReferenceError가 즉시 발생하며 앱 전체가 렌더링되지 않는다.
  // (App.jsx가 MissionDetail -> tonPayload.js -> @ton/core를 정적 import하므로 첫 진입부터 크래시)
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer'],
      globals: { Buffer: true }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
