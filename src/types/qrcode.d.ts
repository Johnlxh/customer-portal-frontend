declare module "qrcode" {
  export interface QRCodeToDataURLOptions {
    margin?: number
    width?: number
    color?: {
      dark?: string
      light?: string
    }
  }

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>
}
