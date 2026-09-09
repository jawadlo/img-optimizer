import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { EncodeRequest, OutputFormat } from '../main/encode'

export type WorkingFile = {
  path: string
  bytes: Uint8Array
  mimeType: string
  info: {
    width: number
    height: number
    hasAlpha: boolean
    format: string
  }
}

export type EncodeResult = {
  bytes: Uint8Array
  byteLength: number
  width: number
  height: number
}

const api = {
  openWorkingImage: (): Promise<WorkingFile | null> => ipcRenderer.invoke('working:open'),
  openWorkingImageFromFile: async (file: File): Promise<WorkingFile> => {
    const filePath = webUtils.getPathForFile(file)
    if (filePath) {
      return ipcRenderer.invoke('working:fromPath', filePath)
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    return ipcRenderer.invoke('working:fromBytes', { name: file.name, bytes })
  },
  encode: (request: EncodeRequest): Promise<EncodeResult> =>
    ipcRenderer.invoke('encode:run', request),
  saveEncoded: (
    defaultName: string,
    bytes: Uint8Array,
    format: OutputFormat
  ): Promise<'saved' | 'cancelled'> =>
    ipcRenderer.invoke('export:save', { defaultName, bytes, format })
}

export type AppApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore renderer types live in index.d.ts
  window.api = api
}
